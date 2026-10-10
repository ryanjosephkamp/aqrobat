import { chromium } from "playwright";
import { readFile, writeFile, mkdir, readdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import { format } from "prettier";
import assert from "node:assert/strict";
import jsQR from "jsqr";
import { readBarcodes } from "zxing-wasm/reader";
import { DECODER_PROVENANCE } from "../decoders.mjs";
import { documentHtml, escapeHtml } from "../layout.mjs";
import { auditSymbol } from "./symbol-audit.mjs";
const root = "docs/research/prose-qr/phase-15/",
  source = "experiments/prose-qr/finder-page/",
  configPath = process.argv[2],
  config = JSON.parse(await readFile(configPath)),
  out = root + config.batch + "/",
  sha = (b) => createHash("sha256").update(b).digest("hex");
async function bytes(p) {
  let n = 0;
  for (const e of await readdir(p, { withFileTypes: true })) {
    const q = p + "/" + e.name;
    n += e.isDirectory() ? await bytes(q) : (await stat(q)).size;
  }
  return n;
}
async function save(p, b) {
  assert(
    (await bytes(root)) + (await bytes(source)) + Buffer.byteLength(b) <
      8000000,
    "Capture reserve reached",
  );
  await writeFile(out + p, b, { flag: "wx" });
  return sha(b);
}
const json = async (p, v) =>
  save(p, await format(JSON.stringify(v), { parser: "json" }));
await mkdir(out);
const spec = config.specs[0],
  field = spec.matrix.length * spec.unit,
  pad = 5 * spec.unit,
  side = (spec.matrix.length + 10) * spec.unit;
assert.equal(config.specs.length, 1);
await json("manifest.json", {
  at: new Date().toISOString(),
  plannedNative: 1,
  plannedRepeat: 1,
  plannedControls: 1,
  baseline: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  sources: Object.fromEntries(
    await Promise.all(
      [
        source + "capture.mjs",
        source + "proposal.mjs",
        source + "symbol-audit.mjs",
        configPath,
        root + "PLAN.md",

        "src/core.mjs",
        "vendor/qrcodegen.mjs",
        "experiments/prose-qr/decoders.mjs",
      ].map(async (p) => [p, sha(await readFile(p))]),
    ),
  ),
  decoder: DECODER_PROVENANCE,
  cap: 10000000,
});
const markup = `<article id="artifact" style="position:relative;width:${side}px;height:${side}px;background:white;overflow:visible"><pre id="text" style="position:absolute;left:${pad}px;top:${pad}px;width:${field}px;padding:0;margin:0;font:400 ${spec.size}px/${spec.leading}px Monaco,monospace;white-space:pre-wrap;text-align:justify;text-align-last:justify;letter-spacing:0;font-kerning:none;font-variant-ligatures:none;color:black">${escapeHtml(spec.lines.join("\n"))}</pre></article>`,
  html = await format(documentHtml(markup), { parser: "html" });
await save("native.html.gz", gzipSync(html));
await save("native.txt", spec.lines.join("\n"));
await json("layout.json", { spec, field, pad, side });
let browser;
try {
  browser = await chromium.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  const page = await browser.newPage({
    viewport: { width: 1800, height: 1600 },
    deviceScaleFactor: 1,
  });
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  assert.equal(
    await page.locator("#text").textContent(),
    spec.lines.join("\n"),
  );
  assert.equal(await page.locator("#text *").count(), 0);
  const native = await page.locator("#text").evaluate((e) => {
    const cs = getComputedStyle(e),
      g = document.createElement("canvas").getContext("2d");
    g.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    g.fontKerning = "none";
    const glyphs = Object.fromEntries(
      [...new Set(e.textContent.replaceAll("\n", ""))].map((c) => {
        const m = g.measureText(c);
        return [
          c,
          {
            advance: m.width,
            left: m.actualBoundingBoxLeft,
            right: m.actualBoundingBoxRight,
            ascent: m.actualBoundingBoxAscent,
            descent: m.actualBoundingBoxDescent,
          },
        ];
      }),
    );
    const lines = e.textContent.split("\n"),
      advances = lines.map((l) =>
        [...l].reduce((n, c) => n + glyphs[c].advance, 0),
      );
    let minGap = Infinity;
    for (const l of lines) {
      let x = 0,
        right = null;
      for (const c of l) {
        const a = glyphs[c];
        if (c !== " ") {
          if (right !== null) minGap = Math.min(minGap, x - a.left - right);
          right = x + a.right;
        }
        x += a.advance;
      }
    }
    const envelope =
      Math.max(...Object.values(glyphs).map((g) => g.ascent)) +
      Math.max(...Object.values(glyphs).map((g) => g.descent));
    const rect = e.getBoundingClientRect();
    return {
      glyphs,
      advances,
      envelope,
      clearance: parseFloat(cs.lineHeight) - envelope,
      minGap,
      width: rect.width,
      height: rect.height,
      scrollWidth: e.scrollWidth,
      lineCount: lines.length,
      style: {
        font: cs.fontFamily,
        size: cs.fontSize,
        leading: cs.lineHeight,
        weight: cs.fontWeight,
        tracking: cs.letterSpacing,
        align: cs.textAlign,
      },
    };
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  const doc = await cdp.send("DOM.getDocument"),
    node = await cdp.send("DOM.querySelector", {
      nodeId: doc.root.nodeId,
      selector: "#text",
    });
  native.platformFonts = (
    await cdp.send("CSS.getPlatformFontsForNode", { nodeId: node.nodeId })
  ).fonts;
  await cdp.detach();
  const reasons = [];
  if (native.clearance < 2) reasons.push("Native row ink clearance below 2 px");
  if (native.minGap < 0) reasons.push("Adjacent letter ink bounds overlap");
  if (
    native.advances.some((x) => x > field) ||
    native.scrollWidth > field + 1 ||
    native.height !== native.lineCount * spec.leading
  )
    reasons.push("Native wrap or overflow");
  if (native.platformFonts.some((f) => f.familyName !== "Monaco"))
    reasons.push("Font substitution");
  await json("native-metrics.json", {
    ...native,
    reasons,
    automaticRejected: reasons.length > 0,
    owner: "untested",
    agent: "pending full-source observation",
  });
  const png = await page.locator("#artifact").screenshot();
  const pngSha256 = await save("native.png", png);
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  const repeat = await page.locator("#artifact").screenshot();
  if (sha(repeat) !== pngSha256) await save("repeat.png", repeat);
  await json("capture.json", {
    pngSha256,
    repeatSha256: sha(repeat),
    repeatExact: sha(repeat) === pngSha256,
    width: side,
    height: side,
    reasons,
    phoneCandidate: false,
  });
  await browser.close();
  browser = null;
  const controlBase = "docs/research/prose-qr/phase-12/run-01/",
    control = JSON.parse(await readFile(controlBase + "controls.json")).full;
  for (const [id, path, expectedHash] of [
    ["control", controlBase + control.path, control.pngSha256],
    ["native", out + "native.png", pngSha256],
  ]) {
    const b = await readFile(path);
    assert.equal(sha(b), expectedHash);
    const data = execFileSync(
        "python3",
        [
          "-c",
          "import cv2,sys; i=cv2.imread(sys.argv[1]); sys.stdout.buffer.write(cv2.cvtColor(i,cv2.COLOR_BGR2RGBA).tobytes())",
          path,
        ],
        { maxBuffer: 260000000 },
      ),
      width = id === "native" ? side : control.width,
      height = width;
    await json(id + "-pixels.json", {
      path,
      pngSha256: sha(b),
      rgbaSha256: sha(data),
      width,
      height,
    });
    const p = { data: new Uint8ClampedArray(data), width, height };
    for (const [name, options] of [
      ["zxing-default", { formats: ["QRCode"] }],
      ["zxing-baseline", DECODER_PROVENANCE.readerOptions],
      ["zxing-errors-diagnostic", { formats: ["QRCode"], returnErrors: true }],
    ]) {
      const start = Date.now(),
        found = await readBarcodes(p, options),
        records = [];
      for (let i = 0; i < found.length; i++) {
        const r = found[i],
          symbol = r.symbol,
          rec = {
            isValid: r.isValid,
            error: r.error,
            text: r.text,
            bytes: Array.from(r.bytes ?? []),
            position: r.position,
            width: symbol?.width,
            height: symbol?.height,
          };
        if (symbol?.data?.length) {
          rec.symbolPath = `${id}-${name}-${i}-symbol.bin`;
          rec.symbolSha256 = await save(
            rec.symbolPath,
            Buffer.from(symbol.data),
          );
        }
        if (id === "native")
          rec.finderAudit = auditSymbol(r, {
            unit: spec.unit,
            quiet: 5,
            modules: 25,
          });
        records.push(rec);
      }
      await json(`${id}-${name}.json`, {
        ms: Date.now() - start,
        options,
        results: records,
        exact: records.some(
          (r) =>
            r.isValid &&
            r.text === (id === "control" ? "https://example.com/" : null),
        ),
        classification: name.includes("diagnostic")
          ? "Error-reporting diagnostic, never acceptance"
          : "Ordinary payload profile",
      });
      console.log(
        JSON.stringify({
          id,
          name,
          found: records.length,
          exact: records.some(
            (r) =>
              r.isValid &&
              r.text === (id === "control" ? "https://example.com/" : null),
          ),
        }),
      );
    }
    const start = Date.now(),
      r = jsQR(p.data, width, height, { inversionAttempts: "attemptBoth" });
    await json(`${id}-jsqr.json`, {
      ms: Date.now() - start,
      options: { inversionAttempts: "attemptBoth" },
      found: !!r,
      text: r?.data ?? null,
      exact: r?.data === (id === "control" ? "https://example.com/" : null),
      location: r?.location ?? null,
    });
    console.log(
      JSON.stringify({
        id,
        name: "jsQR",
        found: !!r,
        exact: r?.data === (id === "control" ? "https://example.com/" : null),
      }),
    );
  }
} catch (e) {
  await json("aborted.json", { at: new Date().toISOString(), error: e.stack });
  throw e;
} finally {
  if (browser) await browser.close();
}

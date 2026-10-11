import { chromium } from "playwright";
import {
  readFile,
  writeFile,
  mkdir,
  appendFile,
  readdir,
  stat,
} from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { compose, textFor } from "./layout.mjs";
import { positiveControl } from "../layout.mjs";
import { documentHtml } from "../flow/layout.mjs";

const cutoff = Date.parse("2026-10-11T19:25:49Z");
assert(Date.now() < cutoff);
const root = resolve("docs/research/prose-qr/portable-story-2026-10-11");
const configPath = process.argv[2],
  configBytes = await readFile(configPath),
  config = JSON.parse(configBytes);
assert(/^[a-z0-9-]+$/.test(config.id));
const out = resolve(root, config.id);
await mkdir(out);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const save = async (n, v) => {
  const b =
    typeof v === "string" || Buffer.isBuffer(v)
      ? v
      : JSON.stringify(v, null, 2) + "\n";
  await writeFile(resolve(out, n), b, { flag: "wx" });
  return sha(b);
};
async function used(p = root) {
  let n = 0;
  for (const e of await readdir(p, { withFileTypes: true })) {
    const path = resolve(p, e.name);
    n += e.isDirectory() ? await used(path) : (await stat(path)).size;
  }
  return n;
}
const sourcePaths = [
  "experiments/prose-qr/portable-story-2026-10-11/batch.mjs",
  "experiments/prose-qr/portable-story-2026-10-11/layout.mjs",
  "experiments/prose-qr/styled-story-2026-10-11/reader.mjs",
  "experiments/prose-qr/styled-story-2026-10-11/opencv.py",
  "experiments/prose-qr/flow/layout.mjs",
  "experiments/prose-qr/layout.mjs",
  "src/core.mjs",
  "vendor/qrcodegen.mjs",
];
const sources = [];
for (const [i, path] of sourcePaths.entries()) {
  const b = await readFile(path);
  sources.push({
    path,
    sha256: sha(b),
    archive: `source-${i + 1}.txt.gz`,
    archiveSha256: await save(`source-${i + 1}.txt.gz`, gzipSync(b)),
  });
}
const inputs = [
  ...(config.controls ?? []).map((payload, i) => ({
    id: `control-${i + 1}`,
    payload,
    control: true,
  })),
  ...config.specs,
];
await save("manifest.json", {
  at: new Date().toISOString(),
  configPath,
  configSha256: sha(configBytes),
  config,
  sources,
  inputs,
  plannedCandidateSlots: config.specs.length,
  plannedNativeCaptures: inputs.length,
  repeatSlots: inputs.length,
  primaryReaderSlots: inputs.length * 3,
  inputTransforms: "none",
  cutoff: new Date(cutoff).toISOString(),
});
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const rows = [],
  network = [],
  errors = [];
try {
  const context = await browser.newContext({
    viewport: { width: 6000, height: 6000 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.on("request", (r) => {
    if (/^https?:/.test(r.url())) network.push(r.url());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  const cdp = await context.newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  await save("environment.json", {
    browser: browser.version(),
    node: process.version,
    deviceScaleFactor: 1,
    viewport: { width: 6000, height: 6000 },
  });
  for (const spec of inputs) {
    assert(Date.now() < cutoff, "Experiment cutoff");
    assert((await used()) < 225000000, "Evidence reserve reached");
    let layout = null,
      measurement = null;
    if (!spec.control) {
      const chars = [...new Set(textFor(spec) + " ")];
      const weights = [
        ...new Set([spec.darkWeight ?? 400, spec.lightWeight ?? 400]),
      ];
      measurement = await page.evaluate(
        ({ chars, weights, font, size }) => {
          const c = document.createElement("canvas").getContext("2d");
          c.fontKerning = "none";
          const glyphs = {};
          for (const char of chars) {
            const ms = weights.map((w) => {
              c.font = `${w} ${size}px '${font}'`;
              const m = c.measureText(char);
              return {
                advance: m.width,
                ascent: m.actualBoundingBoxAscent,
                descent: m.actualBoundingBoxDescent,
                left: m.actualBoundingBoxLeft,
                right: m.actualBoundingBoxRight,
              };
            });
            glyphs[char] = {
              advance: Math.max(...ms.map((m) => m.advance)),
              ascent: Math.max(...ms.map((m) => m.ascent)),
              descent: Math.max(...ms.map((m) => m.descent)),
              weights: ms,
            };
          }
          return { font, size, weights, glyphs };
        },
        { chars, weights, font: spec.font, size: spec.fontSize },
      );
      await save(`${spec.id}-metrics.json`, measurement);
      layout = compose(spec, measurement);
      await save(`${spec.id}-layout.json`, {
        spec,
        source: layout.source,
        plainText: layout.plainText,
        structural: layout.structural,
        modules: layout.modules,
        matrix: layout.matrix,
      });
      await save(`${spec.id}.txt`, layout.plainText);
    }
    const html = spec.control
      ? documentHtml(positiveControl(spec.payload, 656))
      : layout.html;
    await save(`${spec.id}.html.gz`, gzipSync(html));
    await page.setContent(html);
    await page.evaluate(() => document.fonts.ready);
    let selection = null,
      fonts = null,
      paint = null;
    if (layout) {
      selection = await page.locator("#text-body").evaluate((e) => {
        const s = getSelection(),
          r = document.createRange();
        r.selectNodeContents(e);
        s.removeAllRanges();
        s.addRange(r);
        const t = s.toString();
        s.removeAllRanges();
        return t;
      });
      await save(`${spec.id}-selection.json`, {
        expectedSha256: sha(layout.plainText),
        actualSha256: sha(selection),
        exact: selection === layout.plainText,
        characters: selection.length,
      });
      assert.equal(selection, layout.plainText, "Native selection mismatch");
      const doc = await cdp.send("DOM.getDocument");
      const node = await cdp.send("DOM.querySelector", {
        nodeId: doc.root.nodeId,
        selector: ".word span",
      });
      fonts = (
        await cdp.send("CSS.getPlatformFontsForNode", { nodeId: node.nodeId })
      ).fonts;
      await save(`${spec.id}-font-face.json`, {
        requestedFamily: spec.font,
        expectedPostScriptName: spec.expectedPostScriptName ?? null,
        fonts,
      });
      assert(
        fonts.some(
          (f) =>
            (spec.expectedPostScriptName &&
              f.postScriptName === spec.expectedPostScriptName) ||
            f.familyName === spec.font ||
            f.familyName.replaceAll(" ", "").toLowerCase() ===
              spec.font.replaceAll(" ", "").toLowerCase(),
        ),
        "Requested native font missing",
      );
      paint = await page.locator("#artifact").evaluate((e) => {
        const bad = [];
        for (const n of [e, ...e.querySelectorAll("*")]) {
          const s = getComputedStyle(n);
          if (
            ["IMG", "SVG", "CANVAS"].includes(n.tagName) ||
            s.opacity !== "1" ||
            s.visibility !== "visible" ||
            s.display === "none" ||
            s.filter !== "none" ||
            s.textShadow !== "none" ||
            s.backgroundImage !== "none" ||
            (s.backgroundColor !== "rgba(0, 0, 0, 0)" &&
              s.backgroundColor !== "rgb(255, 255, 255)")
          )
            bad.push(n.tagName);
        }
        return { bad, elements: e.querySelectorAll("*").length };
      });
      assert.deepEqual(paint.bad, []);
    }
    const png = await page.locator("#artifact").screenshot();
    await save(`${spec.id}.png`, png);
    const repeat = await page.locator("#artifact").screenshot();
    await save(`${spec.id}-repeat.png`, repeat);
    const capture = {
      id: spec.id,
      spec,
      pngSha256: sha(png),
      repeatSha256: sha(repeat),
      repeatExact: png.equals(repeat),
      width: png.readUInt32BE(16),
      height: png.readUInt32BE(20),
      selectionSha256: selection === null ? null : sha(selection),
      fonts,
      paint,
      structural: layout?.structural ?? null,
    };
    await save(`${spec.id}-capture.json`, capture);
    assert(capture.repeatExact);
    assert.deepEqual(network, []);
    assert.deepEqual(errors, []);
    const readings = [];
    for (const engine of ["zxing", "jsqr", "opencv"]) {
      const input = resolve(out, `${spec.id}.png`);
      const args =
        engine === "opencv"
          ? [
              "-B",
              "experiments/prose-qr/styled-story-2026-10-11/opencv.py",
              input,
            ]
          : [
              "experiments/prose-qr/styled-story-2026-10-11/reader.mjs",
              engine,
              input,
            ];
      const raw = spawnSync(
        engine === "opencv" ? "python3" : process.execPath,
        args,
        { encoding: "utf8", timeout: 45000, maxBuffer: 12000000 },
      );
      await save(`${spec.id}-${engine}.stdout.txt`, raw.stdout ?? "");
      await save(`${spec.id}-${engine}.stderr.txt`, raw.stderr ?? "");
      let value = null;
      try {
        value = JSON.parse(raw.stdout);
      } catch {}
      const reading = {
        engine,
        status: raw.status,
        error: raw.error?.message ?? null,
        texts: value?.texts ?? null,
        exact: value ? value.texts.includes(spec.payload) : null,
      };
      readings.push(reading);
      assert(
        !value || value.texts.every((t) => t === spec.payload),
        "Wrong payload",
      );
      if (spec.control) assert(reading.exact, "Conventional control failed");
    }
    const row = { ...capture, readings };
    rows.push(row);
    await appendFile(resolve(out, "results.jsonl"), JSON.stringify(row) + "\n");
    console.log(
      JSON.stringify({
        id: spec.id,
        side: capture.width,
        field: layout?.structural.field,
        font: spec.font,
        size: spec.fontSize,
        case: spec.case,
        words: layout?.structural.words,
        readings: readings.map((r) => [r.engine, r.exact]),
      }),
    );
  }
  await save("summary.json", {
    finishedAt: new Date().toISOString(),
    planned: inputs.length,
    completed: rows.length,
    rows,
    network,
    errors,
    bytes: await used(),
  });
} catch (e) {
  await save("abort.json", {
    at: new Date().toISOString(),
    error: e.stack,
    completed: rows.map((r) => r.id),
    uncompleted: inputs
      .filter((s) => !rows.some((r) => r.id === s.id))
      .map((s) => s.id),
    network,
    errors,
  });
  throw e;
} finally {
  await browser.close();
}

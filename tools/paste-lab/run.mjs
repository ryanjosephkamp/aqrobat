// Paste lab: pastes Aqrobat text outputs into web editor engines with a real
// clipboard paste in headless Chrome, measures what the editor did to the
// text, screenshots the result, and decodes it (sharp and phone simulation).
//
//   node tools/paste-lab/run.mjs [filters...] [--shards=N] [--limit=N]
//
// Filters: bare words match an editor, style, format id prefix, format family,
// payload id, or width ("w640"). Words of the same kind are ORed; different
// kinds are ANDed. Example: node tools/paste-lab/run.mjs quill tiles short
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile, appendFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { availableParallelism, freemem } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { startServer } from "./lib/server.mjs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  EDITORS,
  FORMATS,
  PAYLOADS,
  WIDTHS,
  allCases,
  buildPayloads,
} from "./lib/cases.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
const outDir = resolve(repo, "test-results/paste-lab");
const CHROME =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const a = args.find((x) => x.startsWith(`--${name}=`));
  return a ? a.slice(name.length + 3) : fallback;
};
const words = args.filter((a) => !a.startsWith("--"));

function makeFilter() {
  if (!words.length) return () => true;
  const styles = new Set(Object.values(EDITORS).flatMap((e) => e.styles));
  const groups = { editor: [], style: [], format: [], payload: [], width: [] };
  for (const w of words) {
    if (EDITORS[w]) groups.editor.push(w);
    else if (styles.has(w)) groups.style.push(w);
    else if (PAYLOADS[w]) groups.payload.push(w);
    else if (/^w\d+$/.test(w)) groups.width.push(Number(w.slice(1)));
    else if (FORMATS.some((f) => f.id.startsWith(w) || f.family === w))
      groups.format.push(w);
    else throw new Error(`Unknown filter word: ${w}`);
  }
  return (c) =>
    (!groups.editor.length || groups.editor.includes(c.editor)) &&
    (!groups.style.length || groups.style.includes(c.style)) &&
    (!groups.payload.length || groups.payload.includes(c.payloadId)) &&
    (!groups.width.length || groups.width.includes(c.width)) &&
    (!groups.format.length ||
      groups.format.some((w) => c.format.startsWith(w) || c.family === w));
}

async function launch() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: existsSync(CHROME) ? CHROME : undefined,
  });
  const context = await browser.newContext({
    viewport: { width: 1500, height: 1200 },
    deviceScaleFactor: 1,
    permissions: ["clipboard-read", "clipboard-write"],
  });
  return { browser, context };
}

// ---------------------------------------------------------------- worker --
async function worker() {
  const casesFile = flag("cases"),
    outFile = flag("out"),
    base = flag("url"),
    shard = flag("shard", "0");
  const { decodePng } = await import("./lib/decode.mjs");
  const { cases, payloads } = JSON.parse(await readFile(casesFile, "utf8"));
  const { browser, context } = await launch();
  let page = null,
    cdp = null;
  const errors = [];
  const newPage = async () => {
    if (page) await page.close().catch(() => {});
    page = await context.newPage();
    cdp = await context.newCDPSession(page);
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error")
        errors.push(`console: ${m.text().slice(0, 300)}`);
    });
  };
  try {
    await newPage();
    let n = 0;
    for (const c of cases) {
      n++;
      const p = payloads[`${c.format}|${c.payloadId}`];
      const t0 = performance.now();
      errors.length = 0;
      let record = {
        id: c.id,
        editor: c.editor,
        style: c.style,
        width: c.width,
        format: c.format,
        family: c.family,
        payload: c.payloadId,
        qrVersion: p.version,
        clipboardTypes: null,
      };
      try {
        const url = `${base}/lab/dist/${c.entry}.html?style=${c.style}&width=${c.width}${c.variant ? `&variant=${c.variant}` : ""}`;
        await page.goto(url);
        await page.waitForFunction(
          () => document.documentElement.dataset.labReady === "1",
          null,
          { timeout: 15000 },
        );
        await page.evaluate(() => document.fonts.ready.then(() => true));
        await page.bringToFront();
        record.clipboardTypes = await page.evaluate(
          (clip) => window.lab.writeClipboard(clip),
          p.clip,
        );
        record.focused = await page.evaluate(() => window.lab.focus());
        await page.keyboard.press("ControlOrMeta+V");
        record.settle = await page.evaluate(() => window.lab.settle());
        await page.evaluate(() => window.lab.finish());
        const m = await page.evaluate((e) => window.lab.measure(e), p.expect);
        record.model = await page.evaluate(() => window.lab.modelText());
        if (
          record.model &&
          typeof record.model === "object" &&
          typeof record.model.text === "string"
        )
          record.model.text = record.model.text.slice(0, 160);
        else if (typeof record.model === "string")
          record.model = record.model.slice(0, 160);
        Object.assign(record, m);
        record.render.platformFonts = await platformFonts(cdp);
        const clip = m.clip;
        clip.width = Math.max(1, clip.width);
        clip.height = Math.max(1, clip.height);
        const shotPath = join(outDir, `${c.id}.png`);
        const shot = await page.screenshot({
          clip,
          fullPage: true,
          path: shotPath,
          animations: "disabled",
          caret: "hide",
        });
        record.screenshot = `test-results/paste-lab/${c.id}.png`;
        const sharp = await decodePng(shot, p.payload);
        const geo = m.geometry;
        const modulePx = Math.sqrt(
          Math.max(0.01, geo.moduleW) * Math.max(0.01, geo.moduleH),
        );
        const scale = Math.min(4, Math.max(0.05, 4 / modulePx));
        const phoneB64 = await page.evaluate((a) => window.lab.phoneSim(a), {
          b64: shot.toString("base64"),
          scale,
        });
        const phone = await decodePng(
          Buffer.from(phoneB64, "base64"),
          p.payload,
        );
        record.decode = {
          sharp: { ...sharp, pass: sharp.zxing.pass || sharp.jsqr.pass },
          phone: {
            ...phone,
            scale: Number(scale.toFixed(4)),
            pass: phone.zxing.pass || phone.jsqr.pass,
          },
        };
        record.changes = classify(record, p);
      } catch (e) {
        record.error = String(e?.message || e).slice(0, 500);
        await newPage();
      }
      record.pageErrors = errors.slice(0, 5);
      record.ms = Math.round(performance.now() - t0);
      await appendFile(outFile, JSON.stringify(record) + "\n");
      if (n % 25 === 0 || n === cases.length)
        process.stdout.write(`[shard ${shard}] ${n}/${cases.length}\n`);
    }
  } finally {
    await browser.close();
  }
}

// Fonts Chrome actually used to draw the text of the glyph's host element
// (includes fallback fonts, such as the emoji font).
async function platformFonts(cdp) {
  try {
    await cdp.send("DOM.enable");
    await cdp.send("CSS.enable");
    await cdp.send("DOM.getDocument", { depth: 0 });
    const { result } = await cdp.send("Runtime.evaluate", {
      expression: "window.__labGlyphHost",
    });
    if (!result.objectId) return null;
    let { nodeId } = await cdp.send("DOM.requestNode", {
      objectId: result.objectId,
    });
    if (!nodeId) return null;
    let { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
    if (!fonts.length) {
      // A textarea draws its text in a user-agent shadow root.
      const { node } = await cdp.send("DOM.describeNode", {
        nodeId,
        depth: 2,
        pierce: true,
      });
      const inner = node.shadowRoots?.[0]?.children?.find(
        (c) => c.nodeName === "DIV",
      );
      if (inner) {
        const { nodeIds } = await cdp.send(
          "DOM.pushNodesByBackendIdsToFrontend",
          { backendNodeIds: [inner.backendNodeId] },
        );
        if (nodeIds?.[0])
          ({ fonts } = await cdp.send("CSS.getPlatformFontsForNode", {
            nodeId: nodeIds[0],
          }));
      }
    }
    return fonts.map(
      (f) =>
        `${f.familyName}${f.isCustomFont ? " (web)" : ""}: ${f.glyphCount}`,
    );
  } catch (e) {
    return [`error: ${String(e.message).slice(0, 80)}`];
  }
}

// Plain-language change labels derived from the measurements.
function classify(r, p) {
  const out = [];
  const rows = r.rows,
    diff = r.chars.diff;
  const act = (cp) => diff[cp]?.[1] ?? null;
  if (rows.actual < rows.expected) out.push("rows-merged-or-lost");
  if (rows.actual > rows.expected) out.push("rows-added");
  if (act("U+00A0") > 0) out.push("nbsp-substituted");
  const spacesExp = p.expect.rows.join("").split(" ").length - 1;
  const spacesAct =
    (diff["U+0020"] ? diff["U+0020"][1] : spacesExp) + (act("U+00A0") || 0);
  if (spacesAct < spacesExp) out.push("spaces-lost-in-dom");
  const changedNonSpace = Object.keys(diff).filter(
    (k) => !["U+0020", "U+00A0", "U+000A"].includes(k),
  );
  if (changedNonSpace.length)
    out.push(`chars-changed:${changedNonSpace.join(",")}`);
  if (rows.rowsCollapsedByRender > 0) out.push("render-collapses-spaces");
  if (r.render.wrapped) out.push("wrapped");
  if (r.render.overflowX) out.push("overflows-width");
  if (
    r.geometry.aspect &&
    (r.geometry.aspect < 0.8 || r.geometry.aspect > 1.25)
  )
    out.push("non-square-modules");
  if (!r.settle?.settled) out.push("paste-did-not-settle");
  if (r.render.inverted) out.push("inverted-colors");
  return out;
}

// ---------------------------------------------------------------- parent --
async function main() {
  const started = Date.now();
  await mkdir(outDir, { recursive: true });
  const { buildPages } = await import("./build.mjs");
  if (await buildPages()) console.log("Bundled editor pages.");
  const cases = allCases(makeFilter());
  const limit = Number(flag("limit", "0"));
  if (limit) cases.splice(limit);
  if (!cases.length) throw new Error("No cases match the filters.");
  const server = await startServer(repo);
  let payloads;
  {
    const { browser, context } = await launch();
    try {
      const page = await context.newPage();
      await page.goto(`${server.url}/lab/pages/builder.html`);
      await page.waitForFunction(
        () => document.documentElement.dataset.ready === "1",
      );
      payloads = await buildPayloads((payload, opts) =>
        page.evaluate(([a, b]) => window.buildRich(a, b), [payload, opts]),
      );
    } finally {
      await browser.close();
    }
  }
  const cpu = availableParallelism();
  const memShards = Math.max(1, Math.floor(freemem() / (500 * 1024 * 1024)));
  const shards = Math.max(
    1,
    Math.min(
      Number(flag("shards", "0")) || Math.min(4, cpu - 2),
      memShards,
      cases.length,
    ),
  );
  console.log(
    `${cases.length} cases on ${shards} shard(s); server ${server.url}`,
  );
  const tmp = join(outDir, ".work");
  await rm(tmp, { recursive: true, force: true });
  await mkdir(tmp, { recursive: true });
  // Interleave cases so each shard sees a mix of editors.
  const buckets = Array.from({ length: shards }, () => []);
  cases.forEach((c, i) => buckets[i % shards].push(c));
  const children = [];
  try {
    await Promise.all(
      buckets.map(async (bucket, i) => {
        const casesFile = join(tmp, `cases-${i}.json`),
          outFile = join(tmp, `out-${i}.jsonl`);
        await writeFile(casesFile, JSON.stringify({ cases: bucket, payloads }));
        await writeFile(outFile, "");
        const child = spawn(
          process.execPath,
          [
            fileURLToPath(import.meta.url),
            "--worker",
            `--cases=${casesFile}`,
            `--out=${outFile}`,
            `--url=${server.url}`,
            `--shard=${i}`,
          ],
          { stdio: ["ignore", "inherit", "inherit"] },
        );
        children.push(child);
        const code = await new Promise((ok) => child.on("exit", ok));
        if (code !== 0) console.error(`shard ${i} exited with code ${code}`);
      }),
    );
  } finally {
    for (const c of children) if (c.exitCode === null) c.kill("SIGTERM");
    server.close();
  }
  const records = [];
  for (let i = 0; i < shards; i++) {
    const text = await readFile(join(tmp, `out-${i}.jsonl`), "utf8").catch(
      () => "",
    );
    for (const line of text.split("\n"))
      if (line.trim()) records.push(JSON.parse(line));
  }
  const order = new Map(cases.map((c, i) => [c.id, i]));
  records.sort((a, b) => order.get(a.id) - order.get(b.id));
  const { DECODERS } = await import("./lib/decode.mjs");
  const probe = await (async () => {
    const { browser } = await launch();
    const v = browser.version();
    await browser.close();
    return v;
  })();
  const git = (...a) => {
    try {
      return execFileSync("git", a, { cwd: repo, encoding: "utf8" }).trim();
    } catch {
      return null;
    }
  };
  const srcHash = createHash("sha256");
  for (const f of [
    "src/core.mjs",
    "src/portable.mjs",
    "src/text.mjs",
    "src/render.mjs",
    "vendor/qrcodegen.mjs",
  ])
    srcHash.update(await readFile(join(repo, f)));
  const meta = {
    generated: new Date().toISOString(),
    git: {
      head: git("rev-parse", "--short", "HEAD"),
      srcDirty: !!git("status", "--porcelain", "--", "src", "vendor"),
    },
    srcSha256: srcHash.digest("hex").slice(0, 16),
    chrome: probe,
    platform: `${process.platform} ${process.arch}`,
    node: process.version,
    filters: words,
    cases: records.length,
    planned: cases.length,
    runtimeSeconds: Math.round((Date.now() - started) / 1000),
    shards,
    decoders: DECODERS,
    payloads: Object.fromEntries(
      Object.entries(PAYLOADS).map(([k, v]) => [
        k,
        {
          payload: v,
          version: payloads[`plain-hash-2x1|${k}`].version,
          modules: payloads[`plain-hash-2x1|${k}`].modules,
        },
      ]),
    ),
    editors: Object.fromEntries(
      Object.entries(EDITORS).map(([k, e]) => [
        k,
        { styles: e.styles, license: e.license },
      ]),
    ),
    widths: WIDTHS,
    formats: FORMATS.map((f) => ({ id: f.id, kind: f.kind, opts: f.opts })),
    pass: "exact payload from ZXing or jsQR; per-decoder results are kept in each record",
    phoneSimulation:
      "screenshot rescaled in Chrome so one module is about 4 px (geometric mean of module width and height), canvas filter blur(0.8px), 20 px white margin. Not a phone camera scan.",
    styles:
      "style simulations approximate destination fonts and line spacing; they are not the real apps",
  };
  const outPath = join(outDir, "results.json");
  const partial =
    words.length || limit ? join(outDir, "results-partial.json") : outPath;
  await writeFile(partial, JSON.stringify({ meta, records }, null, 1) + "\n");
  await rm(tmp, { recursive: true, force: true });
  const { summarize } = await import("./lib/summary.mjs");
  const summary = summarize(records, meta);
  await writeFile(
    join(outDir, partial === outPath ? "summary.md" : "summary-partial.md"),
    summary,
  );
  console.log(summary);
  console.log(`Wrote ${partial}`);
}

// zxing-wasm and the esbuild service keep handles open; exit explicitly.
if (args.includes("--worker")) await worker();
else await main();
process.exit(0);

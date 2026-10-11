import { chromium } from "playwright";
import {
  readFile,
  writeFile,
  mkdir,
  appendFile,
  readdir,
  stat,
} from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";
import assert from "node:assert/strict";
import { build, documentHtml } from "../flow/layout.mjs";
import { positiveControl } from "../layout.mjs";
import { ornamentLayout } from "./ornament.mjs";
import { composeStory } from "./compositor.mjs";
import { heavyStory } from "./heavy.mjs";

const root = resolve("docs/research/prose-qr/styled-story-2026-10-11");
const configPath = process.argv[2];
const configBytes = await readFile(configPath);
const config = JSON.parse(configBytes);
const out = resolve(root, config.id);
assert(out.startsWith(root + "/") && !config.id.includes("/"));
assert(Date.now() < Date.parse("2026-10-11T07:23:00Z"));
await mkdir(out);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const save = async (name, value) => {
  const bytes =
    typeof value === "string" || Buffer.isBuffer(value)
      ? value
      : JSON.stringify(value, null, 2) + "\n";
  await writeFile(resolve(out, name), bytes, { flag: "wx" });
  return sha(bytes);
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
  "experiments/prose-qr/styled-story-2026-10-11/batch.mjs",
  "experiments/prose-qr/styled-story-2026-10-11/reader.mjs",
  "experiments/prose-qr/styled-story-2026-10-11/opencv.py",
  "experiments/prose-qr/flow/layout.mjs",
  "experiments/prose-qr/layout.mjs",
  "src/core.mjs",
  "vendor/qrcodegen.mjs",
  "docs/research/prose-qr/pilot-02/metrics.json",
];
if (config.layout === "ornament" || config.layout === "compositor")
  sourcePaths.push(
    "experiments/prose-qr/styled-story-2026-10-11/ornament.mjs",
    config.resourcePath,
  );
if (config.layout === "compositor")
  sourcePaths.push(
    "experiments/prose-qr/styled-story-2026-10-11/compositor.mjs",
    config.atlasPath,
  );
if (config.layout === "heavy")
  sourcePaths.push(
    "experiments/prose-qr/styled-story-2026-10-11/heavy.mjs",
    config.resourcePath,
    config.controlReplayReceipt,
  );
for (const p of new Set(
  config.specs.map((s) => s.atlasOverride).filter(Boolean),
))
  sourcePaths.push(p);
if (config.controlReplayReceipt && config.layout !== "heavy")
  sourcePaths.push(config.controlReplayReceipt);
const sourceHashes = {};
for (let i = 0; i < sourcePaths.length; i++) {
  const bytes = await readFile(sourcePaths[i]);
  sourceHashes[sourcePaths[i]] = await save(
    `source-${i + 1}.txt.gz`,
    gzipSync(bytes),
  );
  sourceHashes[sourcePaths[i] + ":uncompressed"] = sha(bytes);
}
const inputs = [
  ...(config.controlReplayReceipt
    ? []
    : [...new Set(config.specs.map((s) => s.payload))].map((payload, i) => ({
        id: `control-${i + 1}`,
        payload,
        control: true,
      }))),
  ...config.specs,
];
if (config.controlReplayReceipt) {
  const receipt = JSON.parse(
    await readFile(config.controlReplayReceipt, "utf8"),
  );
  for (const payload of new Set(config.specs.map((s) => s.payload))) {
    const r = receipt.rows.find((r) => r.payload === payload);
    assert(
      r &&
        r.readings.length === 3 &&
        r.readings.every((v) => v.exact && v.status === 0),
    );
    assert.equal(sha(await readFile(r.path)), r.pngSha256);
  }
}
await save("manifest.json", {
  at: new Date().toISOString(),
  configPath,
  configSha256: sha(configBytes),
  config,
  inputs,
  sourceHashes,
  candidateSlots: config.specs.length,
  repeatSlots: inputs.length,
  readerSlots: inputs.length * 3,
  deadline: "2026-10-11T07:23:00Z",
  inputTransforms: "none",
  conventionalCaptureSlots: inputs.filter((s) => s.control).length,
  controlReplayReceipt: config.controlReplayReceipt || null,
});
const metrics = JSON.parse(
  await readFile("docs/research/prose-qr/pilot-02/metrics.json", "utf8"),
);
const resourceRows = config.resourcePath
  ? JSON.parse(await readFile(config.resourcePath, "utf8")).rows || []
  : null;
const finder = resourceRows?.find((r) => r.id === config.finder);
if (config.cornerParts)
  finder.parts = config.cornerParts.map((id) => {
    const part = resourceRows.find((r) => r.id === id);
    assert(part, "Missing native corner part");
    return part;
  });
const alignment = resourceRows?.find((r) => r.id === config.alignment);
const atlas = config.atlasPath
  ? JSON.parse(await readFile(config.atlasPath, "utf8"))
  : null;
const heavyResource =
  config.layout === "heavy"
    ? JSON.parse(await readFile(config.resourcePath, "utf8"))
    : null;
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const rows = [];
const network = [];
const errors = [];
const viewport = config.viewport || { width: 3000, height: 3000 };
try {
  const context = await browser.newContext({
    viewport,
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
    viewport,
    deviceScaleFactor: 1,
    installedFonts: metrics.fonts,
  });
  for (const spec of inputs) {
    assert(
      Date.now() < Date.parse("2026-10-11T07:23:00Z"),
      "Experiment cutoff reached",
    );
    assert(
      (await used()) <
        (config.largeFieldBound
          ? 148000000 - config.largeFieldBound
          : config.smallCaptureBound
            ? 116000000 - config.smallCaptureBound
            : 110000000),
      "Evidence reserve reached",
    );
    let layout = null;
    let html;
    if (spec.control) html = documentHtml(positiveControl(spec.payload, 656));
    else {
      layout =
        config.layout === "heavy"
          ? heavyStory(spec, heavyResource)
          : config.layout === "compositor"
            ? composeStory(
                spec,
                spec.atlasOverride
                  ? JSON.parse(await readFile(spec.atlasOverride, "utf8"))
                  : atlas,
                finder,
              )
            : config.layout === "ornament"
              ? ornamentLayout(spec, metrics, finder, alignment)
              : build(spec, metrics);
      assert(
        layout.structural.maxOpticalHeightToLineHeight < 1,
        "Glyphs exceed line height",
      );
      assert(layout.structural.emptyLines === 0);
      const stroke = spec.darkStroke || 0;
      html = documentHtml(
        `<style>.line>span[style^="font-weight:700"]{-webkit-text-stroke:${stroke}px currentColor;paint-order:stroke fill}</style>${layout.markup}`,
      );
      await save(`${spec.id}-layout.json`, {
        spec,
        plainText: layout.plainText,
        structural: layout.structural,
        unit: layout.unit,
        side: layout.side,
        modules: layout.modules,
        matrix: layout.matrix,
        constructionLedger: layout.constructionLedger || null,
      });
      await save(`${spec.id}.txt`, layout.plainText);
    }
    await save(`${spec.id}.html.gz`, gzipSync(html));
    await page.setContent(html);
    await page.evaluate(() => document.fonts.ready);
    let selection = null;
    let fonts = null;
    if (layout) {
      const lines = await page.locator(".line").allTextContents();
      assert.deepEqual(lines, layout.lines, "DOM source line mismatch");
      selection = await page.locator("#text-body").evaluate((e) => {
        const s = getSelection();
        const r = document.createRange();
        r.selectNodeContents(e);
        s.removeAllRanges();
        s.addRange(r);
        const text = s.toString();
        s.removeAllRanges();
        return text;
      });
      await save(`${spec.id}-selection.json`, {
        expected: layout.plainText,
        actual: selection,
        exact: selection === layout.plainText,
      });
      assert.equal(selection, layout.plainText, "Selection mismatch");
      const doc = await cdp.send("DOM.getDocument");
      const node = await cdp.send("DOM.querySelector", {
        nodeId: doc.root.nodeId,
        selector: "#text-body",
      });
      fonts = (
        await cdp.send("CSS.getPlatformFontsForNode", { nodeId: node.nodeId })
      ).fonts;
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
      selectionSha256: selection === null ? null : sha(selection),
      fonts,
      width: png.readUInt32BE(16),
      height: png.readUInt32BE(20),
      nativeFontSize: spec.fontSize || null,
    };
    await save(`${spec.id}-capture.json`, capture);
    assert(capture.repeatExact, "Immediate repeat mismatch");
    assert.deepEqual(network, []);
    assert.deepEqual(errors, []);
    const readings = [];
    for (const engine of ["zxing", "jsqr", "opencv"]) {
      const path = resolve(out, `${spec.id}.png`);
      const args =
        engine === "opencv"
          ? [
              "-B",
              "experiments/prose-qr/styled-story-2026-10-11/opencv.py",
              path,
            ]
          : [
              "experiments/prose-qr/styled-story-2026-10-11/reader.mjs",
              engine,
              path,
            ];
      const raw = spawnSync(
        engine === "opencv" ? "python3" : process.execPath,
        args,
        { timeout: 45000, maxBuffer: 12000000, encoding: "utf8" },
      );
      await save(`${spec.id}-${engine}.stdout.txt`, raw.stdout || "");
      await save(`${spec.id}-${engine}.stderr.txt`, raw.stderr || "");
      let value = null;
      try {
        value = JSON.parse(raw.stdout);
      } catch {}
      const reading = {
        engine,
        status: raw.status,
        error: raw.error?.message || null,
        texts: value?.texts || null,
        exact: value ? value.texts.includes(spec.payload) : null,
      };
      readings.push(reading);
      assert(
        !value || value.texts.every((t) => t === spec.payload),
        "Wrong payload; stop batch",
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
        exact: readings.map((r) => [r.engine, r.exact]),
        bytes: await used(),
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

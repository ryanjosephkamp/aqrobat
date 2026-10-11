import { readFile, writeFile, mkdir } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import assert from "node:assert/strict";
import qrcodegen from "../../../../vendor/qrcodegen.mjs";
import { sha } from "./common.mjs";
const root = "docs/research/prose-qr/integrated-2026-10-10/empirical",
  source = "experiments/prose-qr/integrated-2026-10-10/empirical",
  out = root + "/payload-02",
  design = "docs/research/prose-qr/integrated-2026-10-10/design/measured-04-v5";
await mkdir(out, { recursive: true });
const save = async (p, b) => writeFile(p, b, { flag: "wx" }),
  json = (p, v) => save(p, JSON.stringify(v, null, 2) + "\n");
const planRaw = await readFile(design + "/best-canonical-proposal.json"),
  plan = JSON.parse(planRaw);
assert.equal(
  sha(planRaw),
  "e606b1b388df80590e183881479286a161792408cb2ce2eb2bd059e69e3e394e",
);
assert.equal(
  sha(
    await readFile(
      "experiments/prose-qr/integrated-2026-10-10/design/padding-solver.mjs",
    ),
  ),
  "8eaaa74ed8b74d809a4cd459f59e835f9decce2588da31b75bb6beb0de8a59fa",
);
await save(out + "/imported-plan.json.txt", planRaw);
await save(
  out + "/imported-solver.mjs.gz",
  gzipSync(
    await readFile(
      "experiments/prose-qr/integrated-2026-10-10/design/padding-solver.mjs",
    ),
  ),
);
const old = JSON.parse(
    await readFile(root + "/layout-05/preregistration.json"),
  ),
  original = old.specs.find((t) => t.id === "v5-reverse-regular"),
  styles = new Map(plan.nativeStyles.map((s) => [s.id, s.state])),
  input = JSON.parse(
    await readFile(root + "/construction-05/native-input.json"),
  );
assert.equal(
  sha(await readFile(root + "/construction-05/native-input.json")),
  plan.sourceInput.sha256,
);
const toggled = plan.nativeStyles.filter((s) => s.state === 1).map((s) => s.id);
let html = await readFile(original.htmlPath, "utf8");
for (const id of toggled) {
  const re = new RegExp(`<span id="${id}"[^>]*>`);
  const match = html.match(re);
  assert(match, "Missing actual native source glyph");
  const next = match[0]
    .replace('data-font="Menlo-Regular"', 'data-font="Menlo-Bold"')
    .replace("font-family:'Menlo-Regular'", "font-family:'Menlo-Bold'");
  html = html.replace(match[0], next);
}
html =
  html.replace(
    "<title>Words and ink</title>",
    "<title>Words and ink — exploratory canonical payload projection</title>",
  ) +
  "\n<!-- Canonical V5H mask7 source-style projection; known large matrix defects, strict gate not waived. -->\n";
const native = {
  ...original,
  id: "native-projection",
  dir: out + "/native-projection",
  payloadTrial: true,
  purpose:
    "Explicit exploratory canonical payload projection beyond failed strict gate; ordinary readers test actual source despite known ideal-grid defects",
  version: 5,
  ecc: "H",
  mask: 7,
  padding: "canonical",
  nativeStyles: plan.nativeStyles,
  glyphs: original.glyphs.map((g) => ({
    ...g,
    font: styles.get(`g-${g.p}-${g.index}`) === 1 ? "Menlo-Bold" : g.font,
  })),
  expectedFonts: ["Futura-Bold", "Avenir-Black", "Menlo-Regular", "Menlo-Bold"],
  constructionWarning: plan.warning,
  strictEligibility:
    "Unknown for this exact mixed source before its one passive profile. Same finder route previously failed strict balance/span/stability; thresholds unchanged.",
};
await mkdir(native.dir);
native.htmlPath = native.dir + "/source.html.txt";
native.htmlSha256 = sha(html);
await save(native.htmlPath, html);
const prediction = {
  sourceInputSha256: plan.sourceInput.sha256,
  planSha256: sha(planRaw),
  samples: input.samples.map((a) => ({
    x: a.x,
    y: a.y,
    px: Math.floor(64 + (a.x + 0.5) * 6.5),
    py: Math.floor(64 + (a.y + 0.5) * 6.5),
    expected: a.base ^ (a.toggle ? (styles.get(a.group) ?? 0) : 0),
  })),
};
await json(out + "/sample-prediction.json", prediction);
native.samplePrediction = {
  path: out + "/sample-prediction.json",
  sha256: sha(await readFile(out + "/sample-prediction.json")),
};
const qr = qrcodegen.QrCode.encodeSegments(
    [
      qrcodegen.QrSegment.makeBytes([
        ...new TextEncoder().encode(plan.payload),
      ]),
    ],
    qrcodegen.QrCode.Ecc.HIGH,
    5,
    5,
    7,
    false,
  ),
  matrix = Array.from({ length: 37 }, (_, y) =>
    Array.from({ length: 37 }, (_, x) => +qr.getModule(x, y)),
  );
assert.deepEqual(
  matrix,
  plan.matrix,
  "Imported plan matrix equals pinned canonical exactURL encoder",
);
const rects = [];
for (let y = 0; y < 37; y++)
  for (let x = 0; x < 37; x++)
    if (matrix[y][x])
      rects.push(
        `<rect x="${64 + x * 6.5}" y="${64 + y * 6.5}" width="6.5" height="6.5"/>`,
      );
const control = {
  id: "canonical-control",
  kind: "control",
  dir: out + "/canonical-control",
  width: 512,
  height: 512,
  geometry: original.geometry,
  version: 5,
  ecc: "H",
  mask: 7,
  padding: "canonical",
  requiredReaders: ["opencv", "zxing", "jsqr"],
};
await mkdir(control.dir);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="white"/><g fill="black">${rects.join("")}</g></svg>`,
  controlHtml = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:white}svg{display:block}</style></head><body>${svg}</body></html>`;
control.htmlPath = control.dir + "/source.html.txt";
control.htmlSha256 = sha(controlHtml);
await save(control.htmlPath, controlHtml);
await save(control.dir + "/source.svg.txt", svg);
const sourceHashes = {};
for (const f of [
  "prepare-payload-v5.mjs",
  "run-batch-v4.mjs",
  "reader.mjs",
  "ordinary.py",
  "common.mjs",
  "passive.mjs",
  "metrics.mjs",
])
  sourceHashes[source + "/" + f] = sha(await readFile(source + "/" + f));
await json(out + "/target-and-residual.json", plan);
await json(out + "/preregistration.json", {
  ...old,
  frozenAtUtc: new Date().toISOString(),
  specs: [control, native],
  sourceHashes,
  readerOrder: ["opencv", "zxing", "jsqr"],
  amends:
    "32pure ECC/mask alternatives over measured native styles rejected exact canonical/affine fit and all bounded-radius routes. This second exploratory payload trial changes prose, version, actual alignment glyph and complete data/function geometry; it applies residual-ranked V5Hmask7 whole-glyph canonical styles to the freshly measured source. It tests ordinary readers beyond the limited ideal-grid model, not a near-embedding claim.",
  hypothesis:
    "Native whole-glyph regular/bold choices derived from exactURL canonical target may influence ordinary readers on newly written readable short prose; actual default-reader outputs decide recovery independently of fixed strict-gate failure.",
  denominator: {
    native: 1,
    control: 1,
    ordinarySlots: 6,
    profiles: 2,
    repeats: 2,
    payloadTrials: 1,
  },
  importedDesign: {
    planPath: design + "/best-canonical-proposal.json",
    planSha256: sha(planRaw),
    solverSha256:
      "8eaaa74ed8b74d809a4cd459f59e835f9decce2588da31b75bb6beb0de8a59fa",
    solverSnapshot: out + "/imported-solver.mjs.gz",
    inputSha256: plan.sourceInput.sha256,
    all32receipts: design + "/summary.json",
  },
  preCaptureDefects: {
    totalModuleMismatch: plan.residual.totalMismatch,
    functionMismatch: plan.residual.functionMismatch,
    blockSymbolErrors: plan.residual.blocks.map((b) => ({
      block: b.block,
      errors: b.symbolErrors,
      radius: b.symbolErrorRadius,
    })),
    quietRing: plan.residual.quietRing,
  },
  sourceIntegrity:
    "Each original source codepoint occurs exactly once; unchanged positions/word/paragraph order; only selected real native Menlo glyph weights change. Uniform visible flat black article field is independent of matrix; QR target is used only for separate conventional control and pure diagnostics.",
  stops: [
    ...old.stops,
    "actual native rawgray128 module sample prediction mismatch before readers",
  ],
  remainingAllocationBeforeBatch: {
    glyphResources: 29,
    native: 13,
    control: 1,
    ordinary: 54,
    payloadTrials: 2,
    bytes: 27000000,
  },
});
console.log(
  JSON.stringify({
    frozen: out,
    toggledGlyphs: toggled.length,
    matrixSha256: sha(JSON.stringify(matrix)),
    knownMismatch: plan.residual.totalMismatch,
  }),
);

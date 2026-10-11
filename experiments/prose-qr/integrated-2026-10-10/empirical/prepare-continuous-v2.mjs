import { readFile, writeFile, mkdir } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import assert from "node:assert/strict";
import qrcodegen from "../../../../vendor/qrcodegen.mjs";
import { sha } from "./common.mjs";
const root = "docs/research/prose-qr/integrated-2026-10-10/empirical",
  source = "experiments/prose-qr/integrated-2026-10-10/empirical",
  imported =
    "docs/research/prose-qr/integrated-2026-10-10/mechanism/candidate-01",
  out = root + "/payload-04";
await mkdir(out);
const save = async (p, b) => writeFile(p, b, { flag: "wx" }),
  json = (p, v) => save(p, JSON.stringify(v, null, 2) + "\n");
const raw = await readFile(imported + "/source-spec.json"),
  spec = JSON.parse(raw),
  html = await readFile(imported + "/source.html.txt");
assert.equal(
  sha(html),
  "6bfae0945c2b2f7476feb56c9eb6de6e7c50426f301f26070875ff0d62394715",
);
assert.equal(sha(html), spec.htmlSha256);
assert.equal(spec.target.payload, "https://example.com/");
assert.equal(spec.target.padding, "canonical");
assert.equal(spec.fullText, spec.texts.join("\n\n"));
await save(out + "/imported-source-spec.json.txt", raw);
const selectionPath =
  "docs/research/prose-qr/integrated-2026-10-10/mechanism/selection-01.json";
await save(out + "/imported-selection.json.txt", await readFile(selectionPath));
for (const [path, hash] of Object.entries(spec.sourceHashes)) {
  const bytes = await readFile(path);
  assert.equal(sha(bytes), hash);
  await save(
    out + "/imported-" + path.split("/").at(-1) + ".gz",
    gzipSync(bytes),
  );
}
const qr = qrcodegen.QrCode.encodeSegments(
    [
      qrcodegen.QrSegment.makeBytes([
        ...new TextEncoder().encode("https://example.com/"),
      ]),
    ],
    qrcodegen.QrCode.Ecc.QUARTILE,
    2,
    2,
    1,
    false,
  ),
  matrix = Array.from({ length: 25 }, (_, y) =>
    Array.from({ length: 25 }, (_, x) => +qr.getModule(x, y)),
  );
assert.deepEqual(
  matrix,
  spec.target.matrix,
  "Pinned canonical encoder matrix equality",
);
assert.equal(sha(JSON.stringify(matrix)), spec.target.matrixSha256);
const native = {
  ...spec,
  id: "continuous-native",
  dir: out + "/continuous-native",
  visualReviewRequired: true,
  measurementSpec: {
    path: out + "/imported-source-spec.json.txt",
    sha256: sha(raw),
  },
};
await mkdir(native.dir);
native.htmlPath = native.dir + "/source.html.txt";
await save(native.htmlPath, html);
const control = {
  id: "canonical-control",
  kind: "control",
  dir: out + "/canonical-control",
  width: spec.width,
  height: spec.height,
  geometry: spec.geometry,
  version: 2,
  ecc: "Q",
  mask: 1,
  padding: "canonical",
  requiredReaders: ["opencv", "zxing", "jsqr"],
};
await mkdir(control.dir);
const rects = [];
for (let y = 0; y < 25; y++)
  for (let x = 0; x < 25; x++)
    if (matrix[y][x])
      rects.push(
        `M${spec.geometry.origin + x * spec.geometry.unit},${spec.geometry.origin + y * spec.geometry.unit}h${spec.geometry.unit}v${spec.geometry.unit}h-${spec.geometry.unit}z`,
      );
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1272" height="1272"><rect width="1272" height="1272" fill="white"/><path shape-rendering="crispEdges" fill="black" d="${rects.join("")}"/></svg>`,
  controlHtml = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:white}svg{display:block}</style></head><body>${svg}</body></html>`;
control.htmlPath = control.dir + "/source.html.txt";
control.htmlSha256 = sha(controlHtml);
await save(control.htmlPath, controlHtml);
await save(control.dir + "/source.svg.txt", svg);
const sourceHashes = {};
for (const name of [
  "prepare-continuous-v2.mjs",
  "run-batch-v6.mjs",
  "measure-continuous.mjs",
  "diagnostic.mjs",
  "common.mjs",
  "reader.mjs",
  "ordinary.py",
  "passive.mjs",
  "metrics.mjs",
])
  sourceHashes[source + "/" + name] = sha(await readFile(source + "/" + name));
await json(out + "/preregistration.json", {
  schema: "aqrobat.integrated.full-native-batch.v1",
  frozenAtUtc: new Date().toISOString(),
  payload: "https://example.com/",
  cutoffUtc: "2026-10-10T23:29:22Z",
  allocation: {
    path: "docs/research/prose-qr/integrated-2026-10-10/allocation-02.json",
    sha256: sha(
      await readFile(
        "docs/research/prose-qr/integrated-2026-10-10/allocation-02.json",
      ),
    ),
  },
  sourceHashes,
  specs: [control, native],
  readerOrder: ["opencv", "zxing", "jsqr"],
  denominator: {
    native: 1,
    control: 1,
    ordinarySlots: 6,
    profiles: 2,
    repeats: 2,
    payloadTrials: 1,
    fullSourceDiagnostics: 1,
  },
  lane: "Continuous coherent prose with actual Unicode ornaments; separate from alphabetic O/o route",
  amends:
    "Amends payload-03, stopped at same-size canonical control OpenCV empty text before native capture. Fractional separate SVG rectangles showed internal hairline seams. This control uses one crisp-rendered compound path at unchanged1272pixels/origin154.125/pitch38.53125; target matrix and native source bytes are unchanged. Antialias seams as the cause remain a hypothesis. Pure native envelope bounds remain inconclusive, not predicted success.",
  hypothesis:
    "Native continuous prose foreground may supply encoded data at larger module pitch while full Unicode ornaments provide function geometry. Actual native pixels and ordinary readers decide independently of assigned colors and pure envelope bounds.",
  sourceIntegrity:
    "Original frozen source bytes unchanged. Every source codepoint appears once in source order, normal words/paragraphs. Black/gray180 foreground and same-color1.5px native shadow only; no matrix background, image, hidden text, clipping or custom download. Actual16px Menlo-Bold body, measured row spacing20.40–22.48px,1272x1272 output,DPR1; no downscale.",
  separatorPolicy: spec.separatorPolicy,
  controlPolicy:
    "Pinned canonical exactURL V2Qmask1 normal control at same output size/geometry must recover exactURL from all3 ordinary default APIs before native capture.",
  visualReviewPolicy:
    "After unchanged native capture/repeat and full625/464actual pixel ledger, pause at most180seconds for worker direct image inspection. Review hash must match primary; reject unreadable words, lost complete ink or overlap affecting letterforms. No source edits, retries or model-fit-based selective skip.",
  strictEligibility:
    "Exact existing first-selected every-record strict conjunction unchanged. This is one explicitly exploratory trial if it fails; no source diagnostic can replace first-selected geometry.",
  stops: [
    "source/hash/URL/Selection/native-font/visible-source failure",
    "wrong payload including empty-string decode object",
    "invalid conventional control",
    "immediate PNG/RGBA repeat mismatch",
    "unacceptable worker-observed readability/fullink/letterform overlap",
    "harness/profile/parity failure",
    "cutoff/cap",
    "visual review unavailable180seconds",
  ],
  imported: {
    sourcePath: imported + "/source-spec.json",
    sourceSha256: sha(raw),
    htmlSha256: sha(html),
    selectionPath,
    selectionSha256: sha(await readFile(selectionPath)),
    builderHashes: spec.sourceHashes,
  },
  remainingAllocationBeforeBatch: {
    glyphResources: 51,
    nativeCaptures: 16,
    controlCaptures: 1,
    ordinaryCalls: 65,
    exploratoryTrials: 2,
  },
});
console.log(
  JSON.stringify({
    frozen: out,
    htmlSha256: sha(html),
    canonicalMatrixExact: true,
    denominator: {
      native: 1,
      control: 1,
      ordinary: 6,
      profiles: 2,
      repeats: 2,
      payloadTrials: 1,
    },
  }),
);

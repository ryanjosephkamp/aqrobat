import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { format } from "prettier";
import { gunzipSync } from "node:zlib";
import assert from "node:assert/strict";
const root = "docs/research/prose-qr/phase-45/",
  out = root + "run-01/",
  sha = (b) => createHash("sha256").update(b).digest("hex"),
  load = async (p) => JSON.parse(await readFile(p));
const config = await load(root + "run-01.json"),
  spec = config.specs[0],
  capture = await load(out + "capture.json"),
  native = await load(out + "native-metrics.json"),
  cv = await load(root + "opencv-01/run-01.json"),
  cvControl = await load(root + "opencv-01/control.json"),
  zx = await load(out + "native-zxing-default.json"),
  zxControl = await load(out + "control-zxing-default.json"),
  js = await load(out + "native-jsqr.json"),
  jsControl = await load(out + "control-jsqr.json"),
  summary = await load(out + "native-stroke-summary.json"),
  done = await load(out + "done.json"),
  solid = JSON.parse(
    gunzipSync(await readFile(out + "solid-stroke-probe.json.gz")),
  ),
  diagnostic = await load(out + "native-zxing-errors-diagnostic.json");
assert.equal(spec.payload, "https://example.com/");
assert.equal(spec.matrix.length, 25);
assert(
  capture.repeatExact &&
    !native.automaticRejected &&
    solid.structurePass &&
    summary.passiveReturnsMatch,
);
assert(cvControl.exactControl && zxControl.exact && jsControl.exact);
const ordinary = [
  {
    reader: "OpenCV default",
    exact: cv.exactNative,
    text: cv.text,
    points: cv.points,
  },
  { reader: "ZXing default", exact: zx.exact, results: zx.results },
  { reader: "jsQR unchanged baseline", exact: js.exact, text: js.text },
];
const result = {
  at: new Date().toISOString(),
  phase: 45,
  goal: "unsolved",
  phoneTests: 0,
  phoneCandidates: 0,
  plannedNative: 1,
  completedNative: done.native,
  exactImmediateRepeats: done.repeat,
  newPayloadSources: 1,
  payload: spec.payload,
  encoder: spec.encoder,
  nativePngSha256: capture.pngSha256,
  mechanicalRejected: native.automaticRejected,
  ownerLegibility: "untested",
  agentLegibility:
    "Distinct regular OMW and spaces in native excerpt; fabricated words and huge page do not establish natural prose or normal-page usability",
  ordinary,
  ordinaryNativeProfileCalls: 3,
  exactOrdinaryNativeReturns: ordinary.filter((r) => r.exact).length,
  ordinaryControlCalls: 3,
  exactOrdinaryControlReturns: 3,
  strictNativePass: summary.structurePass,
  nativeIntendedGeometry: summary.correctFinder,
  actualSelectedNative: summary.selected,
  passiveReturnsMatch: summary.passiveReturnsMatch,
  solidStrictPass: solid.structurePass,
  errorReportingDiagnosticReturns: diagnostic.results.length,
  sources: Object.fromEntries(
    await Promise.all(
      [
        "experiments/prose-qr/context-full-payload/analyze.mjs",
        root + "run-01.json",
        out + "capture.json",
        out + "native-metrics.json",
        out + "native-stroke-summary.json",
        out + "done.json",
        root + "opencv-01/run-01.json",
        root + "opencv-01/control.json",
        out + "native-zxing-default.json",
        out + "control-zxing-default.json",
        out + "native-jsqr.json",
        out + "control-jsqr.json",
        out + "native-zxing-errors-diagnostic.json",
      ].map(async (p) => [p, sha(await readFile(p))]),
    ),
  ),
};
await writeFile(
  root + "analysis.json",
  await format(JSON.stringify(result), { parser: "json" }),
  { flag: "wx" },
);
console.log(
  JSON.stringify({
    ordinaryExact: result.exactOrdinaryNativeReturns,
    strictNativePass: result.strictNativePass,
  }),
);

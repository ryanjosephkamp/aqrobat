import { readFile, writeFile, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { format } from "prettier";
import assert from "node:assert/strict";
const sha = (b) => createHash("sha256").update(b).digest("hex"),
  exists = async (p) => {
    try {
      await access(p);
      return true;
    } catch {
      return false;
    }
  },
  phases = process.argv.slice(2).map(Number);
assert(phases.length && phases.every((n) => n === 43));
for (const n of phases) {
  const root = `docs/research/prose-qr/phase-${n}/`,
    refs = ["experiments/prose-qr/session-2026-10-10/analyze-glyph.mjs"],
    get = async (p) => {
      refs.push(p);
      return JSON.parse(await readFile(p));
    };
  const metrics = await get(root + "metrics-01/metrics.json"),
    model = await get(root + "model-01/summary.json"),
    archive = await readFile(root + "model-01/all-models.csv.gz"),
    csv = gunzipSync(archive);
  refs.push(root + "model-01/all-models.csv.gz");
  assert.equal(sha(archive), model.modelArchiveSha256);
  assert.equal(sha(csv), model.modelCSVHash);
  assert.equal(csv.length, model.modelCSVBytes);
  assert.equal(csv.toString().trim().split("\n").length - 1, 8000);
  let result = {
    at: new Date().toISOString(),
    phase: n,
    goal: "unsolved",
    phoneTests: 0,
    phoneCandidates: 0,
    newPayloadSources: 0,
    plannedGlyphResources: 60,
    completedGlyphResources: model.completedGlyphResources,
    conditionalWordValidationResources:
      model.conditionalWordValidationResources,
    sourceWordModels: 8000,
    sourceEligibleWords: model.eligible,
    sourceRejectedBounds: model.rejectedBounds,
    sourceRejectedFlatness: model.rejectedFlatness,
    selected: model.selected,
    wordValidation: model.validation,
    sourceCentralSquareModules: 2.4,
    nominalDiagnosticCentralSquareModules: 3,
    ownerLegibility: "untested",
  };
  if (await exists(root + "run-01/capture.json")) {
    const capture = await get(root + "run-01/capture.json"),
      pixels = await get(root + "run-01/native-pixels.json"),
      native = await get(root + "run-01/native-metrics.json"),
      trace = await get(root + "run-01/native-stroke-summary.json"),
      cv = await get(root + "opencv-01/run-01.json"),
      control = await get(root + "opencv-01/control.json"),
      replica = await get(root + "opencv-01/run-01-replica.json"),
      zx = await get(root + "run-01/native-zxing-errors-diagnostic.json");
    assert(capture.repeatExact);
    assert.equal(capture.pngSha256, capture.repeatSha256);
    assert.equal(sha(await readFile(pixels.path)), pixels.pngSha256);
    assert(control.exactControl);
    result = {
      ...result,
      plannedNative: 1,
      completedNative: 1,
      unattemptedNative: 0,
      exactImmediateRepeats: 1,
      mechanicalRejected: native.automaticRejected,
      nativeFont: native.style,
      clearance: native.clearance,
      minGap: native.minGap,
      nativePngSha256: pixels.pngSha256,
      nativeRGBASha256: pixels.rgbaSha256,
      strictNativePass: trace.structurePass,
      intendedOrdinaryNativeGeometry: trace.correctFinder,
      passiveReturnsMatch: trace.passiveReturnsMatch,
      actualSelectedNative: trace.selected,
      ordinaryOpenCVQuad: cv.points,
      ordinaryControlExact: control.exactControl,
      errorReportingDiagnosticReturns: zx.results.length,
      completeSampledDiagnostics: zx.results.filter(
        (r) => r.finderAudit?.complete,
      ).length,
      replicaExpectedRegionRays: replica.expectedRegionRays,
      classification:
        "Full native reader inputs unchanged; source/native stroke/sample/replica gates separate",
    };
  } else {
    assert(!model.nativeSlotEligible);
    result = {
      ...result,
      plannedNative: 1,
      completedNative: 0,
      unattemptedNative: 1,
      rejection: await get(root + "model-01/rejection.json"),
      classification:
        "Source resource rejection; conditional native slot unattempted, not a scan failure",
    };
  }
  result.sources = Object.fromEntries(
    await Promise.all(refs.map(async (p) => [p, sha(await readFile(p))])),
  );
  await writeFile(
    root + "analysis.json",
    await format(JSON.stringify(result), { parser: "json" }),
    { flag: "wx" },
  );
  console.log(
    JSON.stringify({
      phase: n,
      native: result.completedNative,
      ordinaryQuad: result.ordinaryOpenCVQuad ?? null,
      selected: result.selected
        ? {
            dark: result.selected.dark,
            light: result.selected.light,
            score: result.selected.score,
          }
        : null,
      goal: "unsolved",
    }),
  );
}

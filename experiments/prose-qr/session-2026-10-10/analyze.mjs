import { readFile, writeFile, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import { format } from "prettier";
import assert from "node:assert/strict";
const sha = (b) => createHash("sha256").update(b).digest("hex"),
  read = async (p) => JSON.parse(await readFile(p)),
  exists = async (p) => {
    try {
      await access(p);
      return true;
    } catch {
      return false;
    }
  },
  json = async (p, v) =>
    writeFile(p, await format(JSON.stringify(v), { parser: "json" }), {
      flag: "wx",
    });
const here = "experiments/prose-qr/session-2026-10-10/analyze.mjs";
function selected(q) {
  return Object.fromEntries(
    Object.entries(q.selected).map(([k, v]) => [
      k,
      {
        point: v.point,
        scoring: v.scoring,
        quad: v.quad,
        quadBalance: v.quadBalance,
        nominalSpanFraction: v.nominalSpanFraction,
        stableWideRowFraction: v.stableWideRowFraction,
        trueGeometricAxes: v.geometric.axes,
        centralSpanBalance: v.geometric.centralSpanBalance,
      },
    ]),
  );
}
const phases = process.argv.slice(2).map(Number);
assert(
  phases.length &&
    phases.every((n) => [35, 36, 37, 38, 39, 40, 41, 42].includes(n)),
);
for (const n of phases) {
  const root = `docs/research/prose-qr/phase-${n}/`,
    files = [here],
    get = async (p) => {
      files.push(p);
      return read(p);
    };
  let result = {
    at: new Date().toISOString(),
    phase: n,
    goal: "unsolved",
    newPayloadSources: 0,
    phoneTests: 0,
    phoneCandidates: 0,
  };
  if ([35, 36, 38, 41, 42].includes(n)) {
    const capture = await get(root + "run-01/capture.json"),
      pixels = await get(root + "run-01/native-pixels.json"),
      metrics = await get(root + "run-01/native-metrics.json"),
      cv = await get(root + "opencv-01/run-01.json"),
      control = await get(root + "opencv-01/control.json"),
      replica = await get(root + "opencv-01/run-01-replica.json"),
      zx = await get(root + "run-01/native-zxing-errors-diagnostic.json");
    assert(capture.repeatExact);
    assert.equal(capture.pngSha256, capture.repeatSha256);
    assert.equal(capture.pngSha256, pixels.pngSha256);
    assert.equal(sha(await readFile(pixels.path)), pixels.pngSha256);
    assert(control.exactControl);
    const aborted = await exists(root + "run-01/aborted.json"),
      tracePath =
        n === 35
          ? "docs/research/prose-qr/phase-37/replay-01/native-summary.json"
          : n === 36
            ? "docs/research/prose-qr/phase-39/replay-01/native-summary.json"
            : root + "run-01/native-stroke-summary.json",
      trace = await get(tracePath);
    result = {
      ...result,
      plannedNative: 1,
      completedNativeRenderings: 1,
      exactImmediateRepeats: 1,
      pipelineDone: aborted ? 0 : 1,
      pipelineAborts: aborted ? 1 : 0,
      nativePngSha256: pixels.pngSha256,
      nativeRGBASha256: pixels.rgbaSha256,
      mechanicalRejected: metrics.automaticRejected,
      nativeFont: metrics.style,
      clearance: metrics.clearance,
      minGap: metrics.minGap,
      ownerLegibility: "untested",
      agentLegibility:
        "Native excerpt only; see README. Not semantic prose, full document or portable acceptance",
      ordinaryOpenCVNativeCalls: 1,
      ordinaryOpenCVQuad: cv.points,
      ordinaryOpenCVControlExact: control.exactControl,
      errorReportingDiagnosticReturns: zx.results.length,
      completeSampledDiagnostics: zx.results.filter(
        (r) => r.finderAudit?.complete,
      ).length,
      nativeFullTraceDuringOriginalRun: aborted
        ? "unsaved at reserve abort"
        : "saved",
      separateReadOnlyTrace: aborted ? tracePath : null,
      originalUnattemptedCalls: aborted
        ? ["final solid control after native trace-save abort"]
        : [],
      strictNativePass: trace.structurePass,
      intendedOrdinaryNativeGeometry: trace.correctFinder,
      passiveReturnsMatch: trace.passiveReturnsMatch,
      actualSelectedNative: selected(trace),
      replicaExpectedRegionRays: replica.expectedRegionRays,
      replicaClassification: replica.classification,
    };
    if (aborted) result.abort = await get(root + "run-01/aborted.json");
    if (n === 41 || n === 42)
      result.sourceResourceSelection = (
        await get(root + "metrics-01/metrics.json")
      ).selected;
  } else if ([37, 39].includes(n)) {
    const native = await get(root + "replay-01/native-summary.json"),
      solid = await get(root + "replay-01/solid-summary.json"),
      packed = await get(root + "replay-01/native-probe-pack.json"),
      done = await get(root + "replay-01/done.json");
    assert(solid.structurePass);
    assert(packed.fullReconstructionExact);
    assert.equal(done.nativeGenerations, 0);
    result = {
      ...result,
      plannedSavedNativeReplays: 1,
      retainedSavedNativeReplays: 1,
      nativeGenerations: 0,
      firstRetainedFullTrace: true,
      strictNativePass: native.structurePass,
      intendedOrdinaryNativeGeometry: native.correctFinder,
      passiveReturnsMatch: native.passiveReturnsMatch,
      actualSelectedNative: selected(native),
      scoredRuns: native.scoredRunCount,
      quads: native.quadCount,
      solidStrictPass: solid.structurePass,
      originalFullJSONBytes: packed.originalJSONBytes,
      originalFullJSONSha256: packed.originalJSONSha256,
      packedBytes: packed.coreGzipBytes + packed.geometryGzipBytes,
      fullReconstructionExact: true,
    };
    if (n === 37) {
      const fixtures = await get(root + "fixtures-01/done.json");
      assert.equal(fixtures.exactRoundtrips, 4);
      result.codecFixtures = fixtures;
    }
  } else if (n === 40) {
    const solid = await get(root + "run-01/solid.json"),
      full = await get(root + "run-01/full.json");
    assert(solid.points);
    assert(full.exactURLControl);
    result = {
      ...result,
      nativeGenerations: 0,
      plannedReadOnlyCalls: 2,
      completedCalls: 2,
      solidFinderOnlyOrdinaryQuad: solid.points,
      solidDecodedText: solid.text,
      fullControlExact: full.exactURLControl,
    };
  }
  result.sources = Object.fromEntries(
    await Promise.all(files.map(async (p) => [p, sha(await readFile(p))])),
  );
  await json(root + "analysis.json", result);
  console.log(
    JSON.stringify({
      phase: n,
      strictNativePass: result.strictNativePass,
      ordinaryQuad: result.ordinaryOpenCVQuad ?? null,
      goal: result.goal,
    }),
  );
}

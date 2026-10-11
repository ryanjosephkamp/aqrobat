import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { format } from "prettier";
import assert from "node:assert/strict";
const root = "docs/research/prose-qr/session-2026-10-10/",
  sha = (b) => createHash("sha256").update(b).digest("hex"),
  phases = [];
for (let n = 32; n <= 48; n++) {
  const path = `docs/research/prose-qr/phase-${n}/analysis.json`,
    a = JSON.parse(await readFile(path));
  assert.equal(a.goal, "unsolved");
  assert.equal(a.phoneTests, 0);
  phases.push({
    phase: n,
    path,
    sha256: sha(await readFile(path)),
    analysis: a,
  });
}
const nativePhases = [32, 33, 35, 36, 38, 41, 42, 43, 45],
  native = phases.filter((r) => nativePhases.includes(r.phase));
const count = (a) => a.completedNative ?? a.completedNativeRenderings;
const completedNative = native.reduce((n, r) => n + count(r.analysis), 0),
  repeats = native.reduce((n, r) => n + r.analysis.exactImmediateRepeats, 0);
assert.equal(completedNative, 11);
assert.equal(repeats, 11);
const payload = phases.find((r) => r.phase === 45).analysis,
  other = phases.find((r) => r.phase === 46).analysis,
  scale = phases.find((r) => r.phase === 47).analysis,
  vision = phases.find((r) => r.phase === 48).analysis;
const result = {
  at: new Date().toISOString(),
  goal: "unsolved",
  phoneTests: 0,
  phoneCandidates: 0,
  plannedNativeSlots: 12,
  completedNativeRenderings: completedNative,
  exactImmediateRepeats: repeats,
  unattemptedNativeSlots: 1,
  nativePipelineAborts: 3,
  sourceProducerErrors: 1,
  newFullPayloadSources: 1,
  regularNativeRenderings: 10,
  intrinsicallyHeavyImpactRenderings: 1,
  sourceGlyphPositionResources: 60,
  selectedWordValidationResources: 2,
  sourceWordModels: 8000,
  stableOutsideOrdinaryFinderOutline: true,
  ordinaryFinderOnlyReplayCalls: 2,
  identicalReplayCornerDelta: 0,
  fullPayload: payload.payload,
  encoder: payload.encoder,
  fullPayloadOrdinaryProfiles: [
    ...payload.ordinary,
    ...other.ordinary.filter((r) => r.reader.startsWith("ZBar")),
    ...vision.ordinary,
  ],
  exactOrdinaryNativeReturns:
    payload.exactOrdinaryNativeReturns +
    other.exactOrdinaryNativeReturns +
    vision.exactOrdinaryNativeReturns,
  ordinaryNativeImplementations: 5,
  ordinaryNativeProfilesWithKnownOutcome: [
    ...payload.ordinary,
    ...other.ordinary.filter((r) => r.reader.startsWith("ZBar")),
    ...vision.ordinary,
  ].filter((r) => typeof r.exact === "boolean").length,
  fullPayloadReaderSlotsAcrossAttempts: 12,
  fullPayloadRetainedRowsAcrossAttempts:
    6 + other.completedResultRows + vision.retainedResultRows,
  conventionalExactControls:
    payload.exactOrdinaryControlReturns +
    other.exactOrdinaryControls +
    vision.exactOrdinaryControls,
  initialVisionUnknownSlots: 2,
  finalVisionUnknownSlots: vision.unknownSlots,
  nativeStrictPasses: 0,
  scaleDiagnostic: scale.summary,
  productChanges: false,
  npmPrivate: true,
  priorPhoneFailuresPreserved: true,
  phases: phases.map(({ phase, path, sha256 }) => ({ phase, path, sha256 })),
  sources: {
    "experiments/prose-qr/session-2026-10-10/aggregate.mjs": sha(
      await readFile("experiments/prose-qr/session-2026-10-10/aggregate.mjs"),
    ),
  },
};
await writeFile(
  root + "analysis.json",
  await format(JSON.stringify(result), { parser: "json" }),
  { flag: "wx" },
);
console.log(
  JSON.stringify({
    completedNative,
    repeats,
    ordinaryExact: result.exactOrdinaryNativeReturns,
    controls: result.conventionalExactControls,
  }),
);

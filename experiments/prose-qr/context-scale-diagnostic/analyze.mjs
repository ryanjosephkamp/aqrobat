import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { format } from "prettier";
import assert from "node:assert/strict";
const root = "docs/research/prose-qr/phase-47/",
  sha = (b) => createHash("sha256").update(b).digest("hex"),
  refs = [root + "run-01/native.json", root + "run-01/control.json"],
  rows = await Promise.all(
    refs.map(async (p) => JSON.parse(await readFile(p))),
  );
assert(rows.every((r) => !r.error));
const [native, control] = rows,
  full = native.replicas.full,
  init = native.replicas.init;
const summary = {
  nativeFullCenterMismatches: full.centerMismatches,
  nativeInitCenterMismatches: init.centerMismatches,
  centerDenominator: 625,
  nativeFullOccupancy: full.occupancy,
  nativeInitOccupancy: init.occupancy,
  controlFullCenterMismatches: control.replicas.full.centerMismatches,
  controlInitCenterMismatches: control.replicas.init.centerMismatches,
  description: `For the saved native payload, the full-resolution threshold replica disagrees with ${full.centerMismatches} of 625 nominal centers; the 512-pixel initialization replica disagrees with ${init.centerMismatches}. The conventional control differs at ${control.replicas.full.centerMismatches} and ${control.replicas.init.centerMismatches} centers respectively. This suggests a scale-related gap, but neither grid is a decoder return or proof of the precise internal failure.`,
};
const result = {
  at: new Date().toISOString(),
  phase: 47,
  goal: "unsolved",
  phoneTests: 0,
  phoneCandidates: 0,
  plannedSavedInputs: 2,
  completedSavedInputs: 2,
  decoderCalls: 0,
  newNativeSources: 0,
  summary,
  expectedRegionNativeReplicaRuns: full.expectedRegionRays,
  classification:
    "Post-return source-geometry replica diagnosis only; no repaired pixels, extraction or reader input",
  sources: Object.fromEntries(
    await Promise.all(
      [
        "experiments/prose-qr/context-scale-diagnostic/analyze.mjs",
        ...refs,
        root + "run-01/manifest.json",
        root + "reference-01/control.json",
      ].map(async (p) => [p, sha(await readFile(p))]),
    ),
  ),
};
await writeFile(
  root + "analysis.json",
  await format(JSON.stringify(result), { parser: "json" }),
  { flag: "wx" },
);
console.log(JSON.stringify(summary));

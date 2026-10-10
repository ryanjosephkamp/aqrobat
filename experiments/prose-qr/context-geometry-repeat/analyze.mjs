import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { format } from "prettier";
import assert from "node:assert/strict";
const root = "docs/research/prose-qr/phase-44/",
  paths = ["native-1", "native-2", "control"].map(
    (id) => root + "run-01/" + id + ".json",
  ),
  rows = await Promise.all(
    paths.map(async (p) => JSON.parse(await readFile(p))),
  ),
  sha = (b) => createHash("sha256").update(b).digest("hex");
assert.equal(rows.length, 3);
assert(rows.every((r) => !r.error));
assert(rows.slice(0, 2).every((r) => r.stableIntendedOutline && r.text === ""));
assert(rows[2].exactURLControl);
const result = {
  phase: 44,
  goal: "unsolved",
  phoneTests: 0,
  phoneCandidates: 0,
  plannedNativeReplays: 2,
  completedNativeReplays: 2,
  plannedControls: 1,
  completedControls: 1,
  stableIntendedOutlines: 2,
  maxReplayCornerDelta: Math.max(
    ...rows.slice(0, 2).map((r) => r.maxCornerReplayDelta),
  ),
  fullNativeInputUnchanged: true,
  encodedPayloads: 0,
  classification:
    "Two read-only repeats of one ordinary implementation; intended outline only, no payload or phone acceptance",
  sources: Object.fromEntries(
    await Promise.all(
      [
        "experiments/prose-qr/context-geometry-repeat/analyze.mjs",
        ...paths,
        root + "run-01/manifest.json",
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
  JSON.stringify({ stableOutlines: 2, exactControl: true, payloads: 0 }),
);

import { readFile, writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { runMetric } from "./metrics.mjs";
import { sha } from "./common.mjs";
const dir =
  "docs/research/prose-qr/integrated-2026-10-10/empirical/payload-04/continuous-native";
const compressed = await readFile(dir + "/passive-full.json.gz"),
  raw = gunzipSync(compressed),
  p = JSON.parse(raw),
  capture = JSON.parse(await readFile(dir + "/capture.json"));
const centers = capture.geometry.counters;
const branches = p.scans.map((s) => ({
  branch: s.branch,
  firstSelected: s.selectedFirstLocation,
  firstStrict: s.strictPass,
  totalScoredRuns: s.allScoredRuns.length,
  totalQuads: s.allQuads.length,
  nearSourceOrnaments: centers.map((center) => ({
    center,
    radius: capture.geometry.unit,
    records: s.allScoredRuns
      .filter(
        (r) =>
          Math.hypot(r.point.x - center.x, r.point.y - center.y) <
          capture.geometry.unit,
      )
      .map((r) => ({
        ...r,
        metric: runMetric({
          horizontal: r.horizontal,
          vertical: r.vertical,
          diagonalDown: r.diagonalDown,
          diagonalUp: r.diagonalUp,
        }),
      })),
    quads: s.allQuads
      .filter(
        (q) =>
          Math.hypot(
            (q.top.startX + q.top.endX + q.bottom.startX + q.bottom.endX) / 4 -
              center.x,
            (q.top.y + q.bottom.y + 1) / 2 - center.y,
          ) < capture.geometry.unit,
      )
      .map((q) => {
        const top = q.top.endX - q.top.startX,
          bottom = q.bottom.endX - q.bottom.startX,
          height = q.bottom.y - q.top.y + 1;
        return {
          ...q,
          topWidth: top,
          bottomWidth: bottom,
          height,
          balance:
            Math.min(top, bottom, height) / Math.max(top, bottom, height),
        };
      }),
  })),
}));
const result = {
  schema: "aqrobat.integrated.retained-profile-analysis.v1",
  atUtc: new Date().toISOString(),
  sourceProfileGzipSha256: sha(compressed),
  sourceRawSha256: sha(raw),
  sourcePngSha256: p.pngSha256,
  codeSha256: sha(
    await readFile(
      "experiments/prose-qr/integrated-2026-10-10/empirical/analyze-continuous-profile.mjs",
    ),
  ),
  newCaptures: 0,
  newReaderCalls: 0,
  newProfiles: 0,
  newBinarizerCalls: 0,
  classification:
    "Pure arithmetic over retained full passive records. Source-near scored candidates explain a failure; they never replace ordinary first selection or strict eligibility.",
  branches,
};
await writeFile(
  dir + "/retained-profile-analysis.json",
  JSON.stringify(result, null, 2) + "\n",
  { flag: "wx" },
);
console.log(
  JSON.stringify({
    branches: branches.map((b) => ({
      branch: b.branch,
      firstStrict: b.firstStrict,
      sourceOrnaments: b.nearSourceOrnaments.map((o) => ({
        records: o.records.length,
        worstRMS: o.records.map((r) => r.metric.worstRMS),
        quadBalances: o.quads.map((q) => q.balance),
      })),
    })),
  }),
);

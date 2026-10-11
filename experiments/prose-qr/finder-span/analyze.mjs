import { readFile, writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { format } from "prettier";
import assert from "node:assert/strict";
const root = "docs/research/prose-qr/phase-07/",
  hash = (b) => createHash("sha256").update(b).digest("hex"),
  joinBytes = await readFile(root + "join-audit-01.json.gz"),
  joins = JSON.parse(gunzipSync(joinBytes)),
  spanBytes = await readFile(root + "span-audit-01.json.gz"),
  spans = JSON.parse(gunzipSync(spanBytes));
const observations = joins.results.map((r) => ({
  id: r.id,
  path: r.path,
  corners: Object.fromEntries(
    Object.entries(r.expectedPostProbe).map(([name, c]) => {
      const selected = r.largeJoinEvents
        .filter(
          (e) =>
            Math.abs(e.line.y - c.y) < 4 &&
            Math.abs((e.line.startX + e.line.endX) / 2 - c.x) < 35,
        )
        .sort((a, b) => Math.abs(a.line.y - c.y) - Math.abs(b.line.y - c.y))[0];
      assert(selected && selected.chosenBefore);
      const inheritedTop = selected.chosenBefore.top,
        finalQuads = r.allEligibleQuads.filter(
          (q) => JSON.stringify(q.top) === JSON.stringify(inheritedTop),
        );
      assert(finalQuads.length);
      return [
        name,
        {
          expectedCenter: c,
          selectedJoin: selected,
          inheritedTopWidth: inheritedTop.endX - inheritedTop.startX,
          middleRowWidth: selected.line.endX - selected.line.startX,
          finalQuads: finalQuads.map((q) => {
            const topWidth = q.top.endX - q.top.startX,
              bottomWidth = q.bottom.endX - q.bottom.startX,
              height = q.bottom.y - q.top.y + 1,
              x =
                (q.top.startX + q.top.endX + q.bottom.startX + q.bottom.endX) /
                4,
              y = (q.top.y + q.bottom.y + 1) / 2,
              size = (topWidth + bottomWidth + height) / 3;
            return {
              quad: q,
              topWidth,
              bottomWidth,
              height,
              computedSize: size,
              computedCenter: { x, y },
              matchingScoredPoints: r.allScoredPoints.filter(
                (p) => p.x === x && p.y === y,
              ),
            };
          }),
        },
      ];
    }),
  ),
}));
const spanSummary = spans.results.map((r) => ({
  id: r.id,
  scoredPointCount: r.scoredPointCount,
  instrumentedReturnsMatch: r.instrumentedLocationsMatch,
  qualifyingRowWindow: Object.fromEntries(
    Object.entries(r.rowBands).map(([k, v]) => [
      k,
      v.longestConsecutiveQualifyingRowsInWindow,
    ]),
  ),
  nearCenterMaximumScoredSize: Object.fromEntries(
    Object.entries(r.pointsWithinOneModule).map(([k, v]) => [
      k,
      Math.max(0, ...v.map((p) => p.size)),
    ]),
  ),
  discardedLargeShortQuads: Object.fromEntries(
    Object.entries(r.discardedLargeShortQuadsNearCenters).map(([k, v]) => [
      k,
      v.length,
    ]),
  ),
}));
await writeFile(
  root + "analysis.json",
  await format(
    JSON.stringify({
      at: new Date().toISOString(),
      sourceScriptSha256: hash(await readFile(new URL(import.meta.url))),
      inputHashes: {
        "join-audit-01.json.gz": hash(joinBytes),
        "span-audit-01.json.gz": hash(spanBytes),
      },
      spanSummary,
      observations,
      interpretation:
        "The observed wide middle row is joined to an older narrow quad, which finishes narrow again. Its endpoint/height size remains small. Stable two-dimensional finder spans are unresolved; these local observations do not prove a universal cause or decoding.",
      newCaptures: 0,
      newPayloadProbes: 0,
    }),
    { parser: "json" },
  ),
  { flag: "wx" },
);
console.log(
  JSON.stringify(
    observations.map((r) => ({
      id: r.id,
      corners: Object.fromEntries(
        Object.entries(r.corners).map(([k, v]) => [
          k,
          v.finalQuads.map((q) => ({
            top: q.topWidth,
            middle: v.middleRowWidth,
            bottom: q.bottomWidth,
            size: q.computedSize,
          })),
        ]),
      ),
    })),
  ),
);

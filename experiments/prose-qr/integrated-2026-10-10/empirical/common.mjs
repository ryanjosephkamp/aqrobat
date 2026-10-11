import { createHash } from "node:crypto";
export const sha = (b) => createHash("sha256").update(b).digest("hex");
export const strict = (s) =>
  s.postReturnIntendedGeometry[0]?.intendedGeometry === true &&
  Object.keys(s.selected).length === 3 &&
  Object.values(s.selected).every(
    (p) =>
      p.quadBalance >= 0.8 &&
      p.nominalSpanFraction >= 0.8 &&
      p.stableRows?.fraction >= 0.8 &&
      p.records.length > 0 &&
      p.records.every(
        (r) => r.metric.completeAxes === 4 && r.metric.worstRMS <= 0.35,
      ) &&
      p.geometric.completeAxes === 4 &&
      p.geometric.worstRMS <= 0.35,
  );

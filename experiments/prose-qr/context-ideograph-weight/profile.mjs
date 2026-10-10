import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { ordinaryBinarize } from "../glyph-geometry/diagnostic.mjs";
import { geometricRuns } from "../context-letter-counters/geometry.mjs";
import { runMetric } from "../finder-runs/probe.mjs";
import { sha } from "./common.mjs";
export function profile(path, center) {
  const data = execFileSync(
    "python3",
    [
      "-c",
      "import cv2,sys;a=cv2.imread(sys.argv[1]);sys.stdout.buffer.write(cv2.cvtColor(a,cv2.COLOR_BGR2RGBA).tobytes())",
      path,
    ],
    { maxBuffer: 1000000 },
  );
  const p = { width: 192, height: 192, data: new Uint8ClampedArray(data) },
    bin = ordinaryBinarize(p);
  const inverted = { width: 192, height: 192, get: (x, y) => !bin.get(x, y) };
  const point = { x: Math.round(center[0]), y: Math.round(center[1]) },
    runs = geometricRuns(inverted, point),
    metric = runMetric(runs);
  return {
    classification:
      "Native glyph-resource ordinary binarization plus inverted source-model polarity; not acceptance-reader selection or payload recovery",
    pngSha256: sha(readFileSync(path)),
    rgbaSha256: sha(data),
    point,
    centerBlack: inverted.get(point.x, point.y),
    runs,
    metric,
    unit: (metric.axes.horizontal.scale + metric.axes.vertical.scale) / 2,
  };
}

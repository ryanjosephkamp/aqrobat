import { build } from "../flow/layout.mjs";
import { captureBatch } from "./capture.mjs";
const parameters = [];
function add(font, charsPerModule, gray, payload = "AQROBAT-TEST") {
  parameters.push({
    id: `color-${String(parameters.length + 1).padStart(3, "0")}`,
    payload,
    font,
    content: "story",
    charsPerModule,
    linesPerModule: charsPerModule / 2,
    fontSize: 20,
    quiet: 5,
    ecc: "M",
    boost: false,
    darkWeight: 400,
    lightWeight: 400,
    gray,
    track: "color-only",
  });
}
for (const font of ["Menlo", "Courier New"])
  for (const chars of [2, 4, 6])
    for (const gray of [120, 180]) add(font, chars, gray);
for (const chars of [4, 6])
  for (const gray of [120, 180])
    add("Courier New", chars, gray, "https://example.com/");
for (const font of ["Menlo", "Courier New"]) add(font, 6, 0);
await captureBatch("color-01", parameters, build, [
  "experiments/prose-qr/unweighted/color.mjs",
  "experiments/prose-qr/unweighted/capture.mjs",
  "experiments/prose-qr/flow/layout.mjs",
]);

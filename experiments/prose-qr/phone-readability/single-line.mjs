import { readFile } from "node:fs/promises";
import { captureBatch } from "./capture.mjs";
import { proportionalLayout } from "./proportional.mjs";
const metrics = JSON.parse(
    await readFile("docs/research/prose-qr/phase-04/font-metrics.json", "utf8"),
  ),
  specs = [];
for (const leading of [1, 1.2])
  for (const gray of [180, 220])
    for (const upper of [false, true])
      specs.push({
        id: `single-${specs.length + 1}`,
        payload: "https://example.com/",
        font: "Impact",
        fontSize: 20,
        leading,
        linesPerModule: 1,
        quiet: 5,
        ecc: "Q",
        upper,
        gray,
        blur: 0,
        track: "Native 20px heavy-face story; one text line per QR region",
      });
await captureBatch("single-01", specs, (s) => proportionalLayout(s, metrics), [
  "experiments/prose-qr/phone-readability/capture.mjs",
  "experiments/prose-qr/phone-readability/proportional.mjs",
  "experiments/prose-qr/phone-readability/single-line.mjs",
  "docs/research/prose-qr/phase-04/font-metrics.json",
]);

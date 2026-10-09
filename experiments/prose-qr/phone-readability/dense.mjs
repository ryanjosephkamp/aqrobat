import { readFile } from "node:fs/promises";
import { captureBatch } from "./capture.mjs";
import { proportionalLayout } from "./proportional.mjs";
const metrics = JSON.parse(
  await readFile("docs/research/prose-qr/phase-04/font-metrics.json", "utf8"),
);
const specs = [];
for (const font of ["Impact", "Arial Black"])
  for (const upper of [false, true])
    for (const gray of [180, 220])
      for (const blur of [0, 1.5])
        specs.push({
          id: `dense-${String(specs.length + 1).padStart(2, "0")}`,
          payload: "https://example.com/",
          font,
          fontSize: 20,
          linesPerModule: 2,
          quiet: 5,
          ecc: "Q",
          upper,
          gray,
          blur,
          track: "Uniform naturally heavy face, color-modulated prose",
        });
for (const font of ["Impact", "Arial Black"])
  for (const outputSize of [400, 656, 900])
    specs.push({
      id: `dense-${String(specs.length + 1).padStart(2, "0")}`,
      payload: "https://example.com/",
      font,
      fontSize: 20,
      linesPerModule: 2,
      quiet: 5,
      ecc: "Q",
      upper: true,
      gray: 220,
      blur: 0,
      outputSize,
      track: "Uniform heavy-face prose, browser display",
    });
await captureBatch("dense-01", specs, (s) => proportionalLayout(s, metrics), [
  "experiments/prose-qr/phone-readability/capture.mjs",
  "experiments/prose-qr/phone-readability/proportional.mjs",
  "experiments/prose-qr/phone-readability/dense.mjs",
  "docs/research/prose-qr/phase-04/font-metrics.json",
]);

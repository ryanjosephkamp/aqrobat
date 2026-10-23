import { readFile } from "node:fs/promises";
import { captureBatch } from "./capture.mjs";
import { proportionalLayout } from "./proportional.mjs";
const metrics = JSON.parse(
    await readFile("docs/research/prose-qr/phase-04/font-metrics.json", "utf8"),
  ),
  specs = [];
for (const font of ["Impact", "Arial Black"])
  for (const gray of [238, 246])
    for (const upper of [false, true])
      specs.push({
        id: `quiet-${specs.length + 1}`,
        payload: "https://example.com/",
        font,
        fontSize: 20,
        leading: 1,
        linesPerModule: 1,
        quiet: 5,
        ecc: "Q",
        upper,
        gray,
        blur: 0,
        track:
          "Native text with near-white foreground in light regions; visibility compromise, no invisible text or underlay",
      });
await captureBatch(
  "quiet-ink-01",
  specs,
  (s) => proportionalLayout(s, metrics),
  [
    "experiments/prose-qr/phone-readability/capture.mjs",
    "experiments/prose-qr/phone-readability/proportional.mjs",
    "experiments/prose-qr/phone-readability/quiet-ink.mjs",
    "docs/research/prose-qr/phase-04/font-metrics.json",
  ],
);

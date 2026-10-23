import { readFile } from "node:fs/promises";
import { captureBatch } from "./capture.mjs";
import { proportionalLayout } from "./proportional.mjs";
import { build } from "../flow/layout.mjs";
const metrics = JSON.parse(
  await readFile("docs/research/prose-qr/phase-04/font-metrics.json", "utf8"),
);
const specs = [];
for (const outputSize of [70, 105, 140])
  specs.push({
    id: `small-${specs.length + 1}`,
    payload: "https://example.com/",
    font: "Impact",
    fontSize: 20,
    leading: 1,
    linesPerModule: 1,
    quiet: 5,
    ecc: "Q",
    gray: 246,
    outputSize,
    track:
      "Actual small browser presentation, not native-size legibility or phone acceptance",
  });
for (const outputSize of [140, 210, 280])
  specs.push({
    id: `small-${specs.length + 1}`,
    payload: "https://example.com/",
    font: "Menlo",
    fontSize: 20,
    charsPerModule: 4,
    linesPerModule: 2,
    content: "story",
    darkWeight: 700,
    lightWeight: 400,
    quiet: 5,
    ecc: "Q",
    boost: false,
    gray: 230,
    outputSize,
    track:
      "Actual small browser presentation with variable weight/color, not plain ASCII or native-size legibility",
  });
await captureBatch(
  "small-01",
  specs,
  (s, oldMetrics) =>
    s.font === "Impact" ? proportionalLayout(s, metrics) : build(s, oldMetrics),
  [
    "experiments/prose-qr/phone-readability/small-view.mjs",
    "experiments/prose-qr/phone-readability/capture.mjs",
    "experiments/prose-qr/phone-readability/proportional.mjs",
    "experiments/prose-qr/flow/layout.mjs",
    "docs/research/prose-qr/phase-04/font-metrics.json",
  ],
);

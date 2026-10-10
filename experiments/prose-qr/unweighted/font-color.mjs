import { readFile } from "node:fs/promises";
import { captureBatch } from "./capture.mjs";
import { build } from "../flow/layout.mjs";
const extra = JSON.parse(
  await readFile("docs/research/prose-qr/phase-03/font-metrics.json", "utf8"),
);
const parameters = [];
for (const font of ["Monaco", "Courier"])
  for (const gray of [120, 180])
    parameters.push({
      id: `font-color-${parameters.length + 1}`,
      payload: "AQROBAT-TEST",
      font,
      content: "story",
      charsPerModule: 4,
      linesPerModule: 2,
      fontSize: 20,
      quiet: 5,
      ecc: "M",
      boost: false,
      darkWeight: 400,
      lightWeight: 400,
      gray,
      track: "color-only",
    });
await captureBatch(
  "font-color-01",
  parameters,
  (spec, m) =>
    build(spec, {
      ...m,
      fonts: { ...m.fonts, ...extra.fonts },
      glyphs: { ...m.glyphs, ...extra.glyphs },
    }),
  [
    "experiments/prose-qr/unweighted/font-color.mjs",
    "experiments/prose-qr/unweighted/capture.mjs",
    "experiments/prose-qr/flow/layout.mjs",
    "docs/research/prose-qr/phase-03/font-metrics.json",
  ],
);

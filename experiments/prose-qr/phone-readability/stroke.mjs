import { readFile } from "node:fs/promises";
import { captureBatch } from "./capture.mjs";
import { proportionalLayout } from "./proportional.mjs";
const metrics = JSON.parse(
  await readFile("docs/research/prose-qr/phase-04/font-metrics.json", "utf8"),
);
const specs = [];
for (const font of ["Impact", "Arial Black"])
  for (const stroke of [1, 2])
    specs.push({
      id: `stroke-${specs.length + 1}`,
      payload: "https://example.com/",
      font,
      fontSize: 20,
      leading: 1,
      linesPerModule: 1,
      quiet: 5,
      ecc: "Q",
      upper: false,
      gray: 246,
      stroke,
      track:
        "Visible glyph outlining and faint text: styled diagnostic, not plain ASCII or a readability pass",
    });
await captureBatch(
  "stroke-01",
  specs,
  (s) => {
    const l = proportionalLayout(s, metrics);
    l.markup = l.markup.replaceAll(
      "color:rgb(0,0,0)",
      `color:rgb(0,0,0);-webkit-text-stroke:${s.stroke}px currentColor;paint-order:stroke fill`,
    );
    l.structural.visibleGlyphStroke = s.stroke;
    l.structural.readability =
      "Faint light-region letters and outlined dark-region letters; needs inspection";
    return l;
  },
  [
    "experiments/prose-qr/phone-readability/stroke.mjs",
    "experiments/prose-qr/phone-readability/capture.mjs",
    "experiments/prose-qr/phone-readability/proportional.mjs",
    "docs/research/prose-qr/phase-04/font-metrics.json",
  ],
);

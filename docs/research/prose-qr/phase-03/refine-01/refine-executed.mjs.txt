import { readFile } from "node:fs/promises";
import { captureBatch } from "./capture.mjs";
import { plainLayout } from "./plain-layout.mjs";
import { build } from "../flow/layout.mjs";
const parameters = [];
const add = (s) =>
  parameters.push({
    id: `refine-${String(parameters.length + 1).padStart(3, "0")}`,
    payload: "AQROBAT-TEST",
    font: "Menlo",
    content: "fabricated",
    caseMode: "word-caps",
    charsPerModule: 4,
    linesPerModule: 2,
    fontSize: 20,
    quiet: 5,
    ecc: "Q",
    vowelEvery: 4,
    topChoices: 1,
    track: "plain-black",
    ...s,
  });
for (const topChoices of [2, 3])
  for (const vowelEvery of [3, 4]) add({ topChoices, vowelEvery });
for (const payload of [
  "https://example.com/",
  "HELLO WORLD",
  "https://example.org/a",
])
  add({ payload });
for (const font of ["Monaco", "Courier"])
  for (const content of ["fabricated", "dictionary"]) add({ font, content });
for (const font of ["Monaco", "Courier"])
  for (const gray of [120, 180])
    add({
      font,
      content: "story",
      darkWeight: 400,
      lightWeight: 400,
      gray,
      charsPerModule: 4,
      linesPerModule: 2,
      ecc: "M",
      track: "color-only",
    });
const extra = JSON.parse(
  await readFile("docs/research/prose-qr/phase-03/font-metrics.json", "utf8"),
);
function builder(spec, m) {
  const metrics = {
    ...m,
    fonts: { ...m.fonts, ...extra.fonts },
    glyphs: { ...m.glyphs, ...extra.glyphs },
  };
  return spec.track === "plain-black"
    ? plainLayout(spec, metrics)
    : build(spec, metrics);
}
await captureBatch("refine-01", parameters, builder, [
  "experiments/prose-qr/unweighted/refine.mjs",
  "experiments/prose-qr/unweighted/plain-layout.mjs",
  "experiments/prose-qr/unweighted/capture.mjs",
  "experiments/prose-qr/flow/layout.mjs",
  "docs/research/prose-qr/phase-03/font-metrics.json",
]);

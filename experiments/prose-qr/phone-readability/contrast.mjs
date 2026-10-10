import { captureBatch } from "./capture.mjs";
import { build } from "../flow/layout.mjs";
const specs = [];
for (const font of ["Menlo", "Courier New"])
  for (const gray of [180, 210, 230])
    for (const blur of [0, 1, 2])
      specs.push({
        id: `contrast-${String(specs.length + 1).padStart(2, "0")}`,
        payload: "https://example.com/",
        font,
        fontSize: 20,
        charsPerModule: 4,
        linesPerModule: 2,
        content: "story",
        quiet: 5,
        ecc: "Q",
        boost: false,
        darkWeight: 700,
        lightWeight: 400,
        gray,
        blur,
        track: "styled-prose",
      });
for (const gray of [210, 230])
  for (const outputSize of [400, 656, 900])
    specs.push({
      id: `contrast-${String(specs.length + 1).padStart(2, "0")}`,
      payload: "https://example.com/",
      font: "Menlo",
      fontSize: 20,
      charsPerModule: 4,
      linesPerModule: 2,
      content: "story",
      quiet: 5,
      ecc: "Q",
      boost: false,
      darkWeight: 700,
      lightWeight: 400,
      gray,
      blur: 0,
      outputSize,
      track: "styled-prose-display",
    });
await captureBatch("contrast-01", specs, build, [
  "experiments/prose-qr/phone-readability/capture.mjs",
  "experiments/prose-qr/phone-readability/contrast.mjs",
  "experiments/prose-qr/flow/layout.mjs",
]);

import { captureBatch } from "./capture.mjs";
import { tightLayout } from "./tight-layout.mjs";
const specs = [];
for (const font of ["Menlo", "Courier New"])
  for (const outputSize of [320, 480, 656])
    specs.push({
      id: `tight-${specs.length + 1}`,
      payload: "https://example.com/",
      font,
      fontSize: 20,
      charsPerModule: 4,
      linesPerModule: 3,
      quiet: 5,
      ecc: "Q",
      content: "fabricated",
      caseMode: "word-caps",
      vowelEvery: 4,
      topChoices: 1,
      outputSize,
      blur: 0,
      track:
        "Sharp uniformly regular black ASCII; dense leading and long fabricated words",
    });
await captureBatch("tight-01", specs, tightLayout, [
  "experiments/prose-qr/phone-readability/capture.mjs",
  "experiments/prose-qr/phone-readability/tight.mjs",
  "experiments/prose-qr/phone-readability/tight-layout.mjs",
]);

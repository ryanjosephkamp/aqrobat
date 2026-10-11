import { captureBatch } from "./capture.mjs";
import { plainLayout } from "./plain-layout.mjs";
const parameters = [];
for (const charsPerModule of [2, 3])
  for (const payload of ["AQROBAT-TEST", "https://example.com/"])
    for (const topChoices of [1, 2])
      parameters.push({
        id: `compact-${parameters.length + 1}`,
        payload,
        font: "Menlo",
        content: "fabricated",
        caseMode: "word-caps",
        charsPerModule,
        linesPerModule: 1,
        fontSize: 20,
        quiet: 5,
        ecc: "Q",
        vowelEvery: topChoices === 1 ? 4 : 3,
        topChoices,
        track: "plain-black",
      });
await captureBatch("compact-01", parameters, plainLayout, [
  "experiments/prose-qr/unweighted/compact.mjs",
  "experiments/prose-qr/unweighted/plain-layout.mjs",
  "experiments/prose-qr/unweighted/capture.mjs",
]);

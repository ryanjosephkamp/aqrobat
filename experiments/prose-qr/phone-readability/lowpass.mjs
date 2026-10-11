import { captureBatch } from "./capture.mjs";
import { build } from "../flow/layout.mjs";
const specs = [];
for (const font of ["Menlo", "Courier New"])
  for (const gray of [120, 180, 220])
    for (const blur of [4, 7])
      for (const outputSize of [656, undefined])
        specs.push({
          id: `lowpass-${String(specs.length + 1).padStart(2, "0")}`,
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
          ...(outputSize ? { outputSize } : {}),
          track:
            "Visibly blurred presentation diagnostic; not legibility acceptance",
        });
await captureBatch("lowpass-01", specs, build, [
  "experiments/prose-qr/phone-readability/capture.mjs",
  "experiments/prose-qr/phone-readability/lowpass.mjs",
  "experiments/prose-qr/flow/layout.mjs",
]);

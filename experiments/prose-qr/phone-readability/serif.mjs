import { captureBatch } from "./capture.mjs";
import { tightLayout } from "./tight-layout.mjs";
const specs = [];
for (const [font, charsPerModule, linesPerModule] of [
  ["Courier New", 3, 3],
  ["Courier New", 5, 5],
  ["Menlo", 5, 4],
])
  for (const outputSize of [320, 480])
    specs.push({
      id: `serif-${specs.length + 1}`,
      payload: "https://example.com/",
      font,
      fontSize: 20,
      charsPerModule,
      linesPerModule,
      quiet: 5,
      ecc: "Q",
      content: "fabricated",
      caseMode: "word-caps",
      vowelEvery: 4,
      topChoices: 1,
      outputSize,
      blur: 0,
      track:
        "Sharp regular black letter-choice; tight line boxes restricted to glyphs that fit",
    });
const cache = new Map();
await captureBatch(
  "serif-01",
  specs,
  (s, m) => {
    const key = s.font + "/" + s.charsPerModule + "/" + s.linesPerModule;
    if (!cache.has(key)) cache.set(key, tightLayout(s, m));
    return cache.get(key);
  },
  [
    "experiments/prose-qr/phone-readability/capture.mjs",
    "experiments/prose-qr/phone-readability/serif.mjs",
    "experiments/prose-qr/phone-readability/tight-layout.mjs",
  ],
);

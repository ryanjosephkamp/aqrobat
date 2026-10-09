import { captureBatch } from "./capture.mjs";
import { build } from "../flow/layout.mjs";
const specs = [];
for (const font of ["Menlo", "Courier New"])
  for (const decoration of ["underline", "underline overline line-through"])
    specs.push({
      id: `decorated-${specs.length + 1}`,
      payload: "https://example.com/",
      font,
      fontSize: 20,
      charsPerModule: 5,
      linesPerModule: 3,
      content: "story",
      quiet: 5,
      ecc: "Q",
      boost: false,
      darkWeight: 700,
      lightWeight: 400,
      gray: 180,
      blur: 0,
      outputSize: 656,
      decoration,
      track:
        "Visible text-decoration diagnostic; glyphs and their normal spaces only, no backgrounds or module rectangles",
    });
await captureBatch(
  "decorated-02",
  specs,
  (s, m) => {
    const l = build(s, m);
    l.markup = l.markup
      .replace('<p id="text-body"', '<pre id="text-body"')
      .replace("</p>", "</pre>");
    l.markup = l.markup.replaceAll(
      'style="font-weight:',
      `style="text-decoration-line:${s.decoration};text-decoration-thickness:2px;text-decoration-skip-ink:none;text-underline-offset:0px;font-weight:`,
    );
    return l;
  },
  [
    "experiments/prose-qr/phone-readability/capture.mjs",
    "experiments/prose-qr/phone-readability/decorated.mjs",
    "experiments/prose-qr/flow/layout.mjs",
  ],
);

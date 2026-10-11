import { readFile } from "node:fs/promises";
import qrcodegen from "../../../vendor/qrcodegen.mjs";
import { escapeHtml } from "../layout.mjs";
import { proportionalLayout } from "./proportional.mjs";
import { captureBatch } from "./capture.mjs";
const metrics = JSON.parse(
  await readFile("docs/research/prose-qr/phase-04/font-metrics.json", "utf8"),
);
const spec = {
  id: "justified-1",
  payload: "https://example.com/",
  font: "Impact",
  fontSize: 20,
  leading: 1,
  linesPerModule: 1,
  quiet: 5,
  ecc: "Q",
  gray: 238,
  track:
    "Normally justified story lines; fixed glyph face/weight, faint foreground. Styled research, not a plain-text or readability pass.",
};
await captureBatch(
  "justified-01",
  [spec],
  (s) => {
    const l = proportionalLayout(s, metrics),
      columns = l.unit * l.modules,
      pad = l.unit * s.quiet;
    const qr = qrcodegen.QrCode.encodeSegments(
      qrcodegen.QrSegment.makeSegments(s.payload),
      qrcodegen.QrCode.Ecc.QUARTILE,
      1,
      40,
      -1,
      false,
    );
    const advance = (c) =>
      (metrics.fonts[s.font].glyphs[c].advance * s.fontSize) / 40;
    const gaps = [];
    const content = l.lines
      .map((line, row) => {
        const count = [...line].filter((c) => c === " ").length;
        const unfilled =
          columns - [...line].reduce((n, c) => n + advance(c), 0);
        const extra = unfilled / count;
        gaps.push({
          row,
          unfilledPixels: unfilled,
          spaces: count,
          extraPerSpace: extra,
        });
        let x = 0;
        return `<span class="line" style="display:block;height:${l.unit}px;white-space:pre;word-spacing:${extra}px">${[
          ...line,
        ]
          .map((c) => {
            const a = advance(c) + (c === " " ? extra : 0),
              dark = qr.getModule(
                Math.min(qr.size - 1, Math.floor((x + a / 2) / l.unit)),
                row,
              );
            x += a;
            const v = dark ? 0 : s.gray;
            return `<span style="color:rgb(${v},${v},${v})">${escapeHtml(c)}</span>`;
          })
          .join("")}</span>`;
      })
      .join("");
    l.markup = `<article id="artifact" style="box-sizing:content-box;width:${columns}px;height:${columns}px;padding:${pad}px;background:white;color:black"><pre id="text-body" style="margin:0;padding:0;width:${columns}px;height:${columns}px;font:400 ${s.fontSize}px/${l.unit}px '${s.font}';font-kerning:none;font-variant-ligatures:none;letter-spacing:0">${content}</pre></article>`;
    l.structural.justification = gaps;
    l.structural.naturalProportionalAdvances = true;
    l.structural.additionalLayoutStyle =
      "Conventional per-line word-space expansion; natural letter shapes and a single source space between words";
    return l;
  },
  [
    "experiments/prose-qr/phone-readability/justified.mjs",
    "experiments/prose-qr/phone-readability/capture.mjs",
    "experiments/prose-qr/phone-readability/proportional.mjs",
    "docs/research/prose-qr/phase-04/font-metrics.json",
  ],
);

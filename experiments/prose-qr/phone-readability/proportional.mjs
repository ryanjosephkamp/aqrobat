import qrcodegen from "../../../vendor/qrcodegen.mjs";
import { STORY } from "../flow/layout.mjs";
import { escapeHtml } from "../layout.mjs";

export function proportionalLayout(spec, metrics) {
  const level =
    qrcodegen.QrCode.Ecc[
      spec.ecc.toUpperCase() === "Q"
        ? "QUARTILE"
        : spec.ecc === "H"
          ? "HIGH"
          : spec.ecc === "L"
            ? "LOW"
            : "MEDIUM"
    ];
  const code = qrcodegen.QrCode.encodeSegments(
    qrcodegen.QrSegment.makeSegments(spec.payload),
    level,
    1,
    40,
    spec.mask ?? -1,
    false,
  );
  const matrix = Array.from({ length: code.size }, (_, y) =>
    Array.from({ length: code.size }, (_, x) => code.getModule(x, y)),
  );
  const glyphs = metrics.fonts[spec.font].glyphs,
    scale = spec.fontSize / 40;
  const advance = (c) => glyphs[c].advance * scale;
  const unit = spec.fontSize * (spec.leading || 1.2) * spec.linesPerModule,
    lineHeight = unit / spec.linesPerModule,
    columns = code.size * unit,
    pad = spec.quiet * unit,
    side = Math.ceil(columns + 2 * pad);
  const source = spec.upper ? STORY.toUpperCase() : STORY,
    words = source.split(" "),
    lines = [];
  let wi = 0;
  const wordWidth = (w) => [...w].reduce((n, c) => n + advance(c), 0);
  for (let row = 0; row < code.size * spec.linesPerModule; row++) {
    let line = "",
      width = 0;
    while (true) {
      const w = words[wi % words.length],
        next = width + (line ? advance(" ") : 0) + wordWidth(w);
      if (next > columns) break;
      line += (line ? " " : "") + w;
      width = next;
      wi++;
    }
    lines.push(line);
  }
  const content = `<pre id="text-body" style="margin:0;padding:0;width:${columns}px;height:${columns}px;font:400 ${spec.fontSize}px/${lineHeight}px '${spec.font}';font-kerning:none;font-variant-ligatures:none;letter-spacing:0">${lines
    .map((line, row) => {
      let x = 0;
      return `<span class="line" style="display:block;height:${lineHeight}px;white-space:pre">${[
        ...line,
      ]
        .map((c) => {
          const a = advance(c),
            dark =
              matrix[Math.floor(row / spec.linesPerModule)][
                Math.min(code.size - 1, Math.floor((x + a / 2) / unit))
              ];
          x += a;
          const shade = dark ? 0 : spec.gray;
          return `<span style="color:rgb(${shade},${shade},${shade})">${escapeHtml(c)}</span>`;
        })
        .join("")}</span>`;
    })
    .join("")}</pre>`;
  return {
    spec,
    content,
    markup: `<article id="artifact" style="box-sizing:content-box;width:${columns}px;height:${columns}px;padding:${pad}px;background:white;color:black">${content}</article>`,
    lines,
    plainText: lines.join("\n"),
    unit,
    side,
    modules: code.size,
    matrix,
    structural: {
      fontSize: spec.fontSize,
      lineHeightEm: spec.leading || 1.2,
      uniformWeight: 400,
      naturalProportionalAdvances: true,
      fontFace: spec.font,
      gray: spec.gray,
      allCaps: !!spec.upper,
      emptyLines: 0,
      internalSpaceRuns: 0,
      semantic: "Original story repeated; not an accepted article",
      mask: code.mask,
    },
  };
}

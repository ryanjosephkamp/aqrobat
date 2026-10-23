import { generate } from "../../../src/core.mjs";
import { STORY } from "../flow/layout.mjs";
import { escapeHtml } from "../layout.mjs";

export function ornamentLayout(spec, metrics, finder, alignment = null) {
  const qr = generate(spec.payload, { ecc: spec.ecc, boost: false, stroke: 0 });
  const n = qr.modules;
  const advance = metrics.fonts[`${spec.font}|400`].advanceEm * spec.fontSize;
  const pitch = advance * spec.charsPerModule;
  const leading = pitch / spec.linesPerModule;
  const pad = spec.quiet * pitch;
  const rows = n * spec.linesPerModule;
  const words = (spec.story || STORY).split(" ");
  let cursor = 0;
  const lines = [];
  const fragments = [];
  for (let row = 0; row < rows; row++) {
    const my = Math.floor(row / spec.linesPerModule);
    let ranges = [[0, n]];
    if (my < 8) ranges = [[8, n - 8]];
    else if (my >= n - 8) ranges = [[8, n]];
    if (n >= 25 && alignment && my >= n - 10 && my < n - 3) {
      const next = [];
      for (const [a, b] of ranges) {
        if (a < n - 10) next.push([a, Math.min(b, n - 10)]);
        if (b > n - 3) next.push([Math.max(a, n - 3), b]);
      }
      ranges = next;
    }
    for (const [a, b] of ranges) {
      if (b <= a) continue;
      const capacity = Math.floor((b - a) * spec.charsPerModule);
      let line = "";
      while (true) {
        const word = words[cursor % words.length];
        if (line.length + (line ? 1 : 0) + word.length > capacity) break;
        line += (line ? " " : "") + word;
        cursor++;
      }
      if (!line) throw Error("Story word does not fit; reject");
      lines.push(line);
      let chars = "";
      for (let col = 0; col < line.length; col++) {
        const mx = Math.min(
          n - 1,
          Math.floor(a + (col + 0.5) / spec.charsPerModule),
        );
        const dark = qr.matrix[my][mx];
        const shade = dark ? 0 : spec.gray;
        chars += `<span style="font-weight:${dark ? 700 : 400};color:rgb(${shade},${shade},${shade});-webkit-text-stroke:${dark ? spec.darkStroke || 0 : 0}px currentColor;paint-order:stroke fill">${escapeHtml(line[col])}</span>`;
      }
      fragments.push(
        `<span class="line" style="position:absolute;display:block;left:${a * pitch}px;top:${row * leading}px;height:${leading}px;line-height:${leading}px;white-space:pre">${chars}</span>`,
      );
    }
  }
  const centers = [
    [3.5, 3.5],
    [n - 3.5, 3.5],
    [3.5, n - 3.5],
  ];
  const marks = [];
  function putGlyph(measure, cx, cy, modules) {
    const [bx, by, bw, bh] = measure.inkBounds;
    const scale = (modules * pitch) / Math.max(bw, bh);
    const left = pad + cx * pitch - (bx - measure.origin[0] + bw / 2) * scale;
    const top = pad + cy * pitch - (by - measure.origin[1] + bh / 2) * scale;
    marks.push(
      `<span class="ornament" style="position:absolute;left:${left}px;top:${top}px;font:${measure.weight || 400} ${measure.size * scale}px/1 '${measure.font}';color:black;-webkit-text-stroke:${(measure.stroke || 0) * scale}px currentColor;paint-order:stroke fill">${measure.symbol}</span>`,
    );
  }
  for (const [x, y] of centers) putGlyph(finder, x, y, 7);
  if (n >= 25 && alignment) putGlyph(alignment, n - 6.5, n - 6.5, 5);
  const content = `<pre id="text-body" style="position:relative;margin:0;padding:0;width:${n * pitch}px;height:${n * pitch}px;font:400 ${spec.fontSize}px/${leading}px '${spec.font}',monospace;font-kerning:none;font-variant-ligatures:none">${fragments.join("\n")}</pre>`;
  const optical = Math.max(
    ...lines
      .join("")
      .split("")
      .map((c) => {
        const glyph =
          metrics.glyphs[`${spec.font}|700`][c] ||
          metrics.glyphs[`${spec.font}|400`][c];
        return glyph
          ? (((glyph.ascent + glyph.descent) / 40) * spec.fontSize) / leading
          : 0;
      }),
  );
  return {
    spec,
    content,
    markup: `<article id="artifact" style="position:relative;box-sizing:content-box;width:${n * pitch}px;height:${n * pitch}px;padding:${pad}px;background:white;color:black">${content}${marks.join("")}</article>`,
    plainText: lines.join("\n"),
    lines,
    matrix: qr.matrix,
    modules: n,
    unit: pitch,
    side: Math.ceil((n + 2 * spec.quiet) * pitch),
    structural: {
      fontSize: spec.fontSize,
      lineHeightEm: leading / spec.fontSize,
      maxOpticalHeightToLineHeight: optical,
      emptyLines: 0,
      words: lines.join(" ").split(" ").length,
      ornaments: marks.length,
      visibleGlyphOrnaments: true,
      hiddenModules: false,
      story:
        "Original story repeated with natural whole-word wrapping around explicit visible text ornaments; ends may be incomplete",
    },
  };
}

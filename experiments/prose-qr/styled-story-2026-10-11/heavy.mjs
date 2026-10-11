import { generate } from "../../../src/core.mjs";
import { STORY } from "../flow/layout.mjs";
import { escapeHtml } from "../layout.mjs";

export function heavyStory(spec, resource) {
  const qr = generate(spec.payload, { ecc: spec.ecc, boost: false, stroke: 0 });
  const font = resource.fonts[spec.font];
  if (!font) throw Error("Unmeasured font");
  const pitch = spec.pitch,
    leading = pitch / spec.linesPerModule,
    field = qr.modules * pitch,
    pad = spec.quiet * pitch;
  const envelope =
    Math.max(...Object.values(font.glyphs).map((g) => g.ascent)) +
    Math.max(...Object.values(font.glyphs).map((g) => g.descent));
  if (envelope >= leading || font.maxHeight >= leading)
    throw Error("Native measured optical overlap");
  const words = STORY.toUpperCase().split(" ");
  const advance = (word) =>
    [...word].reduce((s, c) => s + font.glyphs[c].advance, 0);
  const space = font.glyphs[" "].advance;
  let cursor = 0;
  const lines = [],
    fragments = [],
    gaps = [];
  for (let li = 0; li < qr.modules * spec.linesPerModule; li++) {
    const picked = [];
    let width = 0;
    while (true) {
      const word = words[cursor % words.length],
        w = advance(word);
      if (width + (picked.length ? space : 0) + w > field) break;
      width += (picked.length ? space : 0) + w;
      picked.push(word);
      cursor++;
    }
    if (picked.length < 2) throw Error("Whole words overflow");
    const gap =
      (field - picked.reduce((s, w) => s + advance(w), 0)) /
      (picked.length - 1);
    gaps.push(gap);
    let x = 0;
    const markup = [];
    for (const [wi, word] of picked.entries()) {
      let dx = 0;
      const letters = [];
      for (const c of word) {
        const a = font.glyphs[c].advance,
          col = Math.min(qr.modules - 1, Math.floor((x + dx + a / 2) / pitch)),
          row = Math.floor(li / spec.linesPerModule);
        const shade = qr.matrix[row][col] ? 0 : spec.gray;
        letters.push(
          `<span style="color:rgb(${shade},${shade},${shade})">${escapeHtml(c)}</span>`,
        );
        dx += a;
      }
      markup.push(
        `<span class="word" style="position:absolute;left:${x}px;top:0;white-space:pre">${letters.join("")}${wi < picked.length - 1 ? " " : ""}</span>`,
      );
      x += advance(word) + gap;
    }
    lines.push(picked.join(" "));
    fragments.push(
      `<span class="line" style="position:absolute;display:block;left:0;top:${li * leading}px;width:${field}px;height:${leading}px;line-height:${leading}px;white-space:pre">${markup.join("")}</span>`,
    );
  }
  return {
    spec,
    modules: qr.modules,
    matrix: qr.matrix,
    unit: pitch,
    side: (qr.modules + 2 * spec.quiet) * pitch,
    lines,
    plainText: lines.join("\n"),
    markup: `<article id="artifact" style="position:relative;box-sizing:content-box;width:${field}px;height:${field}px;padding:${pad}px;background:white"><pre id="text-body" style="position:relative;margin:0;padding:0;width:${field}px;height:${field}px;font:400 20px/${leading}px '${spec.font}';font-kerning:none;font-variant-ligatures:none">${fragments.join("\n")}</pre></article>`,
    structural: {
      fontSize: 20,
      lineHeightEm: leading / 20,
      maxOpticalHeightToLineHeight:
        Math.max(envelope, font.maxHeight) / leading,
      measuredEnvelope: envelope,
      maxNativeGlyphHeight: font.maxHeight,
      emptyLines: 0,
      wordGaps: [Math.min(...gaps), Math.max(...gaps)],
      words: cursor,
      ornaments: 0,
      hiddenModules: false,
      storyCase: "uppercase",
      semanticClaim:
        "Original story repeated in order; whole-word justification; final repetition may end mid-sentence",
    },
  };
}

import { generate } from "../../../src/core.mjs";
import { escapeHtml } from "../layout.mjs";
import { STORY } from "../flow/layout.mjs";

export { STORY };
export const prose = {
  original: STORY,
  mixed:
    "A good tool leaves room for ordinary language. Keep the words in their original order, including small details like punctuation, numbers such as 2026, and a question: will this work on a normal page? We want to read the text, copy it, and recover the exact link without giving a scanner special instructions.",
  narrow:
    "It is still a little late. I sit in a quiet room, listening to rain. A thin line of light slips in. We will write it all, in plain little words, until it is time to leave.",
  broad:
    "Warm summer mornings bring wonderful moments. A wooden window frames a meadow where bees wander among blooms. People share bread, welcome neighbors, and remember why small everyday pleasures matter.",
};

export function textFor(spec) {
  const source = spec.text ?? prose[spec.content ?? "original"];
  if (typeof source !== "string" || !source.trim() || !source.isWellFormed())
    throw new Error("Nonempty well-formed source text required");
  return spec.case === "upper"
    ? source.toUpperCase()
    : spec.case === "lower"
      ? source.toLowerCase()
      : source;
}

export function compose(spec, measured) {
  const source = textFor(spec);
  const qr = generate(spec.payload, {
    ecc: spec.ecc ?? "Q",
    boost: false,
    stroke: 0,
  });
  const field = qr.modules * spec.pitch,
    leading = spec.pitch / spec.linesPerModule;
  const font = measured;
  const envelope =
    Math.max(...Object.values(font.glyphs).map((g) => g.ascent)) +
    Math.max(...Object.values(font.glyphs).map((g) => g.descent));
  if (envelope > leading + 0.01)
    throw new Error("Native measured vertical overlap");
  const advance = (c) => {
    if (!font.glyphs[c]) throw new Error("Unmeasured source character");
    return font.glyphs[c].advance + (spec.tracking ?? 0);
  };
  const width = (w) => [...w].reduce((n, c) => n + advance(c), 0);
  const words = source.split(/\s+/);
  const space = advance(" ");
  const lines = [],
    fragments = [],
    gaps = [];
  let cursor = 0;
  for (let li = 0; li < qr.modules * spec.linesPerModule; li++) {
    const picked = [];
    let used = 0;
    while (true) {
      if (!spec.repeat && cursor >= words.length) break;
      const word = words[cursor % words.length],
        w = width(word);
      if (w > field)
        throw new Error(
          "A complete word exceeds the field; source never shortened",
        );
      if (used + (picked.length ? space : 0) + w > field) break;
      used += (picked.length ? space : 0) + w;
      picked.push(word);
      cursor++;
    }
    if (!picked.length)
      throw new Error(
        "Insufficient exact source to fill the QR field; enable labeled repetition or provide more text",
      );
    const gap =
      picked.length > 1
        ? (field - picked.reduce((n, w) => n + width(w), 0)) /
          (picked.length - 1)
        : 0;
    gaps.push(gap);
    let x = 0;
    const markup = [];
    for (const [wi, word] of picked.entries()) {
      let dx = 0;
      const letters = [];
      for (const c of word) {
        const a = advance(c),
          col = Math.min(
            qr.modules - 1,
            Math.floor((x + dx + a / 2) / spec.pitch),
          );
        const row = Math.floor(li / spec.linesPerModule);
        const dark = qr.matrix[row][col];
        const shade = spec.uniform
          ? (spec.dark ?? 0)
          : dark
            ? (spec.dark ?? 0)
            : spec.gray;
        const weight = spec.uniform
          ? (spec.darkWeight ?? 400)
          : dark
            ? (spec.darkWeight ?? 400)
            : (spec.lightWeight ?? 400);
        letters.push(
          `<span style="display:inline-block;width:${a}px;color:rgb(${shade},${shade},${shade});font-weight:${weight}">${escapeHtml(c)}</span>`,
        );
        dx += a;
      }
      markup.push(
        `<span class="word" style="position:absolute;left:${x}px;top:0;white-space:pre">${letters.join("")}${wi < picked.length - 1 ? " " : ""}</span>`,
      );
      x += width(word) + gap;
    }
    lines.push(picked.join(" "));
    fragments.push(
      `<span class="line" style="position:absolute;display:block;left:0;top:${li * leading}px;width:${field}px;height:${leading}px;line-height:${leading}px;white-space:pre">${markup.join("")}</span>`,
    );
  }
  if (!spec.repeat && cursor !== words.length)
    throw new Error("Text overflow: source is never truncated");
  const pad = spec.quiet * spec.pitch;
  const body = `<pre id="text-body" style="position:relative;margin:0;padding:0;width:${field}px;height:${field}px;font:400 ${spec.fontSize}px/${leading}px '${spec.font}';font-kerning:none;font-variant-ligatures:none">${fragments.join("\n")}</pre>`;
  const markup = `<article id="artifact" style="position:relative;box-sizing:content-box;width:${field}px;height:${field}px;padding:${pad}px;background:white">${body}</article>`;
  return {
    html: `<!doctype html><html><head><meta charset="utf-8"><title>Aqrobat prose QR</title><style>html,body{margin:0;padding:0;background:white}</style></head><body>${markup}</body></html>`,
    source,
    plainText: lines.join("\n"),
    lines,
    side: field + 2 * pad,
    matrix: qr.matrix,
    modules: qr.modules,
    structural: {
      field,
      leading,
      envelope,
      fontSize: spec.fontSize,
      lines: lines.length,
      words: cursor,
      maxLineCharacters: Math.max(...lines.map((l) => l.length)),
      sourceWords: words.length,
      repetition: !!spec.repeat,
      repetitions: cursor / words.length,
      case: spec.case ?? "preserve",
      whitespace:
        "Whole-word line wrapping; source whitespace normalized for these research fixtures",
      gaps: [Math.min(...gaps), Math.max(...gaps)],
      ornaments: 0,
      hiddenModules: false,
    },
  };
}

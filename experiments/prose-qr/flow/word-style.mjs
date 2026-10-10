import { build } from "./layout.mjs";
import { escapeHtml } from "../layout.mjs";

// Preserve natural spacing and text. Assign one ink state per complete word.
// The separate finder-preserving variant retains per-letter ink in corner areas.
export function wordStyle(spec, metrics) {
  const base = build(spec, metrics);
  const styles = base.styles.map((x) => ({ ...x }));
  for (let row = 0; row < base.lines.length; row++) {
    for (const match of base.lines[row].matchAll(/\S+/g)) {
      const chars = styles.filter(
        (s) =>
          s.row === row &&
          s.col >= match.index &&
          s.col < match.index + match[0].length,
      );
      const dark = chars.filter((s) => s.dark).length >= chars.length / 2;
      for (const s of chars) {
        const y = Math.floor(row / spec.linesPerModule);
        const x = Math.floor(s.col / spec.charsPerModule);
        const finder =
          (x < 8 && y < 8) ||
          (x >= base.modules - 8 && y < 8) ||
          (x < 8 && y >= base.modules - 8);
        if (spec.preserveFinders && finder) continue;
        s.dark = dark;
        s.weight = dark ? spec.darkWeight : spec.lightWeight;
        s.shade = dark ? 0 : spec.gray;
      }
    }
  }
  const lines = base.lines.map((line, row) => {
    const chars = styles.filter((s) => s.row === row);
    return `<span class="line" style="display:block;height:${base.lineHeight}px;line-height:${base.lineHeight}px;white-space:pre">${chars
      .map(
        (s) =>
          `<span style="font-weight:${s.weight};color:rgb(${s.shade},${s.shade},${s.shade})">${escapeHtml(s.char)}</span>`,
      )
      .join("")}</span>`;
  });
  const content = `<p id="text-body" style="margin:0;padding:0;width:${base.modules * base.unit}px;height:${base.modules * base.unit}px;font:${spec.lightWeight} ${spec.fontSize}px/${base.lineHeight}px '${spec.font}',monospace;letter-spacing:0;font-variant-ligatures:none">${lines.join("")}</p>`;
  return {
    ...base,
    styles,
    content,
    markup: `<article id="artifact" style="box-sizing:content-box;width:${base.modules * base.unit}px;height:${base.modules * base.unit}px;padding:${base.pad}px;background:white;color:black;overflow:visible">${content}</article>`,
  };
}

import { escapeXml } from "./core.mjs";
import { fontFamily, render } from "./render.mjs";

export const TEXT_LAYOUT = "aqrobat-text-v1";
// Emoji and East Asian glyphs usually occupy a full em. The receiving font
// still controls advances; this classification is a portable approximation.
const wideGlyph = (s) =>
  /[\p{Emoji_Presentation}\uFE0F\u200D\u3000-\u9FFF\uFF01-\uFF60]/u.test(s);

/** Plain text cannot carry typography. Pack narrow and wide glyphs separately. */
export function plainText(qr) {
  const o = qr.recipe.options;
  const wide = qr.palette.map(wideGlyph);
  const mixed = wide.some(Boolean) && !wide.every(Boolean);
  const scale = mixed
    ? Math.max(1, Math.ceil(o.repeatX / 5), Math.ceil(o.repeatY / 3))
    : 1;
  const across = mixed
    ? 5 * scale
    : wide.every(Boolean)
      ? Math.max(1, Math.ceil(o.repeatX / 2), o.repeatY)
      : Math.max(o.repeatX, 2 * o.repeatY);
  const down = mixed ? 3 * scale : o.repeatY;
  const blank = wide.every(Boolean) ? "\u3000" : " ";
  const rows = [];
  for (let y = -qr.quiet; y < qr.modules + qr.quiet; y++) {
    let row = "";
    for (let x = -qr.quiet; x < qr.modules + qr.quiet; x++) {
      const glyph = qr.glyphMatrix[y]?.[x];
      const count = mixed && glyph && wideGlyph(glyph) ? 3 * scale : across;
      row += (glyph ?? blank).repeat(count);
    }
    for (let i = 0; i < down; i++) rows.push(row);
  }
  return {
    text: rows.join("\n") + "\n",
    rows,
    across,
    down,
    blank,
    mixed,
    layout: TEXT_LAYOUT,
  };
}

// Browser-only measurement uses the unchanged image renderer as its source of
// font metrics. This scratch canvas is never embedded in text output.
export function textMetrics(qr) {
  const canvas = document.createElement("canvas");
  return render(canvas, qr);
}

/** Real text with inline typography, suitable for HTML clipboard and websites. */
export function formattedText(qr, metrics) {
  const o = qr.recipe.options,
    w = o.width;
  const family = escapeXml(fontFamily(o.font));
  const base = `color:#000;background:#fff;font-family:${family};font-weight:700;font-style:normal;letter-spacing:0;text-transform:none;text-decoration:none;direction:ltr;`;
  if (metrics.kind === "text rows") {
    return `<pre data-aqrobat-layout="${TEXT_LAYOUT}" style="${base}margin:0;padding:0;border:0;width:${w}px;font-size:${metrics.fontSize}px;line-height:${metrics.lineHeight}px;white-space:pre;overflow:visible;-webkit-text-stroke:${o.stroke * metrics.fontSize}px #000;">${escapeXml(qr.text)}</pre>`;
  }
  const cell = w / qr.totalModules,
    line = cell / o.repeatY;
  let rows = "";
  for (let y = -qr.quiet; y < qr.modules + qr.quiet; y++) {
    let cells = "";
    for (let x = -qr.quiet; x < qr.modules + qr.quiet; x++) {
      const glyph = qr.glyphMatrix[y]?.[x],
        fs = glyph ? metrics.fontSizes[glyph] : line;
      const content = glyph
        ? Array(o.repeatY)
            .fill(
              `<span style="display:block;height:${line}px;line-height:${line}px;white-space:pre;font-size:${fs}px;-webkit-text-stroke:${o.stroke * fs}px #000;">${escapeXml(glyph.repeat(o.repeatX))}</span>`,
            )
            .join("")
        : "&#160;";
      cells += `<td width="${cell}" height="${cell}" style="padding:0;border:0;width:${cell}px;height:${cell}px;text-align:center;vertical-align:middle;">${content}</td>`;
    }
    rows += `<tr style="height:${cell}px;">${cells}</tr>`;
  }
  return `<table data-aqrobat-layout="${TEXT_LAYOUT}" role="presentation" cellpadding="0" cellspacing="0" width="${w}" style="${base}border:0;border-collapse:collapse;table-layout:fixed;width:${w}px;margin:0;padding:0;line-height:1;"><tbody>${rows}</tbody></table>`;
}

export function textDocument(qr, metrics) {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Aqrobat text QR</title><style>body{margin:24px;background:white;color:black;font:16px/1.5 system-ui}p{overflow-wrap:anywhere}.scroll{overflow:auto}@page{margin:15mm}@media print{p{font-size:10pt}.scroll{position:relative;overflow:hidden;width:150mm;height:150mm;break-inside:avoid}[data-aqrobat-layout]{position:absolute;left:0;top:0;transform-origin:top left;transform:scale(${(150 * 96) / 25.4 / qr.recipe.options.width})}}</style><h1>Aqrobat · real text</h1><p>Expected payload: ${escapeXml(qr.recipe.payload)}. Font-dependent; scan this exact output before using it.</p><div class="scroll">${formattedText(qr, metrics)}</div><p>This QR contains selectable characters, with no image or hidden solid modules. Keep its inline styles when placing it on a website. Use Print to save a text PDF.</p></html>`;
}
const rtfEscape = (value) =>
  value
    .split("")
    .map((c) => {
      const n = c.charCodeAt(0);
      return n > 127
        ? `\\u${n > 32767 ? n - 65536 : n}?`
        : /[\\{}]/.test(c)
          ? `\\${c}`
          : c;
    })
    .join("");

/** RTF retains font, bold weight, exact line spacing, and fixed tab positions. */
export function textRtf(qr, metrics) {
  const o = qr.recipe.options,
    twips = o.width * 15;
  const header = `{\\rtf1\\ansi\\deff0\\uc1{\\fonttbl{\\f0 ${rtfEscape(o.font === "monospace" ? "Menlo" : o.font)};}}{\\colortbl;\\red0\\green0\\blue0;\\red255\\green255\\blue255;}\\paperw${Math.max(12240, Math.ceil(twips + 1440))}\\paperh${Math.max(15840, Math.ceil(twips + 1440))}\\margl720\\margr720\\margt720\\margb720\\f0\\b\\cf1\\highlight2 `;
  if (metrics.kind === "text rows") {
    const fs = Math.round(metrics.fontSize * 1.5),
      line = Math.round(metrics.lineHeight * 15);
    return (
      header +
      `\\fs${fs}\\sl-${line}\\slmult0\\sa0\\sb0 ` +
      qr.rows.map(rtfEscape).join("\\line\n") +
      "\\par}"
    );
  }
  const cell = twips / qr.characterColumns,
    line = twips / qr.characterRows;
  const tabs = Array.from(
    { length: qr.characterColumns },
    (_, i) => `\\tx${Math.round((i + 0.025) * cell)}`,
  ).join("");
  let body = `\\pard\\ql\\sa0\\sb0\\sl-${Math.round(line)}\\slmult0${tabs} `;
  for (let y = -qr.quiet; y < qr.modules + qr.quiet; y++) {
    for (let dy = 0; dy < o.repeatY; dy++) {
      for (let x = -qr.quiet; x < qr.modules + qr.quiet; x++) {
        const glyph = qr.glyphMatrix[y]?.[x];
        // Apple Color Emoji expands advances below 30 pt in TextEdit. Leave
        // extra room for that native fallback; RTF remains font dependent.
        const points = glyph ? metrics.fontSizes[glyph] * 0.75 : 1;
        const fs = Math.max(
          2,
          Math.floor(points * (points < 30 ? 0.75 : 1) * 2),
        );
        for (let dx = 0; dx < o.repeatX; dx++)
          body += `\\fs${fs}\\tab ` + (glyph ? rtfEscape(glyph) : "");
      }
      body += "\\line\n";
    }
  }
  return header + body + "\\par}";
}

export function exportName(value) {
  const name = String(value)
    .normalize("NFC")
    .replace(/[\p{Cc}\\/:*?"<>|]/gu, "-")
    .replace(/[. ]+$/g, "")
    .trim()
    .replace(/^\.+$/, "");
  return !name || /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(name)
    ? "aqrobat"
    : Array.from(name).slice(0, 80).join("");
}

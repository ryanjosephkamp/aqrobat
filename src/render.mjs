import { escapeXml } from "./core.mjs";

const rowGlyph = (glyph) => /^[\x21-\x7e█]$/.test(glyph);
export const fontFamily = (font) =>
  font === "monospace"
    ? "monospace"
    : `"${font}", "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", monospace`;

export function render(canvas, qr, width = qr.recipe.options.width) {
  if (!Number.isInteger(width) || width < 1 || width > 1536)
    throw new RangeError("Render size must be an integer from 1 to 1536.");
  canvas.width = canvas.height = width;
  const ctx = canvas.getContext("2d");
  const o = qr.recipe.options,
    family = fontFamily(o.font);
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, width, width);
  ctx.fillStyle = ctx.strokeStyle = "black";
  ctx.font = `700 100px ${family}`;
  if (qr.palette.every(rowGlyph)) {
    const m = ctx.measureText("M");
    const fontSize = width / ((qr.characterColumns * m.width) / 100);
    const lineHeight = width / qr.characterRows;
    const ascent = (m.fontBoundingBoxAscent ?? m.actualBoundingBoxAscent) / 100;
    const descent =
      (m.fontBoundingBoxDescent ?? m.actualBoundingBoxDescent) / 100;
    const baseline =
      (lineHeight - (ascent + descent) * fontSize) / 2 + ascent * fontSize;
    ctx.font = `700 ${fontSize}px ${family}`;
    ctx.textBaseline = "alphabetic";
    ctx.lineWidth = o.stroke * fontSize;
    qr.rows.forEach((row, i) => {
      if (o.stroke) ctx.strokeText(row, 0, baseline + i * lineHeight);
      ctx.fillText(row, 0, baseline + i * lineHeight);
    });
    return {
      kind: "text rows",
      fontSize,
      lineHeight,
      width,
      characterOnly: true,
    };
  }
  const cw = width / qr.characterColumns,
    ch = width / qr.characterRows;
  const sizes = new Map(
    qr.palette.map((glyph) => {
      const m = ctx.measureText(glyph);
      const height =
        ((m.actualBoundingBoxAscent || 85) +
          (m.actualBoundingBoxDescent || 15)) /
        100;
      return [
        glyph,
        Math.min(cw / ((m.width || 100) / 100), ch / height) * 0.95,
      ];
    }),
  );
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  qr.matrix.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (!dark) return;
      const glyph = qr.glyphMatrix[y][x],
        fontSize = sizes.get(glyph);
      ctx.font = `700 ${fontSize}px ${family}`;
      ctx.lineWidth = o.stroke * fontSize;
      for (let dy = 0; dy < o.repeatY; dy++)
        for (let dx = 0; dx < o.repeatX; dx++) {
          const gx = ((x + qr.quiet) * o.repeatX + dx + 0.5) * cw;
          const gy = ((y + qr.quiet) * o.repeatY + dy + 0.5) * ch;
          if (o.stroke) ctx.strokeText(glyph, gx, gy);
          ctx.fillText(glyph, gx, gy);
        }
    }),
  );
  return {
    kind: "positioned glyphs",
    fontSizes: Object.fromEntries(sizes),
    width,
    characterOnly: true,
  };
}

// A downloaded HTML sheet keeps the exact PNG artwork plus a selectable text
// version. No executable payload or remote font dependency is introduced.
export function htmlSheet(qr, png, text = qr.text) {
  if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(png))
    throw new TypeError("Expected a PNG data URL.");
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Aqrobat print sheet</title><style>body{font:16px/1.6 system-ui;margin:24px;color:#111;background:#fff}main{max-width:760px;margin:auto}img{width:100%;max-width:${qr.recipe.options.width}px;height:auto}pre{overflow:auto;white-space:pre}p{overflow-wrap:anywhere}@page{size:auto;margin:15mm}@media print{img{width:150mm;max-width:150mm}details{display:none}main{max-width:none}}</style><main><h1>Aqrobat</h1><p>Expected payload: ${escapeXml(qr.recipe.payload)}</p><img src="${png}" alt="QR made from glyph artwork"><p>Untested in this print/scanner combination. Requested ECC ${qr.requestedEcc}; actual ECC ${qr.actualEcc}. Printed artwork is 150 mm square including its four-module border. Use the browser Print command.</p><details><summary>Plain text (font and spacing dependent)</summary><pre>${escapeXml(text)}</pre></details></main></html>`;
}

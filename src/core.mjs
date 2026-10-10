import qrcodegen from "../vendor/qrcodegen.mjs";

const LEVELS = {
  L: qrcodegen.QrCode.Ecc.LOW,
  M: qrcodegen.QrCode.Ecc.MEDIUM,
  Q: qrcodegen.QrCode.Ecc.QUARTILE,
  H: qrcodegen.QrCode.Ecc.HIGH,
};
export const PRESETS = Object.freeze(
  [
    ["#", "Hash"],
    ["@", "At"],
    ["M", "M"],
    ["█", "Block"],
    [".", "Dots"],
    ["*", "Asterisk"],
    ["+", "Plus"],
    ["●", "Circle"],
    ["■", "Square"],
    ["⚫️", "Black circle"],
    ["◼️", "Black square"],
    ["▪️", "Small square"],
    ["🔳", "Frame"],
    ["🙂", "Face"],
    ["🧍", "Person"],
    ["🐱", "Cat"],
    ["🍇", "Grapes"],
    ["🏁", "Flag"],
  ].map(([glyph, name]) => Object.freeze({ glyph, name })),
);

export const DEFAULTS = Object.freeze({
  glyph: "#",
  repeatX: 4,
  repeatY: 2,
  ecc: "M",
  boost: true,
  width: 656,
  font: "Menlo",
  stroke: 0.1,
});
const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });

export function validateGlyph(glyph) {
  if (
    typeof glyph !== "string" ||
    !glyph.isWellFormed() ||
    !glyph.length ||
    new TextEncoder().encode(glyph).length > 64 ||
    [...segmenter.segment(glyph)].length !== 1 ||
    /[\p{White_Space}\p{Cc}\u200b\u200c\u2060\ufeff\u202a-\u202e\u2066-\u2069]/u.test(
      glyph,
    ) ||
    /\p{Cf}/u.test(glyph.replace(/[\u200d\u{e0020}-\u{e007f}]/gu, "")) ||
    !glyph.replace(/[\p{M}\p{Cf}]/gu, "").length
  )
    throw new RangeError(
      "Choose one visible character or emoji (up to 64 UTF-8 bytes).",
    );
  return glyph;
}

/** Exact graphemes, deduplicated in first-seen order; whitespace is a separator. */
export function parsePalette(input) {
  if (
    typeof input !== "string" ||
    !input.isWellFormed() ||
    new TextEncoder().encode(input).length > 4096
  )
    throw new RangeError(
      "Use a well-formed symbol palette up to 4096 UTF-8 bytes.",
    );
  const symbols = [
    ...segmenter.segment(input.replace(/\p{White_Space}/gu, "")),
  ].map(({ segment }) => validateGlyph(segment));
  const palette = [...new Set(symbols)];
  if (!palette.length)
    throw new RangeError("Enter at least one visible symbol or emoji.");
  return palette;
}

export function normalizeOptions(options = {}) {
  if (!options || typeof options !== "object" || Array.isArray(options))
    throw new TypeError("Expected an options object.");
  const known = Object.keys(DEFAULTS);
  for (const key of Object.keys(options))
    if (!known.includes(key)) throw new RangeError(`Unknown option: ${key}`);
  const o = { ...DEFAULTS, ...options };
  parsePalette(o.glyph);
  if (!Object.hasOwn(LEVELS, o.ecc))
    throw new RangeError("Choose L, M, Q, or H error correction.");
  if (typeof o.boost !== "boolean")
    throw new TypeError("boost must be a boolean.");
  if (
    !Number.isInteger(o.repeatX) ||
    !Number.isInteger(o.repeatY) ||
    o.repeatX < 1 ||
    o.repeatX > 4 ||
    o.repeatY < 1 ||
    o.repeatY > 4
  )
    throw new RangeError("Use 1–4 characters across and 1–4 rows per module.");
  if (!Number.isInteger(o.width) || o.width < 200 || o.width > 1536)
    throw new RangeError("Use an integer size from 200 to 1536 pixels.");
  if (!["Menlo", "Courier New", "monospace"].includes(o.font))
    throw new RangeError("Choose Menlo, Courier New, or system monospace.");
  if (![0, 0.1].includes(o.stroke))
    throw new RangeError("Use 0 or 0.1 for stroke.");
  return o;
}

/** Build a standard matrix, then replace dark modules with actual characters. */
export function generate(payload, options = {}) {
  if (typeof payload !== "string" || !payload.length || !payload.isWellFormed())
    throw new TypeError("Enter nonempty, well-formed text.");
  const bytes = new TextEncoder().encode(payload);
  if (bytes.length > 1024)
    throw new RangeError(
      "Use at most 1024 UTF-8 bytes; input is never truncated.",
    );
  const o = normalizeOptions(options);
  const unicode = /[^\x00-\x7f]/.test(payload);
  const segments = unicode
    ? [
        qrcodegen.QrSegment.makeEci(26),
        qrcodegen.QrSegment.makeBytes(Array.from(bytes)),
      ]
    : qrcodegen.QrSegment.makeSegments(payload);
  const code = qrcodegen.QrCode.encodeSegments(
    segments,
    LEVELS[o.ecc],
    1,
    40,
    -1,
    o.boost,
  );
  const matrix = Array.from({ length: code.size }, (_, y) =>
    Array.from({ length: code.size }, (_, x) => code.getModule(x, y)),
  );
  const palette = parsePalette(o.glyph);
  let next = 0;
  const glyphMatrix = matrix.map((row) =>
    row.map((dark) => (dark ? palette[next++ % palette.length] : null)),
  );
  const quiet = 4,
    totalModules = code.size + quiet * 2;
  const rows = [];
  for (let y = -quiet; y < code.size + quiet; y++) {
    let row = "";
    for (let x = -quiet; x < code.size + quiet; x++)
      row += (glyphMatrix[y]?.[x] ?? " ").repeat(o.repeatX);
    for (let i = 0; i < o.repeatY; i++) rows.push(row);
  }
  const recipe = { schema: "aqrobat-recipe-v2", payload, options: o };
  return {
    recipe,
    matrix,
    palette,
    glyphMatrix,
    rows,
    text: rows.join("\n") + "\n",
    quiet,
    totalModules,
    modules: code.size,
    version: code.version,
    utf8Bytes: bytes.length,
    eci: unicode ? 26 : null,
    requestedEcc: o.ecc,
    actualEcc: ["L", "M", "Q", "H"][code.errorCorrectionLevel.ordinal],
    characterColumns: totalModules * o.repeatX,
    characterRows: rows.length,
    scanStatus: "untested",
  };
}

export function fromRecipe(value) {
  if (
    !value ||
    !["aqrobat-recipe-v1", "aqrobat-recipe-v2"].includes(value.schema) ||
    typeof value.payload !== "string" ||
    !value.options
  )
    throw new TypeError("Expected an Aqrobat v1 or v2 recipe.");
  if (value.schema === "aqrobat-recipe-v1")
    validateGlyph({ ...DEFAULTS, ...value.options }.glyph);
  const qr = generate(value.payload, value.options);
  qr.recipe.schema = value.schema;
  return qr;
}

export function recipeKey(recipe) {
  const qr = fromRecipe(recipe);
  return JSON.stringify(qr.recipe);
}

export function escapeXml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}

/** Font-dependent glyph SVG. No dark module rectangles or hidden solid QR. */
export function toSvg(qr) {
  const o = qr.recipe.options;
  const cw = o.width / qr.characterColumns,
    ch = o.width / qr.characterRows;
  const fs = Math.min(cw / 0.6, ch) * 0.95;
  const font =
    o.font === "monospace" ? "monospace" : `&quot;${o.font}&quot;,monospace`;
  const nodes = [];
  qr.matrix.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (!dark) return;
      for (let dy = 0; dy < o.repeatY; dy++)
        for (let dx = 0; dx < o.repeatX; dx++)
          nodes.push(
            `<text x="${((x + qr.quiet) * o.repeatX + dx + 0.5) * cw}" y="${((y + qr.quiet) * o.repeatY + dy + 0.5) * ch}">${escapeXml(qr.glyphMatrix[y][x])}</text>`,
          );
    }),
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${o.width}" height="${o.width}" viewBox="0 0 ${o.width} ${o.width}" role="img" aria-label="Experimental glyph QR"><rect width="100%" height="100%" fill="white"/><g fill="black" stroke="black" stroke-width="${fs * o.stroke}" paint-order="stroke fill" font-family="${font}" font-size="${fs}" font-weight="700" text-anchor="middle" dominant-baseline="central">${nodes.join("")}</g></svg>\n`;
}

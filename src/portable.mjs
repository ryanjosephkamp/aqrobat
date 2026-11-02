import { validateGlyph, cornerPart } from "./core.mjs";

export const TILES_LAYOUT = "aqrobat-tiles-v1";
export const BLOCKS_LAYOUT = "aqrobat-blocks-v1";
export const PASTE_LAYOUT = "aqrobat-paste-v1";
export const LIGHT_TILE = "⬜";
// Dark tiles a phone can tell from the light tile. Every emoji in one emoji
// font shares an advance, so rows align whatever font surrounds them.
export const SQUARES = Object.freeze(
  [
    ["⬛", "Black"],
    ["🟦", "Blue"],
    ["🟪", "Purple"],
    ["🟫", "Brown"],
    ["🟥", "Red"],
    ["🟩", "Green"],
  ].map(([glyph, color]) => Object.freeze({ glyph, name: `${color} squares` })),
);
export const DARK_TILES = Object.freeze(SQUARES.map((s) => s.glyph));

// Emoji and East Asian glyphs usually occupy a full em. The receiving font
// still controls advances; this classification is a portable approximation.
export function wideGlyph(s) {
  return /[\p{Emoji_Presentation}\uFE0F\u200D\u3000-\u9FFF\uFF01-\uFF60]/u.test(
    s,
  );
}

function matrixRows(qr, dark, light, across, down, quiet) {
  for (const [name, value, max] of [
    ["across", across, 4],
    ["down", down, 4],
    ["quiet", quiet, 4],
  ])
    if (!Number.isInteger(value) || value < 1 || value > max)
      throw new RangeError(`Use an integer ${name} from 1 to ${max}.`);
  validateGlyph(dark);
  const rows = [];
  for (let y = -quiet; y < qr.modules + quiet; y++) {
    let row = "";
    for (let x = -quiet; x < qr.modules + quiet; x++)
      row += (qr.matrix[y]?.[x] ? dark : light).repeat(across);
    for (let i = 0; i < down; i++) rows.push(row);
  }
  return rows;
}

/**
 * Emoji squares for destinations that pick their own font: chat, notes, posts.
 * The border defaults to two light tiles: in editor tests the smaller code fit
 * narrow columns that a four-tile border overflowed.
 */
export function tileText(
  qr,
  { dark = "⬛", across = 1, down = 1, quiet = 2 } = {},
) {
  const rows = matrixRows(qr, dark, LIGHT_TILE, across, down, quiet);
  return {
    text: rows.join("\n") + "\n",
    rows,
    across,
    down,
    quiet,
    dark,
    layout: TILES_LAYOUT,
  };
}

/** Full blocks and spaces for monospace destinations such as code blocks. */
export function blockText(
  qr,
  { dark = "█", across = 2, down = 1, quiet = qr.quiet, fence = false } = {},
) {
  const rows = matrixRows(qr, dark, " ", across, down, quiet);
  const text = rows.join("\n") + "\n";
  return {
    text: fence ? "```\n" + text + "```\n" : text,
    rows,
    across,
    down,
    quiet,
    dark,
    fence,
    layout: BLOCKS_LAYOUT,
  };
}

// Light squares and corner markers for emoji other than the squares. Apps
// such as Gmail draw ⬜ as a light gray tile about as bright as most emoji,
// so other emoji get the mostly white ▫️, and the three corner markers are
// drawn in ⬛ so a camera can find the code.
export const LIGHT_DOT = "▫️";
export const CORNER_TILE = "⬛";

/**
 * True for emoji codes other than the squares whose recipe has no parts.
 * Their pasted text draws the corner markers in ⬛. A recipe with parts
 * says what its corners are instead.
 */
export function usesCorners(qr) {
  return (
    !qr.recipe.options.parts &&
    qr.palette.every(wideGlyph) &&
    !qr.palette.every((glyph) => DARK_TILES.includes(glyph))
  );
}

/** True for the dark modules of the three finder patterns. */
export function finderModule(qr, x, y) {
  return !!qr.matrix[y]?.[x] && cornerPart(qr.modules, x, y) !== null;
}

/**
 * The light squares in pasted text: the code's own light character if it
 * has one, ⬜ for emoji squares, ▫️ for other emoji, and spaces otherwise.
 */
export function pasteLight(qr) {
  if (qr.light) return qr.light;
  return !qr.glyphs.every(wideGlyph)
    ? null
    : qr.glyphs.every((glyph) => DARK_TILES.includes(glyph))
      ? LIGHT_TILE
      : LIGHT_DOT;
}

/**
 * The code's own characters as plain text, for apps that pick their own
 * font. Emoji keep their shape in any font that shows emoji; their light
 * squares are pasteLight(qr), and recipes without parts get ⬛ corners as
 * usesCorners(qr) says. Letters and symbols take two characters per square,
 * with spaces between unless the code has a light character; they line up
 * only in a monospace font. Emoji squares and full blocks come out exactly
 * as tileText and blockText make them.
 */
export function pasteText(qr, { quiet = 2, fence = false } = {}) {
  if (!Number.isInteger(quiet) || quiet < 1 || quiet > 4)
    throw new RangeError("Use an integer quiet from 1 to 4.");
  const emoji = qr.glyphs.every(wideGlyph);
  const corners = usesCorners(qr),
    light = pasteLight(qr);
  const cell = (glyph) => glyph.repeat(wideGlyph(glyph) ? 1 : 2);
  const rows = [];
  for (let y = -quiet; y < qr.modules + quiet; y++) {
    let row = "";
    for (let x = -quiet; x < qr.modules + quiet; x++) {
      const glyph = qr.glyphMatrix[y]?.[x];
      row +=
        corners && finderModule(qr, x, y)
          ? CORNER_TILE
          : glyph
            ? cell(glyph)
            : light
              ? cell(light)
              : "  ";
    }
    rows.push(row);
  }
  const text = rows.join("\n") + "\n";
  return {
    text: fence ? "```\n" + text + "```\n" : text,
    rows,
    emoji,
    corners,
    light,
    quiet,
    fence,
    layout: PASTE_LAYOUT,
  };
}

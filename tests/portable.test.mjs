import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { generate } from "../src/core.mjs";
import {
  tileText,
  blockText,
  pasteText,
  LIGHT_TILE,
  LIGHT_DOT,
  CORNER_TILE,
  DARK_TILES,
} from "../src/portable.mjs";
import { clipboardFor, pasteCheck } from "../src/destinations.mjs";

const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
const cells = (row) => [...segmenter.segment(row)].map((s) => s.segment);

test("emoji tiles mirror the matrix with whole tiles and no blanks", () => {
  const qr = generate("https://example.com");
  for (const [across, down, quiet] of [
    [1, 1, 4],
    [2, 1, 2],
  ]) {
    const t = tileText(qr, { across, down, quiet, dark: "🟦" });
    assert.equal(t.text, t.rows.join("\n") + "\n");
    assert.equal(t.rows.length, (qr.modules + quiet * 2) * down);
    assert(!/\s/u.test(t.rows.join("")), "tiles never rely on spaces");
    for (const [i, row] of t.rows.entries()) {
      const tiles = cells(row);
      assert.equal(tiles.length, (qr.modules + quiet * 2) * across);
      const y = Math.floor(i / down) - quiet;
      tiles.forEach((tile, j) => {
        const x = Math.floor(j / across) - quiet;
        assert.equal(tile, qr.matrix[y]?.[x] ? "🟦" : LIGHT_TILE);
      });
    }
  }
});

test("blocks keep monospace columns and fence only on request", () => {
  const qr = generate("hello");
  const b = blockText(qr);
  assert.equal(b.text, b.rows.join("\n") + "\n");
  assert(b.rows.every((row) => cells(row).length === qr.totalModules * 2));
  assert(b.rows.slice(0, qr.quiet).every((row) => !row.trim()));
  const fenced = blockText(qr, { fence: true });
  assert.equal(fenced.text, "```\n" + b.text + "```\n");
  assert.throws(() => blockText(qr, { across: 5 }), RangeError);
  assert.throws(() => tileText(qr, { quiet: 0 }), RangeError);
  assert.throws(() => tileText(qr, { dark: " " }), RangeError);
});

test("CLI writes tiles, blocks, and fenced markdown", () => {
  const cli = new URL("../bin/aqrobat.mjs", import.meta.url).pathname;
  const run = (format) =>
    spawnSync(process.execPath, [cli, "hello", "--format", format], {
      encoding: "utf8",
    });
  const qr = generate("hello", { stroke: 0 });
  assert.equal(run("tiles").stdout, tileText(qr).text);
  assert.equal(run("blocks").stdout, blockText(qr).text);
  assert.equal(run("markdown").stdout, blockText(qr, { fence: true }).text);
});

test("paste text keeps the code's own characters", () => {
  // The tested layouts are special cases of the general one.
  const squares = generate("https://example.com", {
    glyph: "🟪",
    repeatX: 1,
    repeatY: 1,
  });
  assert.equal(pasteText(squares).text, tileText(squares, { dark: "🟪" }).text);
  const blocks = generate("https://example.com", { glyph: "█" });
  assert.equal(
    pasteText(blocks, { quiet: blocks.quiet, fence: true }).text,
    blockText(blocks, { fence: true }).text,
  );
  // Other emoji keep their palette order, with ▫️ in the light squares and
  // ⬛ for the dark squares of the three corner markers.
  const faces = generate("https://example.com", {
    glyph: "🙂🐱",
    repeatX: 1,
    repeatY: 1,
  });
  const t = pasteText(faces);
  assert(t.emoji && t.corners);
  const n = faces.modules;
  const corner = (x, y) =>
    (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
  for (const [i, row] of t.rows.entries())
    cells(row).forEach((cell, j) => {
      const [x, y] = [j - 2, i - 2];
      const glyph = faces.glyphMatrix[y]?.[x];
      assert.equal(
        cell,
        glyph ? (corner(x, y) ? CORNER_TILE : glyph) : LIGHT_DOT,
      );
    });
  assert.equal(pasteText(squares).corners, false);
  // Letters take two characters a square and spaces between.
  const hash = pasteText(generate("https://example.com"));
  assert(!hash.emoji);
  assert.match(hash.rows[2], /^ {4}#{14} {2}/u);
  assert.throws(() => pasteText(faces, { quiet: 0 }), RangeError);
});

test("paste text follows the parts a recipe chooses", () => {
  const segment = (row) => cells(row);
  const grapes = (parts) =>
    generate("https://example.com", {
      glyph: "🍇",
      repeatX: 1,
      repeatY: 1,
      parts,
    });
  // Without parts, emoji get ⬛ corners automatically; with them, the
  // parts decide, so an empty object turns the corners off.
  const auto = pasteText(grapes());
  assert.equal(
    pasteText(grapes({ corners: "⬛", centers: "⬛" })).text,
    auto.text,
  );
  const off = pasteText(grapes({}));
  assert(!off.corners);
  assert.equal(segment(off.rows[2])[2], "🍇");
  assert.equal(off.light, LIGHT_DOT);
  const red = pasteText(grapes({ corners: "🟥", centers: "🟥" }));
  assert.equal(segment(red.rows[2])[2], "🟥");
  assert.equal(segment(red.rows[4])[4], "🟥");
  // A light character replaces ▫️, border included.
  const white = pasteText(grapes({ light: "🤍" }));
  assert.equal(white.rows[0], "🤍".repeat(grapes().modules + 4));
  // Emoji squares with colored corners keep ⬜; letters take a light
  // character twice, as they do their own.
  const squares = generate("https://example.com", {
    glyph: "🟦",
    parts: { corners: "🟥" },
  });
  assert.equal(pasteText(squares).light, LIGHT_TILE);
  assert(pasteCheck(squares, "gmail").ok);
  assert(
    !pasteCheck(
      generate("https://example.com", {
        glyph: "🟦",
        parts: { light: "▫️" },
      }),
      "gmail",
    ).ok,
  );
  const dots = pasteText(
    generate("https://example.com", { glyph: "#", parts: { light: "·" } }),
  );
  assert.match(dots.rows[0], /^·+$/u);
  assert.match(dots.rows[2], /^····#{14}··/u);
});

test("every destination copies the chosen characters", () => {
  const qr = generate("https://example.com", {
    glyph: "🙂",
    repeatX: 1,
    repeatY: 1,
  });
  for (const id of ["slack", "docs", "notes", "discord", "plain"]) {
    assert.equal(clipboardFor(qr, id).text, pasteText(qr).text);
    assert.equal(pasteCheck(qr, id).ok, false);
  }
  assert.equal(
    clipboardFor(qr, "markdown").text,
    pasteText(qr, { quiet: qr.quiet, fence: true }).text,
  );
  assert.equal(
    clipboardFor(qr, "notion").text,
    pasteText(qr, { quiet: qr.quiet }).text,
  );
  assert.deepEqual(clipboardFor(qr, "image"), {
    format: "png",
    html: null,
    text: null,
  });
  assert(pasteCheck(qr, "image").ok);
  for (const tile of DARK_TILES) {
    const square = generate("https://example.com", { glyph: tile });
    assert(pasteCheck(square, "slack").ok);
    assert(pasteCheck(square, "gmail").ok);
    assert.equal(pasteCheck(square, "markdown").ok, false);
  }
  assert(pasteCheck(generate("x", { glyph: "█" }), "notion").ok);
});

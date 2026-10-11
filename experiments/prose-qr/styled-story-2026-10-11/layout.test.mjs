import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { heavyStory } from "./heavy.mjs";
import { STORY } from "../flow/layout.mjs";
const resource = JSON.parse(
  await readFile(
    "docs/research/prose-qr/styled-story-2026-10-11/heavy-atlas-01/results.json",
    "utf8",
  ),
);
const spec = {
  payload: "https://example.com/",
  font: "Impact",
  fontSize: 20,
  quiet: 5,
  ecc: "Q",
  pitch: 160,
  linesPerModule: 8,
  gray: 180,
};
test("native story keeps ordered whole words, explicit separators and no covered text", () => {
  const result = heavyStory(spec, resource);
  const original = STORY.toUpperCase().split(" ");
  const actual = result.plainText.split(/\s+/);
  assert.equal(result.modules, 25);
  assert.equal(result.lines.length, 200);
  assert.equal(result.side, 5600);
  actual.forEach((word, i) =>
    assert.equal(word, original[i % original.length]),
  );
  assert.equal(actual.length, 17040);
  assert.equal(actual.length / original.length, 240);
  assert(result.plainText.endsWith("US."));
  assert.equal(result.structural.ornaments, 0);
  assert(
    result.structural.wordGaps[0] >= resource.fonts.Impact.glyphs[" "].advance,
  );
  assert.equal((result.markup.match(/class="line"/g) || []).length, 200);
  assert(
    !/<(?:img|svg|canvas)\b|background:(?!white)|text-shadow|filter:|opacity:|visibility:|display:none/.test(
      result.markup,
    ),
  );
});
test("measured optical overlap is rejected before rendering", () => {
  assert.throws(
    () => heavyStory({ ...spec, pitch: 144 }, resource),
    /optical overlap/,
  );
});
test("oversized payload is rejected without shortening or fallback", () => {
  assert.throws(() =>
    heavyStory({ ...spec, payload: "x".repeat(10000) }, resource),
  );
});

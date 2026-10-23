import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { layoutArticle } from "./article-v5.mjs";
import { construct, verifyCanonical } from "../design/padding-solver.mjs";

const base = "docs/research/prose-qr/integrated-2026-10-10/mechanism/";
const spec = JSON.parse(await readFile(base + "candidate-01/source-spec.json"));
const html = await readFile(base + "candidate-01/source.html.txt");
const options = JSON.parse(await readFile(base + "options-final-01.json"));
const sha = (b) => createHash("sha256").update(b).digest("hex");

test("The frozen chosen Q source regenerates byte for byte with unchanged inputs", async () => {
  const fresh = layoutArticle(options);
  assert.equal(sha(html), spec.htmlSha256);
  assert.equal(fresh.html, html.toString());
  assert.equal(spec.glyphs.length, 2497);
  assert.equal(spec.fullText, spec.texts.join("\n\n"));
  for (const [path, hash] of Object.entries(spec.sourceHashes))
    assert.equal(sha(await readFile(path)), hash, path);
});

test("Chosen target retains the canonical pinned matrix, ownership and exact URL", () => {
  verifyCanonical(2, "Q", 1);
  const b = construct(2, "Q", 1);
  assert.equal(spec.target.payload, "https://example.com/");
  assert.equal(spec.target.padding, "canonical");
  assert.equal(spec.target.dataCodewords.length, 22);
  assert.equal(spec.target.interleavedCodewords.length, 44);
  assert.equal(b.ownership.blocks.length, 1);
  assert.equal(b.ownership.blocks[0].eccLength, 22);
  assert.deepEqual(spec.target.matrix, b.matrix);
  assert.deepEqual(spec.target.map, b.map);
  assert.deepEqual(spec.target.ownership, b.ownership);
  assert.deepEqual(spec.target.dataCodewords, b.code.dataCodewords);
  assert.deepEqual(
    spec.target.interleavedCodewords,
    b.code.interleavedCodewords,
  );
});

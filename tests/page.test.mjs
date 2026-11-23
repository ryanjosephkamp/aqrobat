import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { generate } from "../src/core.mjs";

const root = new URL("../", import.meta.url);
const payloadField = (html) =>
  html.match(/<textarea\b[^>]*\bid="payload"[^>]*>/)?.[0];

test("long input is refused, never cut, on the page, the offline page and the extension", async () => {
  const pages = {
    "index.html": await readFile(new URL("index.html", root), "utf8"),
    "offline page": await readFile(
      new URL("downloads/aqrobat-offline.html", root),
      "utf8",
    ),
    "extension page": execFileSync(
      "unzip",
      ["-p", "downloads/aqrobat-extension.zip", "index.html"],
      { cwd: root, encoding: "utf8" },
    ),
  };
  // A character limit on the box would cut a pasted link before the byte
  // check sees it, so none of the boxes has one.
  for (const [name, html] of Object.entries(pages)) {
    const field = payloadField(html);
    assert(field, `${name} has no link box`);
    assert(!/\bmaxlength\b/i.test(field), `${name} cuts long input: ${field}`);
  }
  const link = `https://example.com/${"a".repeat(1080)}END-OF-LINK`;
  assert.throws(() => generate(link), RangeError);
  assert.throws(() => generate("é".repeat(513)), RangeError);
  assert.equal(generate("é".repeat(512)).utf8Bytes, 1024);
});

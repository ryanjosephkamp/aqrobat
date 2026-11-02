import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const cli = new URL("../bin/aqrobat.mjs", import.meta.url).pathname;
const run = (args, input) =>
  spawnSync(process.execPath, [cli, ...args], { encoding: "utf8", input });
test("CLI preserves exact stdin including newline and returns structured metadata", () => {
  const r = run(["--format", "json"], "hi\n");
  assert.equal(r.status, 0, r.stderr);
  const qr = JSON.parse(r.stdout);
  assert.equal(qr.recipe.payload, "hi\n");
  assert.equal(qr.scanStatus, "untested");
});
test("output is exclusive and recipe reload is deterministic", () => {
  const dir = mkdtempSync(join(tmpdir(), "aqrobat-cli-"));
  try {
    const path = join(dir, "recipe.json");
    assert.equal(
      run([
        "hello",
        "--glyph",
        "🇺🇸💩👻🛸🇺🇸",
        "--density",
        "1x1",
        "--format",
        "recipe",
        "--out",
        path,
      ]).status,
      0,
    );
    const before = readFileSync(path);
    assert.equal(run(["overwrite", "--out", path]).status, 1);
    assert.deepEqual(readFileSync(path), before);
    const reloaded = run(["--recipe", path, "--format", "recipe"]);
    assert.equal(reloaded.status, 0, reloaded.stderr);
    assert.equal(reloaded.stdout, before.toString());
    assert.equal(run(["--recipe", path, "--glyph", "#"]).status, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("CLI rejects overflow, malformed UTF-8, and unknown flags", () => {
  assert.equal(run(["--format", "json"], "x".repeat(1025)).status, 1);
  assert.equal(run(["--format", "json"], Buffer.from([0xff])).status, 1);
  assert.equal(run(["hello", "--bogus"]).status, 1);
  assert.equal(run(["hello", "--density", "99x99"]).status, 1);
});

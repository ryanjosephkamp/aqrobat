import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { format } from "prettier";
import assert from "node:assert/strict";
export const root = "docs/research/prose-qr/phase-69/";
export const source = "experiments/prose-qr/context-counter-sibling/";
export const sha = (b) => createHash("sha256").update(b).digest("hex");
export async function bytes(p) {
  let n = 0;
  for (const e of await readdir(p, { withFileTypes: true })) {
    const q = p + "/" + e.name;
    n += e.isDirectory() ? await bytes(q) : (await stat(q)).size;
  }
  return n;
}
export async function save(p, b, limit = 3400000) {
  assert(
    (await bytes(root)) + (await bytes(source)) + Buffer.byteLength(b) < limit,
    "Phase69 reserve reached",
  );
  await writeFile(p, b, { flag: "wx" });
  return sha(b);
}
export const json = async (p, v) =>
  save(p, await format(JSON.stringify(v), { parser: "json" }));
export const sources = async (paths) =>
  Object.fromEntries(
    await Promise.all(paths.map(async (p) => [p, sha(await readFile(p))])),
  );

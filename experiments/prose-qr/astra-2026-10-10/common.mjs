import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
export const root = "docs/research/prose-qr/astra-2026-10-10";
export const source = "experiments/prose-qr/astra-2026-10-10";
export const sha = (b) => createHash("sha256").update(b).digest("hex");
export const read = async (p) => JSON.parse(await readFile(p));
export async function walk(p) {
  return (
    await Promise.all(
      (await readdir(p, { withFileTypes: true })).map((e) =>
        e.isDirectory() ? walk(p + "/" + e.name) : [p + "/" + e.name],
      ),
    )
  ).flat();
}
export async function bytes(p) {
  return (
    await Promise.all((await walk(p)).map(async (f) => (await stat(f)).size))
  ).reduce((a, b) => a + b, 0);
}
export async function save(p, b) {
  assert(p.startsWith(root + "/"));
  assert(
    (await bytes(root)) + (await bytes(source)) + Buffer.byteLength(b) <
      35000000,
    "Research allocation exhausted; preserve 5MB closing reserve",
  );
  await writeFile(p, b, { flag: "wx" });
  return sha(b);
}
export const json = async (p, v) => save(p, JSON.stringify(v, null, 2) + "\n");
export const sources = async (paths) =>
  Object.fromEntries(
    await Promise.all(paths.map(async (p) => [p, sha(await readFile(p))])),
  );
export const strict = (s) =>
  s.postReturnIntendedGeometry[0]?.intendedGeometry === true &&
  Object.keys(s.selected).length === 3 &&
  Object.values(s.selected).every(
    (p) =>
      p.quadBalance >= 0.8 &&
      p.nominalSpanFraction >= 0.8 &&
      p.stableRows?.fraction >= 0.8 &&
      p.records.length > 0 &&
      p.records.every(
        (r) => r.metric.completeAxes === 4 && r.metric.worstRMS <= 0.35,
      ) &&
      p.geometric.completeAxes === 4 &&
      p.geometric.worstRMS <= 0.35,
  );
export function checkTime() {
  assert(
    Date.now() < Date.parse("2026-10-10T19:36:57Z"),
    "New-experiment cutoff reached",
  );
}

import { readFile, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { format } from "prettier";
import assert from "node:assert/strict";
const root = "docs/research/prose-qr/session-2026-10-10-d",
  source = "experiments/prose-qr/session-2026-10-10-d",
  sha = (b) => createHash("sha256").update(b).digest("hex"),
  walk = async (p) =>
    (
      await Promise.all(
        (await readdir(p, { withFileTypes: true })).map((e) =>
          e.isDirectory() ? walk(p + "/" + e.name) : [p + "/" + e.name],
        ),
      )
    ).flat();
const verification = JSON.parse(
  await readFile(root + "/verification-final.json"),
);
assert(verification.passed);
const inventory = [];
for (const p of [...(await walk(root)), ...(await walk(source))].sort()) {
  const b = await readFile(p);
  inventory.push({ path: p, bytes: b.length, sha256: sha(b) });
}
const value = {
  at: new Date().toISOString(),
  anchorHead: verification.anchorHead,
  goal: "unsolved",
  cap: 1000000,
  prior: verification.prior,
  phases: verification.phases,
  downloads: verification.downloads,
  sources: {
    [source + "/seal-report.mjs"]: sha(
      await readFile(new URL(import.meta.url)),
    ),
    [root + "/verification-final.json"]: sha(
      await readFile(root + "/verification-final.json"),
    ),
  },
  inventory,
};
const bytes = await format(JSON.stringify(value), { parser: "json" }),
  logical =
    inventory.reduce((s, f) => s + f.bytes, 0) + Buffer.byteLength(bytes);
assert(logical < 1000000);
await writeFile(root + "/custody.json", bytes, { flag: "wx" });
console.log(
  JSON.stringify({
    logicalBytes: logical,
    cap: 1000000,
    inventoryEntries: inventory.length,
    sha256: sha(bytes),
  }),
);

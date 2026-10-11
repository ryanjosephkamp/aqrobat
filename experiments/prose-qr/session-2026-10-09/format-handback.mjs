import { readFile, writeFile, readdir } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { format } from "prettier";
const root = "docs/research/prose-qr/session-2026-10-09/",
  preserved = [];
async function walk(p) {
  for (const e of await readdir(p, { withFileTypes: true })) {
    const q = p + "/" + e.name;
    if (e.isDirectory()) await walk(q);
    else if (/\.(json|md)$/.test(q)) {
      const original = await readFile(q, "utf8"),
        formatted = await format(original, {
          parser: q.endsWith(".json") ? "json" : "markdown",
        });
      if (original !== formatted) {
        await writeFile(q + ".raw.gz", gzipSync(original), { flag: "wx" });
        await writeFile(q, formatted);
        preserved.push(q);
      }
    }
  }
}
await walk(root.slice(0, -1));
await writeFile(
  root + "format-handback.json",
  await format(
    JSON.stringify({
      at: new Date().toISOString(),
      preserved,
      meaning: "Original bytes retained; presentation formatting only",
    }),
    { parser: "json" },
  ),
  { flag: "wx" },
);
console.log(JSON.stringify({ preserved: preserved.length }));

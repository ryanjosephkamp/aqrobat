import { readFile, writeFile, readdir } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { format } from "prettier";
const preserved = [];
async function walk(p) {
  for (const e of await readdir(p, { withFileTypes: true })) {
    const q = p + "/" + e.name;
    if (e.isDirectory()) await walk(q);
    else if (q.endsWith(".json")) {
      const original = await readFile(q, "utf8"),
        formatted = await format(original, { parser: "json" });
      if (original !== formatted) {
        await writeFile(q + ".raw.gz", gzipSync(original), { flag: "wx" });
        await writeFile(q, formatted);
        preserved.push(q);
      }
    }
  }
}
for (let p = 18; p <= 31; p++) await walk(`docs/research/prose-qr/phase-${p}`);
await walk("docs/research/prose-qr/session-2026-10-09");
await writeFile(
  "docs/research/prose-qr/session-2026-10-09/format-final.json",
  await format(
    JSON.stringify({
      at: new Date().toISOString(),
      preserved,
      meaning:
        "Original result bytes retained before presentation formatting; no native pixels or executed source changed",
    }),
    { parser: "json" },
  ),
  { flag: "wx" },
);
console.log(JSON.stringify({ preserved: preserved.length }));

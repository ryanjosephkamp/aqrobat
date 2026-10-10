import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { format } from "prettier";
const root = "docs/research/prose-qr/session-2026-10-10-d/",
  sha = (b) => createHash("sha256").update(b).digest("hex");
const pairs = [
  ["All15", "All 15"],
  ["all15", "all 15"],
  ["images.75", "images. 75"],
  ["of87", "of 87"],
  ["remaining12", "remaining 12"],
  ["in25", "in 25"],
  ["of30", "of 30"],
  ["dimension113", "dimension 113"],
  ["specifies125", "specifies 125"],
  ["fixed0.35", "fixed 0.35"],
  ["PR#1", "PR #1"],
  ["plus15", "plus 15"],
  [",12", ", 12"],
  ["native64", "native 64"],
  ["npmprivate", "npm private"],
  ["draftPR1", "draft PR1"],
  ["retain6002", "retain 6002"],
  ["retains6002", "retains 6002"],
  ["paths,1574", "paths, 1574"],
  ["and14", "and 14"],
  ["Exactly15", "Exactly 15"],
  ["captures,15", "captures, 15"],
  ["receipts,18", "receipts, 18"],
  [
    "captures (including filled resources),75",
    "captures (including filled resources), 75",
  ],
  ["and12", "and 12"],
  ["parity.25", "parity. 25"],
  ["and45", "and 45"],
  ["Original12", "Original 12"],
  ["fresh12", "fresh 12"],
  ["local1:1", "local 1:1"],
  ["matches38", "matches 38"],
  ["fixed64", "fixed 64"],
];
const rows = [];
for (const name of [
  "index.html",
  "README.md",
  "CHECKPOINT.md",
  "HARNESS-NOTES.md",
]) {
  const old = await readFile(root + name, "utf8");
  await writeFile(root + name.replace(/\.(html|md)$/, ".generated.$1"), old, {
    flag: "wx",
  });
  const clean = (s) => pairs.reduce((s, [a, b]) => s.replaceAll(a, b), s);
  const content = name.endsWith(".html")
    ? old
        .split(/(<[^>]*>)/g)
        .map((s, i) => (i % 2 ? s : clean(s)))
        .join("")
    : clean(old);
  const revised = await format(content, {
    parser: name.endsWith(".html") ? "html" : "markdown",
  });
  await writeFile(root + name, revised);
  rows.push({ path: root + name, before: sha(old), after: sha(revised) });
}
await writeFile(
  root + "report-polish.json",
  await format(
    JSON.stringify({
      scope:
        "Readable report spacing only; generated originals retained; scientific phase records untouched",
      rows,
      sources: {
        "experiments/prose-qr/session-2026-10-10-d/polish-report.mjs": sha(
          await readFile(new URL(import.meta.url)),
        ),
      },
    }),
    { parser: "json" },
  ),
  { flag: "wx" },
);

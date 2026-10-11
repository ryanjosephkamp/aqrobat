import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { format } from "prettier";
import assert from "node:assert/strict";
const root = "docs/research/prose-qr/phase-29/",
  sha = (b) => createHash("sha256").update(b).digest("hex");
await mkdir(root + "proposal-01");
const original = "docs/research/prose-qr/phase-27/run-02.json",
  metrics = "docs/research/prose-qr/phase-17/metrics-01/metrics.json";
const base = JSON.parse(await readFile(original)).specs[0],
  g = JSON.parse(await readFile(metrics)).fonts.Monaco.glyphs,
  columns = [],
  widths = [7, 11, 7].map((n) => n * 168),
  words = ["ill", "it", "lit", "till", "lilt", "if"];
assert.equal(base.lines.length, 84);
let next = 0;
for (const width of widths) {
  const lines = [];
  for (let row = 0; row < 300; row++) {
    const selected = [];
    let advance = 0;
    while (true) {
      const word = words[next % words.length],
        a = [...word].reduce((n, c) => n + g[c].advance, 0),
        space = selected.length ? g[" "].advance : 0;
      if (advance + space + a > width - 20) break;
      selected.push(word);
      advance += space + a;
      next++;
    }
    assert(selected.length);
    lines.push(selected.join(" "));
  }
  columns.push(lines);
}
for (let row = 0; row < 84; row++) {
  columns[0][row] = base.lines[row];
  columns[2][row] = base.lines[row];
  columns[0][216 + row] = base.lines[row];
}
const lineStats = columns.map((lines, i) =>
  lines.map((line) => {
    const advance = [...line].reduce((n, c) => n + g[c].advance, 0);
    assert(advance <= widths[i]);
    return advance;
  }),
);
const spec = {
  ...base,
  id: "source-context",
  columnLines: columns,
  columnWidths: widths,
  lines: columns[0],
  payload: null,
  classification:
    "Finder-only three native text columns; disconnected whole words; no portable prose claim",
};
const config = await format(
  JSON.stringify({ batch: "run-01", plan: root + "PLAN.md", specs: [spec] }),
  { parser: "json" },
);
await writeFile(root + "run-01.json", config, { flag: "wx" });
await writeFile(
  root + "proposal-01/manifest.json",
  await format(
    JSON.stringify({
      at: new Date().toISOString(),
      sourceFinderLines: 84,
      preservedRegions: 3,
      columns: 3,
      rowsPerColumn: 300,
      allActualAdvanceWidthsFit: true,
      lineStats,
      sources: Object.fromEntries(
        await Promise.all(
          [
            original,
            metrics,
            root + "PLAN.md",
            "experiments/prose-qr/finder-source-context/proposal.mjs",
          ].map(async (p) => [p, sha(await readFile(p))]),
        ),
      ),
      configSha256: sha(config),
    }),
    { parser: "json" },
  ),
  { flag: "wx" },
);

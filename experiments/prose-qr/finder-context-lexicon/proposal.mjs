import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { format } from "prettier";
import assert from "node:assert/strict";
const root = "docs/research/prose-qr/phase-30/",
  sha = (b) => createHash("sha256").update(b).digest("hex");
await mkdir(root + "proposal-01");
const original = "docs/research/prose-qr/phase-29/run-01.json",
  metrics = "docs/research/prose-qr/phase-17/metrics-01/metrics.json",
  finder = "docs/research/prose-qr/phase-27/run-02.json";
const base = JSON.parse(await readFile(original)).specs[0],
  g = JSON.parse(await readFile(metrics)).fonts.Monaco.glyphs,
  found = JSON.parse(await readFile(finder)).specs[0].lines,
  configs = [];
for (const [index, word] of ["ill", "it"].entries()) {
  const columns = base.columnWidths.map((width) => {
    const a = [...word].reduce((n, c) => n + g[c].advance, 0),
      count = Math.floor((width - 20 + g[" "].advance) / (a + g[" "].advance)),
      line = Array(count).fill(word).join(" ");
    assert([...line].reduce((n, c) => n + g[c].advance, 0) <= width);
    return Array(300).fill(line);
  });
  for (let row = 0; row < 84; row++) {
    columns[0][row] = found[row];
    columns[2][row] = found[row];
    columns[0][216 + row] = found[row];
  }
  const spec = {
      ...base,
      id: "context-" + word,
      contextLexicon: [word],
      columnLines: columns,
      lines: columns[0],
    },
    path = root + `run-0${index + 1}.json`,
    content = await format(
      JSON.stringify({
        batch: `run-0${index + 1}`,
        plan: root + "PLAN.md",
        specs: [spec],
      }),
      { parser: "json" },
    );
  await writeFile(path, content, { flag: "wx" });
  configs.push({ path, sha256: sha(content), contextWord: word });
}
await writeFile(
  root + "proposal-01/manifest.json",
  await format(
    JSON.stringify({
      at: new Date().toISOString(),
      configs,
      sources: Object.fromEntries(
        await Promise.all(
          [
            original,
            metrics,
            finder,
            root + "PLAN.md",
            "experiments/prose-qr/finder-context-lexicon/proposal.mjs",
          ].map(async (p) => [p, sha(await readFile(p))]),
        ),
      ),
    }),
    { parser: "json" },
  ),
  { flag: "wx" },
);

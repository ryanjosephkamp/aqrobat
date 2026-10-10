import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { format } from "prettier";
import assert from "node:assert/strict";
import { finderMatrix } from "../finder-native/layout.mjs";

const root = "docs/research/prose-qr/phase-32/";
const source = "experiments/prose-qr/context-stability/";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const metricsPath = "docs/research/prose-qr/phase-17/metrics-01/metrics.json";
const metrics = JSON.parse(await readFile(metricsPath));
const glyphs = metrics.fonts.Monaco.glyphs;
const banks = {
  dark: metrics.words.dark,
  light: metrics.words.light.filter((w) => w !== "i"),
};
const unit = 168,
  size = 14,
  leading = 14,
  field = 25 * unit;
const advance = glyphs[" "].advance;
assert(Object.values(glyphs).every((g) => g.advance === advance));
const cols = Math.floor(field / advance),
  rows = field / leading;
assert.equal(cols, 499);
assert.equal(rows, 300);
const matrix = finderMatrix(25);
const regions = matrix.flatMap((r, y) =>
  r.flatMap((b, x) =>
    b ? [[x * unit, y * unit, (x + 1) * unit, (y + 1) * unit]] : [],
  ),
);
const words = [...banks.dark, ...banks.light].map((word) => ({
  word,
  dark: banks.dark.includes(word),
  mass: [...word].reduce((n, c) => n + glyphs[c].inkMass, 0),
}));
const writeJSON = async (path, data) =>
  writeFile(path, await format(JSON.stringify(data), { parser: "json" }), {
    flag: "wx",
  });
await mkdir(root + "proposal-01");
const proposals = [];
for (const [index, guard] of [0, 0.12, 0.24].entries()) {
  const darkAt = (x, y) =>
    regions.some(
      ([x0, y0, x1, y1]) =>
        x >= x0 - guard * unit &&
        x < x1 + guard * unit &&
        y >= y0 - guard * unit &&
        y < y1 + guard * unit,
    );
  const lines = [],
    model = [];
  for (let row = 0; row < rows; row++) {
    const y = (row + 0.5) * leading;
    const dp = new Float64Array(cols + 1).fill(Infinity),
      choices = [];
    dp[cols] = 0;
    for (let pos = cols - 1; pos >= 0; pos--) {
      for (const item of words) {
        const end = pos + item.word.length;
        if (end > cols) continue;
        const terminal = end === cols,
          next = terminal ? end : end + 1;
        if (next > cols || !Number.isFinite(dp[next])) continue;
        if (item.dark !== darkAt((pos + item.word.length / 2) * advance, y))
          continue;
        let cost = dp[next];
        for (const [i, c] of [...item.word].entries())
          cost +=
            (darkAt((pos + i + 0.5) * advance, y) ? -1 : 1) * glyphs[c].inkMass;
        if (cost < dp[pos]) {
          dp[pos] = cost;
          choices[pos] = { word: item.word, next, terminal };
        }
      }
    }
    assert(
      Number.isFinite(dp[0]),
      `Packing rejection guard=${guard} row=${row}`,
    );
    const selected = [];
    let p = 0;
    while (true) {
      const c = choices[p];
      assert(c);
      selected.push(c.word);
      if (c.terminal) break;
      p = c.next;
    }
    const line = selected.join(" ");
    assert.equal(line.length, cols);
    assert(line.length * advance <= field);
    lines.push(line);
    model.push({
      row,
      cost: dp[0],
      words: selected.length,
      advance: line.length * advance,
    });
  }
  const spec = {
    id: `continuous-guard-${index}`,
    font: "Monaco",
    platformFamily: "Monaco",
    size,
    leading,
    unit,
    guard,
    lines,
    matrix,
    modules: 25,
    quiet: 5,
    textField: field,
    align: "left",
    offset: 0,
    dx: 0,
    payload: null,
    classification:
      "Finder-only continuous native words; not semantic prose or a phone candidate",
  };
  const path = root + `run-0${index + 1}.json`;
  await writeJSON(path, {
    batch: `run-0${index + 1}`,
    plan: root + "PLAN.md",
    specs: [spec],
  });
  await writeJSON(root + `proposal-01/model-${index + 1}.json`, {
    banks,
    columns: cols,
    rows,
    advance,
    guard,
    model,
  });
  proposals.push({ path, sha256: sha(await readFile(path)), guard });
}
await writeJSON(root + "proposal-01/manifest.json", {
  at: new Date().toISOString(),
  planned: 3,
  proposals,
  sources: Object.fromEntries(
    await Promise.all(
      [
        metricsPath,
        root + "PLAN.md",
        source + "proposal.mjs",
        "experiments/prose-qr/finder-native/layout.mjs",
      ].map(async (p) => [p, sha(await readFile(p))]),
    ),
  ),
});
console.log(
  JSON.stringify({ proposals: proposals.length, rows, columns: cols }),
);

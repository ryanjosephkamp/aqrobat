import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { format } from "prettier";
import { finderMatrix } from "../finder-native/layout.mjs";
const root = "docs/research/prose-qr/phase-35/",
  source = "experiments/prose-qr/context-densewords/",
  metricsPath = "docs/research/prose-qr/phase-17/metrics-01/metrics.json";
const sha = (b) => createHash("sha256").update(b).digest("hex"),
  metrics = JSON.parse(await readFile(metricsPath)),
  g = metrics.fonts.Monaco.glyphs,
  advance = g[" "].advance;
const banks = {
  dark: ["MUM", "MUMMY", "MMMMMMMM"],
  light: metrics.words.light.filter((w) => w !== "i"),
};
const words = [...banks.dark, ...banks.light].map((word) => ({
  word,
  dark: banks.dark.includes(word),
}));
const matrix = finderMatrix(25),
  guard = 0.12,
  penalty = 160;
const json = async (p, v) =>
  writeFile(p, await format(JSON.stringify(v), { parser: "json" }), {
    flag: "wx",
  });
await mkdir(root + "proposal-01");
const configs = [];
let active = null;
try {
  for (const [index, unit] of [210].entries()) {
    active = { index, unit };
    const field = unit * 25,
      cols = Math.floor(field / advance),
      rows = field / 14;
    assert(Number.isInteger(rows));
    const regions = matrix.flatMap((r, y) =>
      r.flatMap((b, x) =>
        b ? [[x * unit, y * unit, (x + 1) * unit, (y + 1) * unit]] : [],
      ),
    );
    const darkAt = (x, y) =>
      regions.some(
        ([x0, y0, x1, y1]) =>
          x >= x0 - guard * unit &&
          x < x1 + guard * unit &&
          y >= y0 - guard * unit &&
          y < y1 + guard * unit,
      );
    const lines = [],
      model = [],
      previous = [];
    for (let row = 0; row < rows; row++) {
      active = { index, unit, row };
      const y = (row + 0.5) * 14,
        dp = new Float64Array(cols + 1).fill(Infinity),
        choices = [];
      dp[cols] = 0;
      for (let pos = cols - 1; pos >= 0; pos--)
        for (const item of words) {
          const end = pos + item.word.length;
          if (end > cols) continue;
          const terminal = end === cols,
            next = terminal ? end : end + 1;
          if (
            next > cols ||
            (!terminal && next === cols) ||
            !Number.isFinite(dp[next])
          )
            continue;
          if (item.dark !== darkAt((pos + item.word.length / 2) * advance, y))
            continue;
          let cost = dp[next];
          for (const [i, c] of [...item.word].entries())
            cost +=
              (darkAt((pos + i + 0.5) * advance, y) ? -1 : 1) * g[c].inkMass;
          if (!terminal)
            for (const p of previous) if (p.has(end)) cost += penalty;
          if (cost < dp[pos]) {
            dp[pos] = cost;
            choices[pos] = { word: item.word, next, terminal, end };
          }
        }
      assert(Number.isFinite(dp[0]), "Whole-word source packing rejection");
      const selected = [],
        spaces = [];
      let p = 0;
      while (true) {
        const c = choices[p];
        assert(c);
        selected.push(c.word);
        if (c.terminal) break;
        spaces.push(c.end);
        p = c.next;
      }
      const line = selected.join(" ");
      assert.equal(line.length, cols);
      assert(line.length * advance <= field);
      model.push({
        row,
        cost: dp[0],
        words: selected.length,
        spaces,
        alignedPrevious: previous.map(
          (s) => spaces.filter((p) => s.has(p)).length,
        ),
      });
      lines.push(line);
      previous.unshift(new Set(spaces));
      previous.splice(2);
    }
    const spec = {
      id: `stagger-${unit}`,
      font: "Monaco",
      platformFamily: "Monaco",
      size: 14,
      leading: 14,
      unit,
      guard,
      spaceStaggerPenalty: penalty,
      lookbackRows: 2,
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
        "Finder-only whole words, regular-black native font; not semantic prose",
    };
    const path = root + `run-0${index + 1}.json`;
    await json(path, {
      batch: `run-0${index + 1}`,
      plan: root + "PLAN.md",
      specs: [spec],
    });
    await json(root + `proposal-01/model-${index + 1}.json`, {
      unit,
      cols,
      rows,
      advance,
      banks,
      penalty,
      model,
    });
    configs.push({ path, sha256: sha(await readFile(path)), unit, rows, cols });
  }
  await json(root + "proposal-01/manifest.json", {
    at: new Date().toISOString(),
    configs,
    sources: Object.fromEntries(
      await Promise.all(
        [
          source + "proposal.mjs",
          metricsPath,
          root + "PLAN.md",
          "experiments/prose-qr/finder-native/layout.mjs",
        ].map(async (p) => [p, sha(await readFile(p))]),
      ),
    ),
  });
  console.log(JSON.stringify({ configs: configs.length }));
} catch (e) {
  await json(root + "proposal-01/error.json", {
    at: new Date().toISOString(),
    active,
    savedConfigs: configs,
    error: e.stack,
    sourceSha256: sha(await readFile(source + "proposal.mjs")),
  });
  throw e;
}

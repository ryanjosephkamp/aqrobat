import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { format } from "prettier";
import assert from "node:assert/strict";
import { finderMatrix } from "../finder-native/layout.mjs";
const root = "docs/research/prose-qr/phase-38/",
  source = "experiments/prose-qr/context-row-period/",
  metricsPath = root + "metrics-01/metrics.json";
const sha = (b) => createHash("sha256").update(b).digest("hex"),
  json = async (p, v) =>
    writeFile(p, await format(JSON.stringify(v), { parser: "json" }), {
      flag: "wx",
    });
await mkdir(root + "proposal-01");
let active = null;
try {
  const metrics = JSON.parse(await readFile(metricsPath)),
    g = metrics.glyphs,
    banks = {},
    rejected = [];
  for (const [k, words] of Object.entries(metrics.words))
    banks[k] = words.filter((word) => {
      let x = 0,
        right = null,
        minGap = Infinity;
      for (const c of word) {
        const a = g[c];
        if (right !== null) minGap = Math.min(minGap, x - a.left - right);
        right = x + a.right;
        x += a.advance;
      }
      if (minGap < 0) {
        rejected.push({ kind: k, word, minGap });
        return false;
      }
      return true;
    });
  assert(banks.dark.length && banks.light.length, "No usable word bank");
  const alphabet = [...new Set(Object.values(banks).flat().join(""))],
    envelope =
      Math.max(...alphabet.map((c) => g[c].ascent)) +
      Math.max(...alphabet.map((c) => g[c].descent));
  assert(14 - envelope >= 2, "Native source row-clearance rejection");
  const words = [...banks.dark, ...banks.light].map((word) => ({
    word,
    dark: banks.dark.includes(word),
    advance: [...word].reduce((n, c) => n + g[c].advance, 0),
  }));
  const unit = 204.8,
    guard = 0.12,
    field = 25 * unit,
    rows = Math.floor(field / 14),
    max = Math.floor((field - 20) * 8),
    stop = Math.floor((field - 50) * 8),
    space = Math.round(g[" "].advance * 8),
    matrix = finderMatrix(25);
  const regions = matrix.flatMap((r, y) =>
    r.flatMap((b, x) =>
      b ? [[x * unit, y * unit, (x + 1) * unit, (y + 1) * unit]] : [],
    ),
  );
  const costs = new Map(),
    lines = [],
    model = [],
    previous = [];
  for (let row = 0; row < rows; row++) {
    active = { row };
    const y = (row + 0.5) * 14;
    const raw = regions
        .filter(
          ([, y0, , y1]) => y >= y0 - guard * unit && y < y1 + guard * unit,
        )
        .map(([x0, , x1]) => [x0 - guard * unit, x1 + guard * unit])
        .sort((a, b) => a[0] - b[0]),
      intervals = [];
    for (const a of raw) {
      if (intervals.length && a[0] <= intervals.at(-1)[1])
        intervals.at(-1)[1] = Math.max(intervals.at(-1)[1], a[1]);
      else intervals.push([...a]);
    }
    const key = JSON.stringify(intervals),
      darkAt = (x) => intervals.some(([a, b]) => x >= a && x < b);
    if (!costs.has(key))
      costs.set(
        key,
        words.map((item) => {
          const a = new Float64Array(max + 1).fill(Infinity);
          for (let p = 0; p < stop; p++) {
            if (item.dark !== darkAt(p / 8 + item.advance / 2)) continue;
            let x = p / 8,
              value = 0;
            for (const c of item.word) {
              value += (darkAt(x + g[c].advance / 2) ? -1 : 1) * g[c].inkMass;
              x += g[c].advance;
            }
            a[p] = value;
          }
          return a;
        }),
      );
    const band = costs.get(key),
      dp = new Float64Array(max + 1).fill(Infinity),
      choices = [];
    for (let p = stop; p <= max; p++) dp[p] = 0;
    for (let p = stop - 1; p >= 0; p--)
      for (const [index, item] of words.entries()) {
        if (!Number.isFinite(band[index][p])) continue;
        const end = p + Math.round(item.advance * 8);
        if (end > max) continue;
        const terminal = end >= stop,
          next = terminal ? end : end + space;
        if (
          next > max ||
          (!terminal && next >= stop) ||
          !Number.isFinite(dp[next])
        )
          continue;
        let value = band[index][p] + dp[next];
        if (!terminal)
          for (const s of previous)
            if (s.has(Math.round((p / 8 + item.advance) / 3))) value += 160;
        if (value < dp[p]) {
          dp[p] = value;
          choices[p] = { word: item.word, next, terminal };
        }
      }
    assert(Number.isFinite(dp[0]), "Proportional whole-word packing rejection");
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
    let advance = 0;
    const spaces = [];
    for (const c of line) {
      if (c === " ") spaces.push(advance);
      advance += g[c].advance;
    }
    assert(advance <= field, "Actual native advance overflow");
    lines.push(line);
    model.push({
      row,
      advance,
      unusedWidth: field - advance,
      words: selected.length,
      cost: dp[0],
      spaces,
      alignedPrevious: previous.map(
        (s) => spaces.filter((p) => s.has(Math.round(p / 3))).length,
      ),
    });
    previous.unshift(new Set(spaces.map((p) => Math.round(p / 3))));
    previous.splice(2);
  }
  const spec = {
    id: "native-row-period-context",
    font: metrics.font,
    platformFamily: metrics.font,
    size: 14,
    leading: 14,
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
      "Model-selected uniform native face; finder-only disconnected words; no semantic prose claim",
  };
  await json(root + "run-01.json", {
    batch: "run-01",
    plan: root + "PLAN.md",
    specs: [spec],
  });
  await json(root + "proposal-01/model.json", {
    banks,
    rejected,
    envelope,
    clearance: 14 - envelope,
    sourceTick: 1 / 8,
    spaceStaggerBin: 3,
    sourceRightSlack: [20, 50],
    bands: costs.size,
    model,
  });
  await json(root + "proposal-01/manifest.json", {
    at: new Date().toISOString(),
    plannedNative: 1,
    rows,
    configs: [
      {
        path: root + "run-01.json",
        sha256: sha(await readFile(root + "run-01.json")),
      },
    ],
    sources: Object.fromEntries(
      await Promise.all(
        [
          metricsPath,
          root + "metrics-01/selection.json",
          source + "proposal.mjs",
          root + "PLAN.md",
          "experiments/prose-qr/finder-native/layout.mjs",
        ].map(async (p) => [p, sha(await readFile(p))]),
      ),
    ),
  });
  console.log(
    JSON.stringify({
      configs: 1,
      rows,
      bands: costs.size,
      banks,
      rejectedWords: rejected.length,
    }),
  );
} catch (e) {
  await json(root + "proposal-01/error.json", {
    at: new Date().toISOString(),
    active,
    error: e.stack,
    sourceSha256: sha(await readFile(source + "proposal.mjs")),
  });
  throw e;
}

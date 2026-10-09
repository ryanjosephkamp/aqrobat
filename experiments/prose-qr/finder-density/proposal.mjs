import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { format } from "prettier";
import assert from "node:assert/strict";
const root = "docs/research/prose-qr/phase-10/",
  sha = (b) => createHash("sha256").update(b).digest("hex");
await mkdir(root + "proposal-02");
const path = "docs/research/prose-qr/phase-06/font-metrics.json",
  data = await readFile(path),
  g = JSON.parse(data).fonts["Monaco|400"].glyphs;
const finder = (x, y) =>
  x === 0 ||
  x === 6 ||
  y === 0 ||
  y === 6 ||
  (x >= 2 && x <= 4 && y >= 2 && y <= 4);
const banks = [
    "MUM MOM MUMMY MEMORY MEMBER MINIMUM MONO NUMB WOMEN WARM COMMON".split(
      " ",
    ),
    "mum meme mummer mom murmur common moon morn women mammal warm".split(" "),
  ],
  thin = "ill it if lit till lilt lift tilt".split(" ");
const proposals = [];
for (const [index, dense] of banks.entries()) {
  const words = [...dense, ...thin],
    max = 83,
    slack = Math.max(...words.map((w) => w.length)) + 1,
    lines = [],
    model = [];
  let previousSpaces = new Set();
  for (let row = 0; row < 56; row++) {
    const dp = new Float64Array(max + 1).fill(Infinity),
      choices = [];
    for (let p = max - slack; p <= max; p++) dp[p] = 0;
    for (let p = max - slack - 1; p >= 0; p--)
      for (const word of words) {
        const end = p + word.length;
        if (end > max) continue;
        const terminal = end >= max - slack,
          next = terminal ? end : end + 1;
        if (next > max || !Number.isFinite(dp[next])) continue;
        let cost = 0;
        for (const [i, c] of [...word].entries()) {
          const x = (p + i + 0.5) * g[c].advance,
            y = (row + 0.5) * 18;
          cost +=
            (finder(Math.floor(x / 144), Math.floor(y / 144)) ? -1 : 1) *
            g[c].inkMass;
        }
        if (!terminal && previousSpaces.has(end)) cost += 80;
        cost += dp[next];
        if (cost < dp[p]) {
          dp[p] = cost;
          choices[p] = { word, end, next, terminal };
        }
      }
    assert(Number.isFinite(dp[0]));
    let p = 0;
    const selected = [],
      spaces = [];
    while (true) {
      const c = choices[p];
      assert(c);
      selected.push(c.word);
      if (c.terminal) break;
      spaces.push(c.end);
      p = c.next;
    }
    const line = selected.join(" "),
      advance = [...line].reduce((n, c) => n + g[c].advance, 0);
    assert(advance <= 1008);
    lines.push(line);
    model.push({
      row,
      cost: dp[0],
      spaces,
      alignedSpaces: spaces.filter((p) => previousSpaces.has(p)).length,
      advance,
      characters: line.length,
    });
    previousSpaces = new Set(spaces);
  }
  const spec = {
    id: "monaco-staggered-" + index,
    font: "Monaco",
    lines,
    unit: 144,
    size: 20,
    leading: 18,
    offset: 0,
    dx: 0,
    align: "left",
    classification:
      "Native source density and space staggering; not meaningful prose",
  };
  proposals.push(spec);
  await writeFile(
    root + `proposal-02/model-${index}.json`,
    await format(
      JSON.stringify({ spec, model, dense, thin, spaceAlignmentPenalty: 80 }),
      { parser: "json" },
    ),
    { flag: "wx" },
  );
}
const config = await format(
  JSON.stringify({
    batch: "dense-02",
    plan: root + "PLAN-02.md",
    specs: proposals,
  }),
  { parser: "json" },
);
await writeFile(root + "dense-02.json", config, { flag: "wx" });
await writeFile(
  root + "proposal-02/manifest.json",
  await format(
    JSON.stringify({
      at: new Date().toISOString(),
      sources: {
        [path]: sha(data),
        "experiments/prose-qr/finder-density/proposal.mjs": sha(
          await readFile(new URL(import.meta.url)),
        ),
        [root + "PLAN-02.md"]: sha(await readFile(root + "PLAN-02.md")),
      },
      configSha256: sha(config),
      proposals: 2,
    }),
    { parser: "json" },
  ),
  { flag: "wx" },
);
console.log(JSON.stringify({ proposals: 2, rowsEach: 56, leading: 18 }));

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { format } from "prettier";
import assert from "node:assert/strict";
const root = "docs/research/prose-qr/phase-11/",
  sha = (b) => createHash("sha256").update(b).digest("hex");
await mkdir(root + "proposal-01");
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
for (const [index, dense] of banks.slice(0, 1).entries()) {
  const words = [...dense, ...thin],
    max = 83,
    slack = Math.max(...words.map((w) => w.length)) + 1,
    lines = [],
    model = [];
  let previousSpaces = new Set();
  for (let row = 0; row < 53; row++) {
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
            y = (row + 0.5) * 19;
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
    leading: 19,
    offset: 0,
    dx: 0,
    align: "left",
    classification:
      "Native source density and space staggering; not meaningful prose",
  };
  const alphabet = [...new Set(lines.join("").replaceAll(" ", ""))];
  const envelope =
    Math.max(...alphabet.map((c) => g[c].ascent)) +
    Math.max(...alphabet.map((c) => g[c].descent));
  assert(19 - envelope >= 2, "Source ink clearance gate");
  proposals.push(
    { ...spec, id: "monaco-left", align: "left" },
    { ...spec, id: "monaco-justified", align: "justify" },
  );
  await writeFile(
    root + `proposal-01/model-${index}.json`,
    await format(
      JSON.stringify({ spec, model, dense, thin, spaceAlignmentPenalty: 80 }),
      { parser: "json" },
    ),
    { flag: "wx" },
  );
}
const config = await format(
  JSON.stringify({
    batch: "run-01",
    plan: root + "PLAN.md",
    specs: proposals,
  }),
  { parser: "json" },
);
await writeFile(root + "run-01.json", config, { flag: "wx" });
await writeFile(
  root + "proposal-01/manifest.json",
  await format(
    JSON.stringify({
      at: new Date().toISOString(),
      sources: {
        [path]: sha(data),
        "experiments/prose-qr/finder-justify/proposal.mjs": sha(
          await readFile(new URL(import.meta.url)),
        ),
        [root + "PLAN.md"]: sha(await readFile(root + "PLAN.md")),
      },
      configSha256: sha(config),
      proposals: 2,
    }),
    { parser: "json" },
  ),
  { flag: "wx" },
);
console.log(JSON.stringify({ proposals: 2, rowsEach: 53, leading: 18 }));

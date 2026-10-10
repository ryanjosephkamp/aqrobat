import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { format } from "prettier";
import assert from "node:assert/strict";
const root = "docs/research/prose-qr/phase-12/",
  sha = (b) => createHash("sha256").update(b).digest("hex");
await mkdir(root + "proposal-01");
const path = "docs/research/prose-qr/phase-06/font-metrics.json",
  data = await readFile(path),
  original = JSON.parse(data).fonts["Monaco|400"].glyphs;
const finder = (x, y) =>
  x === 0 ||
  x === 6 ||
  y === 0 ||
  y === 6 ||
  (x >= 2 && x <= 4 && y >= 2 && y <= 4);
const words = "BOB BOBBY BEE BODE ODD DEED BED BUD BOO BOOM i".split(" "),
  proposals = [];
for (const [size, leading] of [
  [20, 19],
  [14, 14],
]) {
  const scale = size / 20,
    g = Object.fromEntries(
      Object.entries(original).map(([c, m]) => [
        c,
        {
          ...m,
          advance: m.advance * scale,
          ascent: m.ascent * scale,
          descent: m.descent * scale,
          inkMass: m.inkMass * scale * scale,
        },
      ]),
    );
  const max = Math.floor(1008 / g.M.advance),
    slack = Math.max(...words.map((w) => w.length)) + 1,
    count = Math.floor(1008 / leading),
    lines = [],
    model = [];
  let previous = new Set();
  for (let row = 0; row < count; row++) {
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
            y = (row + 0.5) * leading;
          cost +=
            (finder(Math.floor(x / 144), Math.floor(y / 144)) ? -1 : 1) *
            g[c].inkMass;
        }
        if (!terminal && previous.has(end)) cost += 80 * scale * scale;
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
      alignedSpaces: spaces.filter((p) => previous.has(p)).length,
      advance,
    });
    previous = new Set(spaces);
  }
  const chars = [...new Set(lines.join("").replaceAll(" ", ""))],
    envelope =
      Math.max(...chars.map((c) => g[c].ascent)) +
      Math.max(...chars.map((c) => g[c].descent));
  assert(leading - envelope >= 2);
  const spec = {
    id: "monaco-native-" + size,
    font: "Monaco",
    lines,
    unit: 144,
    size,
    leading,
    offset: 0,
    dx: 0,
    align: "justify",
    classification:
      "Legible letter-density bound with single-letter light tokens; not prose",
  };
  proposals.push(spec);
  await writeFile(
    root + `proposal-01/model-${size}.json`,
    await format(
      JSON.stringify({
        spec,
        model,
        envelope,
        clearance: leading - envelope,
        costModelScale: scale,
        approximateMetrics: true,
      }),
      { parser: "json" },
    ),
    { flag: "wx" },
  );
}
const config = await format(
  JSON.stringify({ batch: "run-01", plan: root + "PLAN.md", specs: proposals }),
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
        "experiments/prose-qr/finder-density-size/proposal.mjs": sha(
          await readFile(new URL(import.meta.url)),
        ),
        [root + "PLAN.md"]: sha(await readFile(root + "PLAN.md")),
      },
      configSha256: sha(config),
      proposals: proposals.map((s) => ({
        id: s.id,
        size: s.size,
        leading: s.leading,
        rows: s.lines.length,
      })),
    }),
    { parser: "json" },
  ),
  { flag: "wx" },
);
console.log(
  JSON.stringify(
    proposals.map((s) => ({
      id: s.id,
      size: s.size,
      leading: s.leading,
      rows: s.lines.length,
    })),
  ),
);

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { format } from "prettier";
import assert from "node:assert/strict";
import { finderMatrix } from "../finder-native/layout.mjs";
const root = "docs/research/prose-qr/phase-16/",
  out = root + "proposal-03/",
  sha = (b) => createHash("sha256").update(b).digest("hex");
await mkdir(out);
const input = root + "metrics-01/metrics.json",
  data = JSON.parse(await readFile(input)),
  configs = [];
let index = 3;
for (const font of ["Arial Black"])
  for (const unit of [216]) {
    const g = data.fonts[font].glyphs,
      field = 7 * unit,
      leading = 24,
      size = 20,
      rejectedWords = [];
    const banks = Object.fromEntries(
      Object.entries(data.words).map(([kind, words]) => [
        kind,
        words.filter((word) => {
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
            rejectedWords.push({ kind, word, minGap });
            return false;
          }
          return true;
        }),
      ]),
    );
    assert(
      banks.dark.length && banks.light.length,
      "No surviving dark/light words",
    );
    const words = [...new Set([...banks.dark, ...banks.light])].map((word) => ({
        word,
        advance: [...word].reduce((n, c) => n + g[c].advance, 0),
      })),
      max = Math.floor((field - 20) * 8),
      stop = Math.floor((field - 40) * 8),
      lines = [],
      model = [];
    const finder = (x, y) =>
      x === 0 ||
      x === 6 ||
      y === 0 ||
      y === 6 ||
      (x >= 2 && x <= 4 && y >= 2 && y <= 4);
    let previous = new Set();
    for (let row = 0; row < Math.floor(field / leading); row++) {
      const dp = new Float64Array(max + 1).fill(Infinity),
        choices = [];
      for (let p = stop; p <= max; p++) dp[p] = 0;
      for (let p = stop - 1; p >= 0; p--)
        for (const item of words) {
          const end = p + Math.round(item.advance * 8);
          if (end > max) continue;
          const terminal = end + Math.round(g[" "].advance * 8) >= stop,
            next = terminal ? end : end + Math.round(g[" "].advance * 8);
          if (next > max || !Number.isFinite(dp[next])) continue;
          let x = p / 8,
            cost = 0;
          for (const c of item.word) {
            const a = g[c];
            cost +=
              (finder(
                Math.floor((x + a.advance / 2) / unit),
                Math.floor(((row + 0.5) * leading) / unit),
              )
                ? -1
                : 1) * a.inkMass;
            x += a.advance;
          }
          if (!terminal && previous.has(Math.round(x / 3))) cost += 80;
          cost += dp[next];
          if (cost < dp[p]) {
            dp[p] = cost;
            choices[p] = { ...item, next, terminal };
          }
        }
      assert(Number.isFinite(dp[0]));
      let p = 0;
      const selected = [];
      while (true) {
        const c = choices[p];
        assert(c);
        selected.push(c.word);
        if (c.terminal) break;
        p = c.next;
      }
      const line = selected.join(" ");
      let x = 0,
        spaces = [];
      for (const c of line) {
        if (c === " ") spaces.push(x);
        x += g[c].advance;
      }
      assert(x <= field, "Actual source width overflow");
      lines.push(line);
      model.push({ row, cost: dp[0], advance: x, spaces });
      previous = new Set(spaces.map((x) => Math.round(x / 3)));
    }
    const chars = [...new Set(lines.join("").replaceAll(" ", ""))],
      envelope =
        Math.max(...chars.map((c) => g[c].ascent)) +
        Math.max(...chars.map((c) => g[c].descent));
    const spec = {
      id: `native-font-${++index}`,
      font,
      platformFamily: font,
      lines,
      matrix: finderMatrix(25),
      unit,
      size,
      leading,
      offset: 0,
      dx: 0,
      align: "justify",
      payload: null,
      textField: field,
      classification:
        "Uniform regular native face, separate finder text fields; no prose/payload claim",
    };
    const config = await format(
        JSON.stringify({
          batch: `run-0${index}`,
          plan: root + "PLAN.md",
          specs: [spec],
        }),
        { parser: "json" },
      ),
      path = root + `run-0${index}.json`;
    await writeFile(path, config, { flag: "wx" });
    configs.push({ path, sha256: sha(config), font, unit });
    await writeFile(
      out + `model-${index}.json`,
      await format(
        JSON.stringify({
          banks,
          rejectedWords,
          envelope,
          clearance: leading - envelope,
          spec,
          model,
        }),
        { parser: "json" },
      ),
      { flag: "wx" },
    );
  }
await writeFile(
  out + "manifest.json",
  await format(
    JSON.stringify({
      at: new Date().toISOString(),
      configs,
      sources: Object.fromEntries(
        await Promise.all(
          [
            input,
            "experiments/prose-qr/finder-font-page/proposal.mjs",
            root + "PLAN.md",
            "experiments/prose-qr/finder-native/layout.mjs",
          ].map(async (p) => [p, sha(await readFile(p))]),
        ),
      ),
    }),
    { parser: "json" },
  ),
  { flag: "wx" },
);
console.log(JSON.stringify(configs));

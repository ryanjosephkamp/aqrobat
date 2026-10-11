import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { format } from "prettier";
import assert from "node:assert/strict";
import { finderMatrix } from "../finder-native/layout.mjs";
const root = "docs/research/prose-qr/phase-42/",
  source = "experiments/prose-qr/context-word-flat/",
  sha = (b) => createHash("sha256").update(b).digest("hex"),
  json = async (p, v) =>
    writeFile(p, await format(JSON.stringify(v), { parser: "json" }), {
      flag: "wx",
    });
await mkdir(root + "proposal-01");
try {
  const cv = JSON.parse(
    await readFile("docs/research/prose-qr/phase-41/opencv-01/run-01.json"),
  );
  assert.equal(
    cv.points,
    null,
    "Prior ordinary geometry already exists; conditional native slot not authorized by plan",
  );
  const metricsPath = root + "metrics-01/metrics.json",
    m = JSON.parse(await readFile(metricsPath)),
    unit = 10240 / 35,
    field = 25 * unit,
    rows = Math.floor(field / 20),
    tokens = Math.floor((field + 10) / 40),
    guard = 0.12,
    matrix = finderMatrix(25);
  assert(m.selected.score > 0);
  const regions = matrix.flatMap((r, y) =>
    r.flatMap((b, x) =>
      b ? [[x * unit, y * unit, (x + 1) * unit, (y + 1) * unit]] : [],
    ),
  );
  const lines = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: tokens }, (_, k) =>
      regions.some(
        ([x0, y0, x1, y1]) =>
          k * 40 + 15 >= x0 - guard * unit &&
          k * 40 + 15 < x1 + guard * unit &&
          (row + 0.5) * 20 >= y0 - guard * unit &&
          (row + 0.5) * 20 < y1 + guard * unit,
      )
        ? m.selected.dark
        : m.selected.light,
    ).join(" "),
  );
  assert(lines.every((l) => l.length * 10 <= field));
  const spec = {
    id: "matched-native-word-period",
    font: "Monaco",
    platformFamily: "Monaco",
    size: 16,
    leading: 20,
    tracking: m.tracking,
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
      "Regular black native source with fixed positive tracking; disconnected/fabricated words, no semantic prose claim",
  };
  await json(root + "run-01.json", {
    batch: "run-01",
    plan: root + "PLAN.md",
    specs: [spec],
  });
  await json(root + "proposal-01/manifest.json", {
    at: new Date().toISOString(),
    plannedNative: 1,
    rows,
    tokens,
    sourcePitch: 10,
    nativeAdvance: lines[0].length * 10,
    bottomSlack: field - rows * 20,
    rightSlack: field - lines[0].length * 10,
    selected: m.selected,
    configs: [
      {
        path: root + "run-01.json",
        sha256: sha(await readFile(root + "run-01.json")),
      },
    ],
    sources: Object.fromEntries(
      await Promise.all(
        [
          source + "proposal.mjs",
          root + "PLAN.md",
          metricsPath,
          "docs/research/prose-qr/phase-41/opencv-01/run-01.json",
          "experiments/prose-qr/finder-native/layout.mjs",
        ].map(async (p) => [p, sha(await readFile(p))]),
      ),
    ),
  });
  console.log(
    JSON.stringify({ configs: 1, rows, tokens, selected: m.selected }),
  );
} catch (e) {
  await json(root + "proposal-01/error.json", {
    at: new Date().toISOString(),
    error: e.stack,
  });
  throw e;
}

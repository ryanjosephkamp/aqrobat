import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { format } from "prettier";
import assert from "node:assert/strict";
import { finderMatrix } from "../finder-native/layout.mjs";
const root = "docs/research/prose-qr/phase-43/",
  source = "experiments/prose-qr/context-glyph-period/",
  sha = (b) => createHash("sha256").update(b).digest("hex"),
  json = async (p, v) =>
    writeFile(p, await format(JSON.stringify(v), { parser: "json" }), {
      flag: "wx",
    });
await mkdir(root + "proposal-01");
try {
  const priorCV = JSON.parse(
    await readFile("docs/research/prose-qr/phase-42/opencv-01/run-01.json"),
  );
  assert.equal(
    priorCV.points,
    null,
    "Prior independent geometry exists; conditional source not needed",
  );
  const metricsPath = root + "metrics-01/metrics.json",
    m = JSON.parse(await readFile(metricsPath)),
    unit = 10240 / 35,
    field = 10240 - m.phase,
    rows = Math.floor(field / 20),
    tokens = Math.floor((field + 10) / 40),
    guard = 0,
    matrix = finderMatrix(25);
  assert(
    m.selected && m.selected.score >= 0.06,
    "No validated qualifying source word pair",
  );
  const regions = [
    [0, 0],
    [18, 0],
    [0, 18],
  ]
    .flatMap(([x, y]) => [
      [x, y, x + 7, y + 1],
      [x, y + 6, x + 7, y + 7],
      [x, y + 1, x + 1, y + 6],
      [x + 6, y + 1, x + 7, y + 6],
      [x + 2.3, y + 2.3, x + 4.7, y + 4.7],
    ])
    .map((r) => r.map((v) => v * unit + 5 * unit));
  const lines = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: tokens }, (_, k) =>
      regions.some(
        ([x0, y0, x1, y1]) =>
          m.phase + k * 40 + 15 >= x0 - guard * unit &&
          m.phase + k * 40 + 15 < x1 + guard * unit &&
          m.phase + (row + 0.5) * 20 >= y0 - guard * unit &&
          m.phase + (row + 0.5) * 20 < y1 + guard * unit,
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
    sourceCentralSquareModules: 2.4,
    sourceLeft: m.phase,
    sourceTop: m.phase,
    sourceContext:
      "Full35-module native text page including nominal quiet margins",
    sourceRegions: regions,
    diagnosticMatrix:
      "Nominal standard 3-module finder centers; source central squares are 2.4 modules",
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
          root + "FULL-CONTEXT-ADDENDUM.md",
          metricsPath,
          "docs/research/prose-qr/phase-43/model-01/summary.json",
          "docs/research/prose-qr/phase-42/opencv-01/run-01.json",
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

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { format } from "prettier";
import assert from "node:assert/strict";
import { generate } from "../../../src/core.mjs";
const root = "docs/research/prose-qr/phase-45/",
  source = "experiments/prose-qr/context-full-payload/",
  sha = (b) => createHash("sha256").update(b).digest("hex"),
  json = async (p, v) =>
    writeFile(p, await format(JSON.stringify(v), { parser: "json" }), {
      flag: "wx",
    });
await mkdir(root + "proposal-01");
try {
  const gateRoot = "docs/research/prose-qr/phase-44/run-01/";
  for (const id of ["native-1", "native-2"])
    assert(
      JSON.parse(await readFile(gateRoot + id + ".json")).stableIntendedOutline,
      "Ordinary outside geometry is not stable",
    );
  assert(
    JSON.parse(await readFile(gateRoot + "control.json")).exactURLControl,
    "Independent control failed",
  );
  const nativeGate = JSON.parse(
      await readFile(
        "docs/research/prose-qr/phase-43/run-01/native-metrics.json",
      ),
    ),
    captureGate = JSON.parse(
      await readFile("docs/research/prose-qr/phase-43/run-01/capture.json"),
    );
  assert(!nativeGate.automaticRejected && captureGate.repeatExact);
  await readFile(
    "docs/research/prose-qr/phase-43/run-01/native-stroke-summary.json",
  );
  const metricsPath = "docs/research/prose-qr/phase-43/metrics-01/metrics.json",
    m = JSON.parse(await readFile(metricsPath)),
    unit = 10240 / 35,
    field = 10240 - m.phase,
    rows = Math.floor(field / 20),
    tokens = Math.floor((field + 10) / 40),
    guard = 0,
    payload = "https://example.com/",
    code = generate(payload, { ecc: "M", boost: true }),
    matrix = code.matrix;
  assert.equal(matrix.length, 25, "Encoded matrix size mismatch");
  assert(
    m.selected && m.selected.score >= 0.06,
    "No validated qualifying source word pair",
  );
  const finders = [
    [0, 0],
    [18, 0],
    [0, 18],
  ];
  const regions = matrix.flatMap((r, y) =>
    r.flatMap((bit, x) =>
      bit &&
      !finders.some(
        ([ox, oy]) => x >= ox + 2 && x <= ox + 4 && y >= oy + 2 && y <= oy + 4,
      )
        ? [[x, y, x + 1, y + 1]]
        : [],
    ),
  );
  for (const [x, y] of finders)
    regions.push([x + 2.3, y + 2.3, x + 4.7, y + 4.7]);
  for (const r of regions)
    for (let i = 0; i < 4; i++) r[i] = r[i] * unit + 5 * unit;
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
    payload,
    encoder: {
      requestedEcc: code.requestedEcc,
      actualEcc: code.actualEcc,
      version: code.version,
    },
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
          "docs/research/prose-qr/phase-43/FULL-CONTEXT-ADDENDUM.md",
          "docs/research/prose-qr/phase-43/run-01/native-stroke-summary.json",
          "docs/research/prose-qr/phase-44/run-01/native-1.json",
          "docs/research/prose-qr/phase-44/run-01/native-2.json",
          "docs/research/prose-qr/phase-44/run-01/control.json",
          "src/core.mjs",
          "vendor/qrcodegen.mjs",
          metricsPath,
          "docs/research/prose-qr/phase-43/model-01/summary.json",

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

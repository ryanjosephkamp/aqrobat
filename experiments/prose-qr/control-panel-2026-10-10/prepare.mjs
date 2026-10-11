import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { gzipSync } from "node:zlib";
import qrcodegen from "../../../vendor/qrcodegen.mjs";
import { sha } from "./common.mjs";
const root = "docs/research/prose-qr/control-panel-2026-10-10";
const source = "experiments/prose-qr/control-panel-2026-10-10";
const save = async (p, v) => writeFile(p, v, { flag: "wx" });
const json = async (p, v) => save(p, JSON.stringify(v, null, 2) + "\n");
const treatments = [
  { id: "square", curvature: 0 },
  { id: "circle", curvature: 1 },
  { id: "rounded-one-third", curvature: 1 / 3 },
  { id: "rounded-two-thirds", curvature: 2 / 3 },
];
const payload = "https://example.com/";
const code = qrcodegen.QrCode.encodeSegments(
  [qrcodegen.QrSegment.makeBytes([...new TextEncoder().encode(payload)])],
  qrcodegen.QrCode.Ecc.MEDIUM,
  2,
  2,
  0,
  false,
);
const matrix = Array.from({ length: code.size }, (_, y) =>
  Array.from({ length: code.size }, (_, x) => code.getModule(x, y)),
);
const modules = [];
for (let y = 0; y < 25; y++)
  for (let x = 0; x < 25; x++)
    if (
      matrix[y][x] &&
      !((x < 7 && y < 7) || (x >= 18 && y < 7) || (x < 7 && y >= 18))
    )
      modules.push(`<rect x="${x + 4}" y="${y + 4}" width="1" height="1"/>`);
const shared = modules.join("");
for (const t of treatments) {
  const dir = `${root}/${t.id}`;
  await mkdir(dir);
  const shapes = [];
  for (const [cx, cy] of [
    [7.5, 7.5],
    [25.5, 7.5],
    [7.5, 25.5],
  ])
    for (const [r, fill] of [
      [3.5, "black"],
      [2.5, "white"],
      [1.5, "black"],
    ])
      shapes.push(
        t.curvature === 1
          ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`
          : `<rect x="${cx - r}" y="${cy - r}" width="${2 * r}" height="${2 * r}" rx="${r * t.curvature}" ry="${r * t.curvature}" fill="${fill}"/>`,
      );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="396" height="396" viewBox="0 0 33 33"><rect width="33" height="33" fill="white"/><g fill="black">${shared}${shapes.join("")}</g></svg>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:white}svg{display:block}</style></head><body>${svg}</body></html>`;
  t.dir = dir;
  t.svgPath = dir + "/source.svg.txt";
  t.htmlPath = dir + "/source.html.txt";
  t.svgSha256 = sha(svg);
  t.htmlSha256 = sha(html);
  t.nonFinderModulesSha256 = sha(shared);
  t.nestedRadiiModules = [3.5, 2.5, 1.5].map((r) => r * t.curvature);
  await save(t.svgPath, svg);
  await save(t.htmlPath, html);
}
const originals = [
  "experiments/prose-qr/astra-2026-10-10/calibration.mjs",
  "experiments/prose-qr/astra-2026-10-10/common.mjs",
  "experiments/prose-qr/astra-2026-10-10/passive.mjs",
  "experiments/prose-qr/finder-runs/probe.mjs",
  "experiments/prose-qr/context-letter-counters/geometry.mjs",
  "experiments/prose-qr/context-letter-counters/ordinary.py",
  "vendor/qrcodegen.mjs",
  "NOTICE.md",
  "LICENSE",
  "package-lock.json",
];
const provenance = {};
for (const path of originals) provenance[path] = sha(await readFile(path));
for (const path of ["vendor/qrcodegen.mjs", "NOTICE.md", "LICENSE"])
  await save(
    root + "/" + path.split("/").at(-1) + ".txt",
    await readFile(path),
  );
const require = createRequire(import.meta.url);
const jsqrPath = require.resolve("jsqr");
const jsqr = await readFile(jsqrPath);
await save(root + "/jsqr-stock-source.js.gz", gzipSync(jsqr));
provenance[jsqrPath] = sha(jsqr);
const scripts = [
  "prepare.mjs",
  "run.mjs",
  "reader.mjs",
  "common.mjs",
  "passive.mjs",
  "metrics.mjs",
  "ordinary.py",
];
const executedSources = {};
for (const f of scripts)
  executedSources[source + "/" + f] = sha(await readFile(source + "/" + f));
await json(root + "/provenance.json", {
  originals: provenance,
  executedSources,
  adaptations: [
    "Source generation adapted from calibration.mjs; all treatments omit every finder module before drawing visible concentric replacement shapes.",
    "strict is copied exactly from common.mjs; metric and true-geometry functions copied exactly from probe.mjs and geometry.mjs.",
    "passive.mjs uses the same six instrumentation hooks and first-location recording. Imports resolve to local copied functions, the stock hash is pinned, and parity is recorded as a flag plus both returns so a mismatch is retained before stopping.",
    "OpenCV ordinary.py is copied exactly. Ordinary ZXing and jsQR calls omit options, using installed stock defaults.",
    "No sealed scripts are imported or executed; no old time/output side effects are inherited.",
  ],
});
await json(root + "/preregistration.json", {
  schema: "aqrobat.control-panel-preregistration.v1",
  frozenAtUtc: new Date().toISOString(),
  startUtc: "2026-10-10T19:04:44Z",
  cutoffUtc: "2026-10-10T19:24:44Z",
  workerDeadlineUtc: "2026-10-10T19:26:44Z",
  absoluteDeadlineUtc: "2026-10-10T19:29:44Z",
  baselineHead: "84a79659d40b25cdbcf6663540dbaafdd5741828",
  payload,
  payloadSha256: sha(Buffer.from(payload)),
  version: 2,
  ecc: "M",
  mask: 0,
  boost: false,
  pitchPx: 12,
  quietModules: 4,
  dimension: 25,
  imageWidth: 396,
  imageHeight: 396,
  matrix,
  matrixSha256: sha(JSON.stringify(matrix)),
  nonFinderDarkModules: modules.length,
  finderBoundsModules: [
    [0, 0, 7, 7],
    [18, 0, 7, 7],
    [0, 18, 7, 7],
  ],
  sourceGeometry: {
    unit: 12,
    dimension: 25,
    counters: [
      { x: 90, y: 90 },
      { x: 306, y: 90 },
      { x: 90, y: 306 },
    ],
  },
  treatments,
  executionOrder: treatments.map((t) => t.id),
  readerOrder: ["opencv", "zxing", "jsqr"],
  captureProtocol:
    "Read and hash frozen HTML and SVG; one 396x396 DPR1 headless Chrome screenshot; reset identical HTML and take one immediate repeat; verify PNG and RGBA hashes before reader calls. Same fresh ephemeral process/context for all sources; close only the owned browser.",
  ordinaryProtocol:
    "One unchanged-input default detectAndDecode, readBarcodes(imageData), and jsQR(rgba,width,height), in that order per treatment. No explicit reader options, transformations, tuning, retries, or alternative locations.",
  passiveProtocol:
    "At most one separate passive jsQR invocation per captured treatment, explicit attemptBoth equal to stock default, compare complete return with saved default ordinary result. Retain first location within every naturally executed scan branch, all scored runs/quads, and strict metrics. Diagnostic return is never an ordinary slot.",
  strictConjunction:
    "First intended source dimension and centers (deltas <12px); exactly 3 selected points; EVERY selected point has quad balance, nominal span and stable-wide-row fraction >=0.8; nonempty scored records and EVERY record has all 4 axes and worst RMS <=0.35; true geometry has all 4 axes and worst RMS <=0.35.",
  limits: {
    captures: 4,
    immediateRepeats: 4,
    ordinarySlots: 12,
    passiveProfiles: 4,
    bytesAcrossBothTrees: 4000000,
    workerWriteCeiling: 3800000,
    timeoutMsPerReaderOrProfile: 45000,
  },
  stopGates: [
    "Immediately stop later experimental work on any source/hash mismatch, PNG or RGBA repeat mismatch, wrong payload, crash/timeout, passive/stock return mismatch or cap/cutoff.",
    "Square must recover exactly in ALL THREE ordinary readers or stop.",
    "Circle must recover exactly in ZXing and jsQR or stop; empty OpenCV circle return alone is allowed.",
    "All four sources frozen before any capture; no repair, tuning, rerun, retry, source substitution or threshold change after a failure. Keep 12 slots including unattempted states.",
  ],
  evidenceBoundary:
    "Conventional image decoding and diagnostic matrix/finder geometry only. Zero native prose/payload, copy/paste, native-app, phone or print evidence. No broader success rate or native acceptance claim.",
});
await json(root + "/ledger.json", {
  createdAtUtc: new Date().toISOString(),
  slots: treatments.flatMap((t) =>
    ["opencv", "zxing", "jsqr"].map((engine) => ({
      id: t.id,
      engine,
      status: "unattempted",
      texts: [],
    })),
  ),
});
console.log(JSON.stringify({ frozen: treatments, executedSources }));

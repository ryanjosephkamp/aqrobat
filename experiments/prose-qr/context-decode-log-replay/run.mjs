import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { format } from "prettier";
import assert from "node:assert/strict";
const root = "docs/research/prose-qr/phase-51/",
  source = "experiments/prose-qr/context-decode-log-replay/",
  out = root + "run-01/";
const sha = (b) => createHash("sha256").update(b).digest("hex"),
  json = async (p, v) =>
    writeFile(p, await format(JSON.stringify(v), { parser: "json" }), {
      flag: "wx",
    });
const inputs = [
  {
    id: "control",
    receipt: "docs/research/prose-qr/phase-45/run-01/control-pixels.json",
    baseline: "docs/research/prose-qr/phase-45/opencv-01/control.json",
  },
  {
    id: "full-native",
    receipt: "docs/research/prose-qr/phase-45/run-01/native-pixels.json",
    baseline: "docs/research/prose-qr/phase-45/opencv-01/run-01.json",
  },
  {
    id: "tight-finder",
    receipt: "docs/research/prose-qr/phase-49/run-01/native-pixels.json",
    baseline: "docs/research/prose-qr/phase-49/run-01/native-opencv.json",
  },
  {
    id: "roomier-finder",
    receipt: "docs/research/prose-qr/phase-49/run-02/native-pixels.json",
    baseline: "docs/research/prose-qr/phase-49/run-02/native-opencv.json",
  },
];
await mkdir(out);
const hashes = {};
for (const p of [
  source + "read.py",
  source + "run.mjs",
  root + "PLAN.md",
  "docs/research/prose-qr/phase-32/opencv-source-01/receipt.json",
  ...inputs.flatMap((i) => [i.receipt, i.baseline]),
])
  hashes[p] = sha(await readFile(p));
await json(out + "manifest.json", {
  at: new Date().toISOString(),
  plannedInputs: 4,
  readerImplementations: 1,
  profile:
    "default OpenCV with stock diagnostic logging; no acceptance options",
  sources: hashes,
  inputs,
});
const results = [];
for (const i of inputs) {
  const dir = out + i.id + "/";
  await mkdir(dir);
  const receipt = JSON.parse(await readFile(i.receipt)),
    baseline = JSON.parse(await readFile(i.baseline));
  assert.equal(sha(await readFile(receipt.path)), receipt.pngSha256);
  let raw = Buffer.alloc(0),
    stderr = Buffer.alloc(0),
    error = null,
    result = null;
  const at = new Date().toISOString();
  try {
    raw = execFileSync("python3", [source + "read.py", receipt.path], {
      timeout: 90000,
      maxBuffer: 1000000,
      env: { ...process.env, OPENCV_LOG_LEVEL: "DEBUG" },
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (e) {
    error = {
      name: e.name,
      code: e.code,
      status: e.status,
      signal: e.signal,
      message: e.message,
    };
    raw = e.stdout ?? raw;
    stderr = e.stderr ?? stderr;
  }
  const lines = raw.toString("utf8").split("\n"),
    marker = lines.find((l) => l.startsWith("AQROBAT_RESULT="));
  if (marker) result = JSON.parse(marker.slice("AQROBAT_RESULT=".length));
  await writeFile(dir + "stdout.txt.gz", gzipSync(raw), { flag: "wx" });
  await writeFile(dir + "stderr.txt.gz", gzipSync(stderr), { flag: "wx" });
  const qrLogs = lines.filter((l) =>
    /QR corners:|QR version:|Version type:|QR: decoded|numModules|transition/i.test(
      l,
    ),
  );
  const parity = result
    ? JSON.stringify({ text: result.text, points: result.points }) ===
      JSON.stringify({ text: baseline.text, points: baseline.points })
    : null;
  const row = {
    id: i.id,
    at,
    finished: new Date().toISOString(),
    receipt,
    result,
    error,
    outcome: result && !result.error ? "completed" : "unknown",
    baselineParity: parity,
    qrLogs,
    rawStdoutSha256: sha(raw),
    rawStdoutBytes: raw.length,
    rawStderrSha256: sha(stderr),
    rawStderrBytes: stderr.length,
    classification:
      "Same ordinary implementation with passive verbosity; no new independent-engine count",
  };
  await json(dir + "result.json", row);
  results.push(row);
  console.log(
    JSON.stringify({ id: i.id, outcome: row.outcome, parity, qrLogs }),
  );
}
await json(root + "analysis.json", {
  at: new Date().toISOString(),
  plannedSlots: 4,
  completedSlots: results.filter((r) => r.outcome === "completed").length,
  unknownSlots: results.filter((r) => r.outcome === "unknown").length,
  baselineParity: results.every((r) => r.baselineParity),
  internalQRLogs: results.map((r) => ({ id: r.id, logs: r.qrLogs })),
  goal: "unsolved",
  phoneTests: 0,
  phoneCandidates: 0,
  newPayloads: 0,
  sources: hashes,
});

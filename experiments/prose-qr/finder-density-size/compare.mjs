import { readFile, writeFile, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { format } from "prettier";
import assert from "node:assert/strict";
import { probe } from "../finder-runs/probe.mjs";
const root = "docs/research/prose-qr/phase-12/comparison-01/",
  sha = (b) => createHash("sha256").update(b).digest("hex");
await mkdir(root);
const groups = [
  ["10", "run-01", "detector-01", ["monaco-density-0", "monaco-density-1"]],
  [
    "10",
    "dense-02",
    "detector-03",
    ["monaco-staggered-0", "monaco-staggered-1"],
  ],
  ["11", "run-01", "detector-01", ["monaco-left", "monaco-justified"]],
  ["12", "run-01", "detector-01", ["monaco-native-20", "monaco-native-14"]],
];
const manifest = {
  at: new Date().toISOString(),
  sources: Object.fromEntries(
    await Promise.all(
      [
        "experiments/prose-qr/finder-density-size/compare.mjs",
        "experiments/prose-qr/finder-runs/probe.mjs",
        "docs/research/prose-qr/phase-12/DIAGNOSTIC-PLAN.md",
      ].map(async (p) => [p, sha(await readFile(p))]),
    ),
  ),
  planned: 8,
  classification:
    "Documented intermediate replica only, never native acceptance",
};
await writeFile(
  root + "manifest.json",
  await format(JSON.stringify(manifest), { parser: "json" }),
  { flag: "wx" },
);
const rows = [];
for (const [phase, batch, detector, ids] of groups)
  for (const id of ids) {
    const r = {
      phase,
      batch,
      detector,
      id,
      classification: manifest.classification,
    };
    try {
      const base = `docs/research/prose-qr/phase-${phase}/`,
        source = (await readFile(base + detector + "/results.jsonl", "utf8"))
          .trim()
          .split("\n")
          .map(JSON.parse)
          .find((r) => r.id === id);
      assert(source, "Missing detector row");
      const input = base + detector + "/" + source.diagnosticFiles.binary.path,
        bytes = await readFile(input);
      assert.equal(sha(bytes), source.diagnosticFiles.binary.pngSha256);
      const buffer = execFileSync(
        "python3",
        [
          "-c",
          "import cv2,sys; i=cv2.imread(sys.argv[1]); assert i.shape[:2]==(512,512); sys.stdout.buffer.write(cv2.cvtColor(i,cv2.COLOR_BGR2RGBA).tobytes())",
          input,
        ],
        { maxBuffer: 2000000 },
      );
      assert.equal(buffer.length, 512 * 512 * 4);
      const l = JSON.parse(
          await readFile(base + batch + "/" + id + "-layout.json"),
        ),
        scale = 512 / l.side;
      for (const k of ["unit", "field", "side", "offset", "lineHeight"])
        l[k] *= scale;
      const result = probe(
        { width: 512, height: 512, data: new Uint8ClampedArray(buffer) },
        l,
      );
      const full = gzipSync(JSON.stringify(result));
      await writeFile(root + `p${phase}-${id}-probe.json.gz`, full, {
        flag: "wx",
      });
      Object.assign(r, {
        input,
        pngSha256: sha(bytes),
        probeSha256: sha(full),
        nativeDetected: source.detected,
        nativeIntendedQuad: source.intendedQuad,
        diagnosticStructurePass: result.structurePass,
        ordinaryLocations: result.ordinary.locations,
        selected: result.selected,
      });
    } catch (e) {
      r.error = e.stack;
      r.status = "checker error or missing input";
    }
    rows.push(r);
    await writeFile(
      root + `p${phase}-${id}.json`,
      await format(JSON.stringify(r), { parser: "json" }),
      { flag: "wx" },
    );
    console.log(
      JSON.stringify({
        phase,
        id,
        structure: r.diagnosticStructurePass,
        nativeDetected: r.nativeDetected,
        error: r.error,
      }),
    );
  }
await writeFile(
  root + "summary.json",
  await format(
    JSON.stringify({
      planned: 8,
      attempted: rows.filter((r) => !r.error).length,
      errors: rows.filter((r) => r.error),
      replicaStructurePasses: rows
        .filter((r) => r.diagnosticStructurePass)
        .map((r) => ({ phase: r.phase, id: r.id })),
      nativeAcceptanceClaims: 0,
    }),
    { parser: "json" },
  ),
  { flag: "wx" },
);

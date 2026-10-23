import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { format } from "prettier";
import assert from "node:assert/strict";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const json = async (p, v) =>
  writeFile(p, await format(JSON.stringify(v), { parser: "json" }), {
    flag: "wx",
  });
const sources = async (paths) =>
  Object.fromEntries(
    await Promise.all(paths.map(async (p) => [p, sha(await readFile(p))])),
  );
const walk = async (p) =>
  (
    await Promise.all(
      (await readdir(p, { withFileTypes: true })).map((e) =>
        e.isDirectory() ? walk(p + "/" + e.name) : [p + "/" + e.name],
      ),
    )
  ).flat();
const r = "docs/research/prose-qr/phase-49/",
  rows = [];
for (const batch of ["run-01", "run-02"]) {
  const s = JSON.parse(await readFile(r + batch + ".json")),
    c = JSON.parse(await readFile(r + batch + "/capture.json")),
    p = JSON.parse(await readFile(r + batch + "/native-stroke-summary.json")),
    cv = JSON.parse(await readFile(r + batch + "/native-opencv.json"));
  let globalMinGap = Infinity;
  for (const line of s.lines)
    for (let i = 1; i < line.length; i++)
      if (line[i - 1] !== " " && line[i] !== " ")
        globalMinGap = Math.min(
          globalMinGap,
          s.glyphs[line[i - 1]].advance -
            s.glyphs[line[i - 1]].right -
            s.glyphs[line[i]].left,
        );
  rows.push({
    batch,
    clearance: s.clearance,
    leading: s.leading,
    repeatExact: c.repeatExact,
    pngSha256: c.pngSha256,
    mechanicalRejected: c.reasons.length > 0,
    globalMinGap,
    capturedFirstLineOnlyMinGap: JSON.parse(
      await readFile(r + batch + "/native-metrics.json"),
    ).minGap,
    ordinaryOpenCVPoints: cv.points,
    actualNativeStructurePass: p.structurePass,
    actualNativeIntendedGeometry: p.correctFinder,
    stableWideRows: p.regionComponents.stableFraction,
    selected: p.selected,
    scoredRuns: p.runs,
    quads: p.quads,
    agentLegibility:
      "Native 1:1 MOM and ill remain identifiable; the low-clearance case is visually cramped. Neither repetitive word material nor large page establishes natural prose, comfortable document reading or owner/portable acceptance.",
    payload: null,
    phoneCandidate: false,
  });
}
const m = JSON.parse(await readFile(r + "metrics-01/summary.json"));
const analysis = {
  at: new Date().toISOString(),
  phase: 49,
  goal: "unsolved",
  phoneTests: 0,
  phoneCandidates: 0,
  plannedResources: 60,
  completedResources: m.completedResources,
  exactResourceRepeats: m.immediateRepeats,
  resourceRejections: m.rejections,
  selected: m.selected,
  plannedNative: 2,
  completedNative: 2,
  nativeExactRepeats: rows.filter((r) => r.repeatExact).length,
  unattemptedNative: 0,
  newPayloadSources: 0,
  ordinaryNativeReaderSlots: 6,
  completedOrdinaryNativeSlots: 6,
  conventionalControlSlots: 3,
  exactConventionalControls: 3,
  ordinaryNativeIntendedOpenCVOutlines: rows.filter(
    (r) => r.ordinaryOpenCVPoints !== null,
  ).length,
  actualNativeStrictPasses: rows.filter((r) => r.actualNativeStructurePass)
    .length,
  solidControlPass: true,
  cases: rows,
  captureMetricScopeCorrection:
    "Executed capture.mjs minGap measured the first line only, which contains the light word. This fresh read-only audit checks every adjacent nonspace pair in all source lines: the global minimum is 1.240234375 for both sources, still nonoverlapping. Original capture source and metrics are unchanged. Native font identity/size matches the measured resource; this is a source/native-font bounds audit, not owner legibility.",
  classification:
    "Regular-body-font finder-only text; heavy fonts remain separate resource lanes. No payload or phone candidate.",
  sources: await sources([
    "experiments/prose-qr/session-2026-10-10-b/seal-milestone.mjs",
    r + "metrics-01/summary.json",
    r + "resource-legibility.json",
    r + "run-01/native-stroke-summary.json",
    r + "run-02/native-stroke-summary.json",
    r + "run-01/native-opencv.json",
    r + "run-02/native-opencv.json",
  ]),
};
for (const reader of ["opencv", "jsqr", "zxing"])
  assert(
    JSON.parse(await readFile(r + "run-01/control-" + reader + ".json"))
      .exactURL,
  );
await json(r + "analysis.json", analysis);
const readmes = {
  49: "# Phase49 — tighter line spacing is not sufficient\n\nAll60 native word resources and60 immediate repeats completed. Six Phosphate bounds rejections at small negative numerical gaps remain rejected as preregistered. Regular Monaco MOM/ill has the strongest selected native occupancy separation. Both full-context finder-only layouts and exact repeats completed, with no intended ordinary OpenCV outline and no actual native strict pass. All three conventional URL controls recover exactly; the solid structural control passes. Actual selected H/V/both diagonal runs and quads are retained losslessly. No payload or phone candidate.\n\nThe executed capture's minGap covers only its first line. analysis.json records a fresh all-line source audit and the scope correction; original source/metrics remain untouched. Letters are identifiable at native1:1, but cramped repetitive words on5600-square pages are not natural prose or normal-page/owner acceptance. Goal unsolved.\n",
  50: "# Phase50 — four setup errors, zero decoder calls\n\nThe unsupported cv2.getLogLevel metadata query fails before any detector call in all four planned slots. Four unknown slots and original exceptions/stdout/stderr/executed sources remain intact. These are not reader-negative outcomes. Phase51 preregisters the complete profile in fresh directories with the metadata query corrected. Goal unsolved.\n",
  51: "# Phase51 — default-return parity, internal log trace unavailable\n\nThe fresh complete four-input profile runs with only stock DEBUG verbosity. All four returned payload/corner pairs equal their ordinary baselines. The conventional URL recovers exactly, the saved full native URL has its earlier intended outline but no payload, and both phase49 finder-only images have no outline. No QR internal debug messages are exposed by this build, so the exact internal failed stage remains unknown. This is one OpenCV implementation across profiles, not a new independent engine. Phase50's four original setup unknowns and phase46's two original Vision unknowns remain preserved. No new native image/payload/phone candidate.\n",
};
for (const [n, src, cap] of [
  [49, "context-native-period", 8000000],
  [50, "context-decode-log", 200000],
  [51, "context-decode-log-replay", 200000],
]) {
  const base = `docs/research/prose-qr/phase-${n}/`;
  await writeFile(
    base + "README.md",
    await format(readmes[n], { parser: "markdown" }),
    { flag: "wx" },
  );
  const inventory = [];
  for (const p of [
    ...(await walk(base.slice(0, -1))),
    ...(await walk("experiments/prose-qr/" + src)),
  ].sort()) {
    const b = await readFile(p);
    inventory.push({ path: p, bytes: b.length, sha256: sha(b) });
  }
  const custody = {
    at: new Date().toISOString(),
    phase: n,
    anchorHead: execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
    cap,
    goal: "unsolved",
    prior: [
      {
        path: "docs/research/prose-qr/session-2026-10-10/custody.json",
        sha256: sha(
          await readFile(
            "docs/research/prose-qr/session-2026-10-10/custody.json",
          ),
        ),
      },
    ],
    sources: await sources([
      "experiments/prose-qr/session-2026-10-10-b/seal-milestone.mjs",
      base + "analysis.json",
    ]),
    inventory,
  };
  const b = await format(JSON.stringify(custody), { parser: "json" });
  const logicalBytes =
    inventory.reduce((n, f) => n + f.bytes, 0) + Buffer.byteLength(b);
  assert(logicalBytes < cap);
  await writeFile(base + "custody.json", b, { flag: "wx" });
  console.log(
    JSON.stringify({ phase: n, files: inventory.length, logicalBytes, cap }),
  );
}

import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { gunzipSync } from "node:zlib";
import { format } from "prettier";
import assert from "node:assert/strict";
import { runMetric } from "../finder-runs/probe.mjs";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = async (p) => JSON.parse(await readFile(p));
const json = async (p, v) =>
  writeFile(p, await format(JSON.stringify(v), { parser: "json" }), {
    flag: "wx",
  });
const walk = async (p) =>
  (
    await Promise.all(
      (await readdir(p, { withFileTypes: true })).map((e) =>
        e.isDirectory() ? walk(p + "/" + e.name) : [p + "/" + e.name],
      ),
    )
  ).flat();
const script = "experiments/prose-qr/session-2026-10-10-b/seal-last.mjs";
const prior = "docs/research/prose-qr/session-2026-10-10/custody.json";
const strict = (s) =>
  s.postReturnIntendedGeometry[0]?.intendedGeometry === true &&
  Object.keys(s.selected).length === 3 &&
  Object.values(s.selected).every(
    (p) =>
      p.quadBalance >= 0.8 &&
      p.nominalSpanFraction >= 0.8 &&
      p.stableRows?.fraction >= 0.8 &&
      p.records.length &&
      p.records.every(
        (r) => r.metric.completeAxes === 4 && r.metric.worstRMS <= 0.35,
      ) &&
      p.geometric.completeAxes === 4 &&
      p.geometric.worstRMS <= 0.35,
  );
const nearest = (trace, c) =>
  trace.scans.map((s) => ({
    branch: s.branch,
    classification:
      "Nearest logged unselected quad after reader return; never substituted for the actual selected candidate",
    counters: c.native.counters.map((pt) => {
      const qs = s.allQuads
        .map((q) => ({
          quad: q,
          x: (q.top.startX + q.top.endX + q.bottom.startX + q.bottom.endX) / 4,
          y: (q.top.y + q.bottom.y + 1) / 2,
          spans: [
            q.top.endX - q.top.startX,
            q.bottom.endX - q.bottom.startX,
            q.bottom.y - q.top.y + 1,
          ],
        }))
        .map((q) => ({ ...q, distance: Math.hypot(q.x - pt.x, q.y - pt.y) }))
        .sort((a, b) => a.distance - b.distance);
      const q = qs[0];
      return q
        ? {
            sourcePoint: pt,
            point: { x: q.x, y: q.y },
            distance: q.distance,
            spans: q.spans,
            balance: Math.min(...q.spans) / Math.max(...q.spans),
            records: s.allScoredRuns
              .filter(
                (r) =>
                  r.point.x === Math.round(q.x) &&
                  r.point.y === Math.round(q.y),
              )
              .map((r) => ({ ...r, metric: runMetric(r) })),
          }
        : null;
    }),
  }));
const readmes = {
  59: "# Phase 59 — decorative native counters\n\nFour resource proposals produce three full native sources and exact repeats. Phosphate B is rejected for a source-derived dimension beyond QR bounds. Fifteen primary reader slots complete; three remain unattempted. No intended geometry or strict selected structure passes. Native engraved letters are distinguishable in excerpts, but this is decorative repetitive text, not natural prose. No payload or phone candidate.\n",
  60: "# Phase 60 — preserved font-load abort\n\nTwo PingFang resources and full native sources with exact immediate repeats were saved before the Songti24 font load failed. Songti32 was not attempted. The runner performs all captures before its reader loop, so all 18 planned primary reader slots remain unattempted. There were no decoder calls. The incorrect local font identity and exact executed source/error remain preserved. Phase61 is a separate corrected profile, not a replacement for these outcomes.\n",
  61: "# Phase 61 — corrected font profile\n\nFour resource proposals produce three native sources and exact repeats; Songti24 lacks the required enclosed resource structure. Fifteen primary slots and five passive parity profiles complete. Three ordinary OpenCV outlines and close native centers do not meet the intended dimension or strict selected stroke gates. This is a logographic structural control, not English prose or meaningful Chinese prose. No payload or phone candidate.\n",
  62: "# Phase 62 — intended dimensions, incomplete native strokes\n\nAll six native sources and immediate repeats are saved. Four requested Medium/Semibold faces resolve to Regular and are rejected; their 12 primary reader slots remain unattempted. The two Regular sources complete six native slots plus six conventional slots. The 64px inverted stock branch returns intended centers and dimension65, but strict native structure still fails: central span fraction0.769, stable wide rows14/18 and worst four-axis ratio error about0.506. No payload is encoded. Native glyph shapes are distinct, but the large repetitive logographic control is not natural prose, normal-page usability or phone acceptance.\n\nHarness limitation: the executed capture computes DOM target origins and phase drift but omits origins from its returned object. The promised direct origin receipt is therefore missing. This metadata gap remains explicit; source formulas are not substituted for a measured receipt. No executed source was repaired or rerun.\n",
};
for (const [n, src, cap] of [
  [59, "context-inline-counters", 4000000],
  [60, "context-native-ideographs", 4000000],
  [61, "context-native-ideographs-replay", 4000000],
  [62, "context-ideograph-native-scale", 5000000],
]) {
  const base = `docs/research/prose-qr/phase-${n}/`;
  let analysis;
  if (n === 60) {
    const captures = await Promise.all(
      ["pingfang24", "pingfang32"].map((id) =>
        read(base + "run-01/" + id + "/capture.json"),
      ),
    );
    const error = await read(base + "run-01/capture-error.json");
    analysis = {
      at: new Date().toISOString(),
      phase: n,
      goal: "unsolved",
      phoneTests: 0,
      phoneCandidates: 0,
      plannedNativeSources: 4,
      completedNativeSources: 2,
      nativeExactRepeats: captures.filter((c) => c.repeatExact).length,
      completedGlyphResources: 2,
      fontLoadAttempts: 3,
      fontLoadErrors: 1,
      unattemptedNativeSources: 2,
      plannedPrimaryReaderSlots: 18,
      completedPrimaryReaderSlots: 0,
      unattemptedPrimaryReaderSlots: 18,
      completedPassiveProfiles: 0,
      actualStockScanBranches: 0,
      newPayloadSources: 0,
      nativeIntendedGeometryBranches: 0,
      nativeStrictSelectedPasses: 0,
      nativeOpenCVOutlines: 0,
      originalProfileAborted: true,
      error,
      cases: captures,
      classification:
        "Capture-stage abort before all readers; unattempted reader slots are not decoder negatives or completed unknown results.",
      sources: {
        [script]: sha(await readFile(script)),
        [base + "run-01/capture-error.json"]: sha(
          await readFile(base + "run-01/capture-error.json"),
        ),
      },
    };
  } else {
    const done = await read(base + "run-01/done.json"),
      captures = await read(base + "run-01/captures.json"),
      cases = [];
    for (const c of captures) {
      const row = {
        id: c.id,
        control: !!c.control,
        lane: c.lane ?? "regular-body-font",
        mechanicalRejected: c.rejected,
        reasons: c.reasons ?? [],
        nativeUnattempted: !!c.nativeUnattempted,
        repeatExact: c.repeatExact ?? null,
        clearance: c.clearance ?? null,
        payload: c.payload,
        phoneCandidate: false,
      };
      if (!c.control && !c.nativeUnattempted) {
        row.localAgentLegibilityRejected = false;
        row.localAgentLegibility = row.localAgentLegibilityRejected
          ? "Rejected: crowded row separation at native1:1; numeric bounds passes do not override this gate. Reader outcomes remain retained, not counted as legible progress."
          : "Native glyph shapes distinguishable in inspected 1:1 excerpts. This does not establish Chinese reading fluency, meaningful prose, normal-page comfort or owner/portable acceptance. Decorative Latin and logographic controls remain separate.";
        row.sourcePoints = c.native.counters;
        row.unit = c.unit;
      }
      if (!c.rejected) {
        const cv = await read(c.dir + "opencv.json"),
          z = await read(c.dir + "zxing.json"),
          j = await read(c.dir + "jsqr.json"),
          p = await read(c.dir + "passive-summary.json"),
          trace = JSON.parse(
            gunzipSync(await readFile(c.dir + "passive-full.json.gz")),
          );
        assert.deepEqual(
          p.scans.map((s) => s.locations),
          trace.scans.map((s) => s.locations),
        );
        assert(p.passiveReturnsMatch);
        row.ordinary = {
          opencv: { points: cv.points, text: cv.text, exactURL: cv.exactURL },
          zxing: { exactURL: z.exactURL, results: z.results },
          jsqr: { exactURL: j.exactURL, result: j.result },
        };
        row.actualStockScans = p.scans.map((s) => ({
          ...s,
          strictSelectedNativeStructure: !c.control && strict(s),
        }));
        row.passiveReturnsMatch = p.passiveReturnsMatch;
        if (!c.control) row.nearestUnselectedQuadDiagnostic = nearest(trace, c);
      }
      cases.push(row);
    }
    const native = cases.filter((c) => !c.control),
      controls = cases.filter((c) => c.control),
      profiles = cases.filter((c) => c.passiveReturnsMatch),
      scans = profiles.flatMap((c) => c.actualStockScans);
    assert(
      controls.find((c) => c.id === "control-normal").ordinary.opencv.exactURL,
    );
    assert(
      controls.find((c) => c.id === "control-normal").ordinary.zxing.exactURL,
    );
    assert(
      controls.find((c) => c.id === "control-normal").ordinary.jsqr.exactURL,
    );
    analysis = {
      at: new Date().toISOString(),
      phase: n,
      goal: "unsolved",
      phoneTests: 0,
      phoneCandidates: 0,
      ...done,
      plannedNativeSources: n === 62 ? 6 : 4,
      completedNativeSources: native.filter((c) => !c.nativeUnattempted).length,
      nativeExactRepeats: native.filter((c) => c.repeatExact).length,
      mechanicalNativeOrResourceRejections: native.filter(
        (c) => c.mechanicalRejected,
      ).length,
      localAgentLegibilityRejections: native.filter(
        (c) => c.localAgentLegibilityRejected,
      ).length,
      unattemptedNativeSources: native.filter((c) => c.nativeUnattempted)
        .length,
      completedPrimaryReaderSlots: done.completedPrimaryReaderSlots,
      unattemptedPrimaryReaderSlots: done.unattemptedPrimaryReaderSlots ?? 0,
      completedPassiveProfiles: profiles.length,
      actualStockScanBranches: scans.length,
      nativeIntendedGeometryBranches: profiles
        .filter((c) => !c.control)
        .flatMap((c) => c.actualStockScans)
        .filter((s) =>
          s.postReturnIntendedGeometry.some((l) => l.intendedGeometry),
        ).length,
      nativeStrictSelectedPasses: profiles
        .filter((c) => !c.control)
        .flatMap((c) => c.actualStockScans)
        .filter((s) => s.strictSelectedNativeStructure).length,
      nativeOpenCVOutlines: native.filter(
        (c) =>
          c.ordinary?.opencv.points !== null &&
          c.ordinary?.opencv.points !== undefined,
      ).length,
      conventionalPrimarySlots: 6,
      conventionalExactSlots: controls.reduce(
        (n, c) =>
          n + Object.values(c.ordinary).filter((r) => r.exactURL).length,
        0,
      ),
      controlLimitation:
        "Stock OpenCV returns no inverted-control payload; ZXing/jsQR recover exactly. Normal control recovers exactly in all three.",
      classification:
        "Finder-only native characters; decorative Latin and logographic structural-control lanes remain separate; no encoded text payload. Actual selected native structure, source-aligned samples, threshold resources and nearest-unselected diagnostics are distinct.",
      harnessLimitations:
        n === 62
          ? [
              "Computed target-origin/phase-drift array omitted from returned capture object; no direct measured origin receipt retained.",
              "Requested Medium/Semibold native faces substituted with Regular; rejected and not decoded.",
            ]
          : [],
      cases,
      sources: {
        [script]: sha(await readFile(script)),
        [base + "run-01/done.json"]: sha(
          await readFile(base + "run-01/done.json"),
        ),
        [base + "run-01/captures.json"]: sha(
          await readFile(base + "run-01/captures.json"),
        ),
      },
    };
  }
  await json(base + "analysis.json", analysis);
  await writeFile(
    base + "README.md",
    await format(readmes[n], { parser: "markdown" }),
    { flag: "wx" },
  );
  const inventory = [];
  for (const path of [
    ...(await walk(base.slice(0, -1))),
    ...(await walk("experiments/prose-qr/" + src)),
  ].sort()) {
    const b = await readFile(path);
    inventory.push({ path, bytes: b.length, sha256: sha(b) });
  }
  const custody = {
    at: new Date().toISOString(),
    phase: n,
    anchorHead: execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
    goal: "unsolved",
    cap,
    prior: [{ path: prior, sha256: sha(await readFile(prior)) }],
    sources: {
      [script]: sha(await readFile(script)),
      [base + "analysis.json"]: sha(await readFile(base + "analysis.json")),
    },
    inventory,
  };
  const b = await format(JSON.stringify(custody), { parser: "json" }),
    logicalBytes =
      inventory.reduce((n, f) => n + f.bytes, 0) + Buffer.byteLength(b);
  assert(logicalBytes < cap);
  await writeFile(base + "custody.json", b, { flag: "wx" });
  console.log(
    JSON.stringify({ phase: n, logicalBytes, cap, files: inventory.length }),
  );
}

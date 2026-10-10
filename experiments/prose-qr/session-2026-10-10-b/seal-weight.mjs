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
const script = "experiments/prose-qr/session-2026-10-10-b/seal-weight.mjs";
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
  63: "# Phase 63 — verified native weights, strict structure still fails\n\nAll four requested native font identities are confirmed; all four full sources and repeats complete. All18 primary slots and six passive parity profiles complete. Both Medium sizes return intended inverted centers/dimensions; neither Semibold size does. No case passes strict selected native structure. Medium64 has balanced spans0.929, nominal span0.763, wide rows13/17 and worst true-axis ratio error0.459. The original rejection thresholds remain fixed. No payload was encoded or recovered from native text. These large repetitive logographic controls are not semantic prose or phone candidates.\n\nUnlike phase62, actual DOM target origins are now retained: all12 target positions have horizontal phase drift -0.015625px and vertical drift0 against the resource. Font identity and measured source phase do not establish native stroke or payload recovery. Phase62 original substitutions and missing metadata remain unchanged.\n",
};
for (const [n, src, cap] of [[63, "context-ideograph-weight", 4000000]]) {
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

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
const script = "experiments/prose-qr/session-2026-10-10-b/seal-next.mjs";
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
  52: "# Phase52 — wider cursive strokes remain vertically short\n\nAll32 multirow and32 single-line native resources completed, with32 exact immediate multirow repeats. No resource fails the mechanical gates, but no same-font pair meets the preregistered component/contrast objective. The largest measured minimum component span is18px against48 required; both conditional full-context native slots are unattempted. No QR payload, native finder, decoder slot or phone candidate is created. Regular script and intrinsic Black-face resources stay separate; local word visibility is not owner/natural-prose acceptance.\n",
  53: "# Phase53 — native O counters do not form the intended triangle\n\nFour full-context native finder-only sources and exact repeats complete; all18 primary slots and six passive parity profiles complete. Neither naturally executed stock scan branch returns intended native geometry. All native reader payloads are empty; no payload was encoded. Normal conventional control passes all three, inverted control passes ZXing/jsQR and fails stock OpenCV. Native uppercase words are locally visible, but repetitive word material is not natural prose or owner acceptance. No phone candidate.\n",
  54: "# Phase54 — smaller counters gain outlines, not intended recovery\n\nSix full-context native sources and exact repeats complete;24 primary slots and eight passive parity profiles complete. Default OpenCV returns outlines in three cases, but stock jsQR has no intended geometry in either naturally run branch. Source-center bits are the expected white/black polarity in all cases; that does not establish recovery. Four monospaced cases are locally rejected for crowded native row separation despite numeric bounds passes. Their reader results remain retained and excluded from legible progress. The two regular Arial excerpts have identifiable letters. Neither is natural prose or a phone candidate.\n",
  55: "# Phase55 — m/n neighbors do not restore intended finder structure\n\nFour regular Arial native context variants and exact repeats complete;18 primary slots and six passive parity profiles complete. Two ordinary OpenCV outlines occur, but neither stock jsQR branch returns intended geometry; no native payload is present. Normal controls recover in all three, inverted OpenCV limitation remains. Locally identifiable repetitive letters do not establish prose/portable/owner acceptance. No phone candidate.\n",
  56: "# Phase56 — native i dots, three row-clearance rejections\n\nFour native glyph resources complete. Arial regular, Arial Rounded and Impact fail the preregistered source row-clearance gate, leaving nine native primary slots and three passive profiles unattempted. One intrinsic Arial Black source and exact repeat completes; its three native primary slots and two naturally executed stock branches have no intended geometry. Six conventional slots complete, five exact; inverted stock OpenCV fails as already known. The heavy source is locally identifiable, not regular-body prose or a phone candidate.\n",
  57: "# Phase57 — serif-dot/stem context\n\nSix glyph resources complete: three row-clearance rejections leave nine native primary slots unattempted; three regular serif sources and exact repeats complete. All15 completed primary slots and five passive parity profiles retain no intended native geometry. No ordinary OpenCV native outline occurs. See analysis.json for exact branches and native structure. Source-letter adjustments and positive tracking are rendering only. Expected geometry, source-aligned samples and nearest unselected quads never replace actual reader selection. No text payload or phone candidate is created. No phone/print results; research remains unsolved.\n",
};
readmes[58] =
  "# Phase58 — round counters do not resolve actual selection\n\nSix full native sources and exact repeats are retained. All three24px sources reject for width overflow and their nine primary slots are unattempted; these source-planning failures remain intact. Three20px cases,15 primary slots and five passive parity profiles complete, with no intended geometry or strict selected native pass. One stock OpenCV native outline is a diagnostic only. The heavy rounded-font result remains separate from regular Helvetica/Avenir. No native payload or phone candidate.\n";
for (const [n, src, cap] of [
  [52, "context-script-connections", 4000000],
  [53, "context-letter-counters", 3000000],
  [54, "context-small-counters", 4000000],
  [55, "context-counter-neighbors", 3000000],
  [56, "context-native-dots", 3000000],
  [57, "context-serif-dots", 4000000],
  [58, "context-round-counters", 4000000],
]) {
  const base = `docs/research/prose-qr/phase-${n}/`;
  let analysis;
  if (n === 52) {
    const m = await read(base + "metrics-01/summary.json");
    analysis = {
      at: new Date().toISOString(),
      phase: n,
      goal: "unsolved",
      phoneTests: 0,
      phoneCandidates: 0,
      plannedMultirowResources: 32,
      plannedSingleRowResources: 32,
      completedMultirowResources: m.completedMultirowResources,
      completedSingleRowResources: m.completedSingleRowResources,
      exactImmediateRepeats: m.exactImmediateRepeats,
      mechanicalRejections: m.rejections,
      eligiblePairs: m.eligiblePairs,
      selected: m.selected,
      largestMeasuredMinimumSpan: m.largestMeasuredMinimumSpan,
      requiredMinimumSpan: 48,
      plannedConditionalNativeSlots: 2,
      unattemptedConditionalNativeSlots: 2,
      nativePrimaryReaderSlots: 0,
      newPayloadSources: 0,
      agentVisibility:
        "Native1:1 heavy mum resource is identifiable; no pair selected. Regular/heavy resources and local visibility remain separate from owner prose/portable acceptance.",
      sources: {
        [base + "metrics-01/summary.json"]: sha(
          await readFile(base + "metrics-01/summary.json"),
        ),
        [script]: sha(await readFile(script)),
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
        row.localAgentLegibilityRejected =
          n === 54 && /^(menlo|monaco)/.test(c.id);
        row.localAgentLegibility = row.localAgentLegibilityRejected
          ? "Rejected: crowded row separation at native1:1; numeric bounds passes do not override this gate. Reader outcomes remain retained, not counted as legible progress."
          : "Native letters identifiable in inspected 1:1 source excerpts; repetitive fabricated word material, semantic prose/comfortable document reading and owner/portable legibility remain unaccepted.";
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
      plannedNativeSources:
        n === 53 ? 4 : n === 54 || n === 57 || n === 58 ? 6 : 4,
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
        "Finder-only native letters; no encoded text payload. Actual selected native structure, source-aligned samples, threshold resources and nearest-unselected diagnostics are distinct.",
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

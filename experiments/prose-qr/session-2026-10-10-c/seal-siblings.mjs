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
const script = "experiments/prose-qr/session-2026-10-10-c/seal-siblings.mjs";
const prior = "docs/research/prose-qr/session-2026-10-10-b/custody.json";
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
  69: "# Phase 69 — sibling face bracket does not resolve structure\n\nThree fixed64px native sources and exact repeats complete, with exact resource/full-native font identities. All15 primary slots and five passive parity profiles complete. Both Hiragino first inverted selections return intended geometry; NeoLight does not. All three have zero stable wide central rows at the required span, and true-axis errors0.459/0.463/0.478. No strict pass, payload or phone candidate. This completes the bounded sibling-design bracket; further font-weight/placement sweeps are not justified by these results alone.\n",
};
for (const [n, src, cap] of [[69, "context-counter-sibling", 4000000]]) {
  const base = `docs/research/prose-qr/phase-${n}/`;
  let analysis;
  if (n === 66) {
    const audit = await read(base + "audit-01/analysis.json");
    analysis = {
      ...audit,
      phase: 66,
      plannedNativeSources: 0,
      completedNativeSources: 0,
      nativeExactRepeats: 0,
      plannedPrimaryReaderSlots: 0,
      completedPrimaryReaderSlots: 0,
      unattemptedPrimaryReaderSlots: 0,
      completedPassiveProfiles: 0,
      nativeStrictSelectedPasses: 0,
      nativeIntendedGeometryBranches: 0,
      sources: {
        ...audit.sources,
        [script]: sha(await readFile(script)),
        [base + "audit-01/analysis.json"]: sha(
          await readFile(base + "audit-01/analysis.json"),
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
        row.nativeFontReceipt = c.native.platformFonts;
        row.nativeTargetOrigins = c.native.targetOrigins;
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
      plannedNativeSources: n === 64 ? 6 : n === 67 || n === 69 ? 3 : 4,
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
        n === 64
          ? [
              "Early-rejected resource faces lack a separate platform-font receipt; requested local font identity is not exact-face evidence.",
            ]
          : [],
      nativeUniquePNGs: new Set(
        captures
          .filter((c) => !c.control && c.pngSha256)
          .map((c) => c.pngSha256),
      ).size,
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

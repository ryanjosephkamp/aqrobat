import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { format } from "prettier";
import assert from "node:assert/strict";
const sha = (b) => createHash("sha256").update(b).digest("hex"),
  read = async (p) => JSON.parse(await readFile(p)),
  json = async (p, v) =>
    writeFile(p, await format(JSON.stringify(v), { parser: "json" }), {
      flag: "wx",
    }),
  walk = async (p) =>
    (
      await Promise.all(
        (await readdir(p, { withFileTypes: true })).map((e) =>
          e.isDirectory() ? walk(p + "/" + e.name) : [p + "/" + e.name],
        ),
      )
    ).flat();
const script = "experiments/prose-qr/session-2026-10-10-d/analyze-seal.mjs",
  prior = "docs/research/prose-qr/session-2026-10-10-c/custody.json",
  configs = [
    [70, "outline-latin-topology", 4, 4000000, "run-01"],
    [71, "outline-straight-counters", 4, 4000000, "run-01"],
    [72, "outline-native-polarity", 2, 3000000, "run-02"],
    [73, "outline-flat-bowls", 2, 4000000, "run-01"],
    [74, "outline-counter-appendages", 3, 4000000, "run-01"],
  ];
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
const readmes = {
  70: "Four native sources and exact repeats test filled versus visible outlined Arial Black O in real Latin words. All18 primary slots complete. The4px outline returns intended first geometry in the inverted branch, but all strict structure gates fail. The native excerpts have distinct recognizable letters; the repetitive uppercase array is not natural prose or a payload.",
  71: "Four native sources and exact repeats complete all18 primary slots. No intended first geometry or strict structure pass. Silom has narrow counters; visual inspection shows Phosphate-Solid O is round, contrary to the hoped-for straight-edge mechanism for that face. Preserve the unsuccessful hypothesis. All local letters are distinguishable; no natural-prose or payload result.",
  72: "The first source-validation profile aborts before capture: two background declarations contradict its unique-string assertion. Its12 reader slots are unattempted. Original source, manifest, error and PLAN.initial.md remain unchanged. Fresh run-02 targets only the artifact background: two dark native sources/repeats,12 completed slots. Arial returns intended first geometry in the normal branch but fails strict structure; Phosphate fails. Across profiles24 planned/12 completed/12 unattempted. No new payload.",
  73: "Two native sources and exact repeats complete all12 primary slots. PAVE first-selected P counters reach balance0.9, nominal span0.8108, stable wide rows9/11 and scored worst RMS0.2842. True rising-diagonal RMS0.5563 and ordinary dimension125 versus source133 still fail. DARE selects other letter counters rather than the intended D. Native words are readable locally; repeated words are not natural prose or a payload.",
  74: "Three native sources/repeats complete all15 primary slots. PILL has stable-wide fraction1 at all three first-selected counters, minimum balance0.8182 and nominal span0.8218, but true diagonal RMS up to0.5563 and ordinary dimension113 versus source125 fail. RILL and BILL also fail. Removing other counters and changing appendages does not resolve structure. BILL has two internal counters, and the ordinary locator can mix them. No payload/phone candidate.",
};
const receipts = [];
for (const [n, src, planned, cap, run] of configs) {
  const base = `docs/research/prose-qr/phase-${n}/`,
    source = `experiments/prose-qr/${src}`,
    dir = base + run + "/";
  const captures = await read(dir + "captures.json"),
    done = await read(dir + "done.json"),
    cases = [];
  for (const c of captures) {
    const row = {
      id: c.id,
      control: !!c.control,
      lane: c.lane ?? "conventional-control",
      capturePath: c.dir + "capture.json",
      pngPath: c.pngPath ?? null,
      pngSha256: c.pngSha256 ?? null,
      rejected: !!c.rejected,
      reasons: c.reasons ?? [],
      nativeUnattempted: !!c.nativeUnattempted,
      repeatExact: c.repeatExact ?? null,
      payload: c.payload,
      phoneCandidate: false,
    };
    if (!c.control && !c.nativeUnattempted) {
      assert.equal(sha(await readFile(c.pngPath)), c.pngSha256);
      assert.equal(c.repeatSha256, c.pngSha256);
      row.localVisualReview = {
        reviewed: true,
        recognizableDistinctLetters: true,
        ownerAcceptance: false,
        naturalProse: false,
        note: "Task agent inspected each native1:1 letter excerpt; full sources remain large repetitive word arrays.",
      };
      row.native = c.native;
      row.unit = c.unit;
      row.dimension = c.dimension;
    }
    if (!c.rejected) {
      const p = await read(c.dir + "passive-summary.json"),
        full = JSON.parse(
          gunzipSync(await readFile(c.dir + "passive-full.json.gz")),
        );
      assert(p.passiveReturnsMatch);
      assert.equal(p.returnedPayload, full.returnedPayload);
      assert.equal(p.scans.length, full.scans.length);
      row.ordinary = Object.fromEntries(
        await Promise.all(
          ["opencv", "zxing", "jsqr"].map(async (name) => [
            name,
            await read(c.dir + name + ".json"),
          ]),
        ),
      );
      assert.equal(
        JSON.stringify(full.returnedPayload),
        JSON.stringify(row.ordinary.jsqr.result?.data ?? null),
      );
      row.scans = p.scans.map((s, i) => {
        assert.deepEqual(s.selected, full.scans[i].selected);
        assert.deepEqual(s.locations, full.scans[i].locations);
        assert.equal(s.scoredRuns, full.scans[i].allScoredRuns.length);
        assert.equal(s.quads, full.scans[i].allQuads.length);
        return { ...s, strictSelectedNativeStructure: !c.control && strict(s) };
      });
      row.passiveReturnsMatch = true;
    }
    cases.push(row);
  }
  const natives = cases.filter((c) => !c.control),
    profiles = cases.filter((c) => c.scans),
    controls = cases.filter((c) => c.control),
    abort =
      n === 72
        ? {
            profile: "run-01",
            type: "setup-assertion",
            nativeCaptures: 0,
            readerCalls: 0,
            plannedPrimarySlots: 12,
            unattemptedPrimarySlots: 12,
            error: await read(base + "run-01/capture-error.json"),
            originalPlanSnapshot: base + "PLAN.initial.md",
          }
        : null;
  const a = {
    at: new Date().toISOString(),
    phase: n,
    goal: "unsolved",
    plannedNativeProfileSlots: planned + (n === 72 ? 2 : 0),
    nativeCaptures: natives.filter((c) => !c.nativeUnattempted).length,
    nativeExactRepeats: natives.filter((c) => c.repeatExact).length,
    nativeUniquePNGHashes: new Set(
      natives.map((c) => c.pngSha256).filter(Boolean),
    ).size,
    plannedPrimaryReaderSlots:
      done.plannedPrimaryReaderSlots + (abort?.plannedPrimarySlots ?? 0),
    completedPrimaryReaderSlots: done.completedPrimaryReaderSlots,
    unattemptedPrimaryReaderSlots:
      done.unattemptedPrimaryReaderSlots +
      (abort?.unattemptedPrimarySlots ?? 0),
    passiveProfiles: profiles.length,
    actualStockBranches: profiles.flatMap((c) => c.scans).length,
    nativeFirstIntendedBranches: natives
      .flatMap((c) => c.scans ?? [])
      .filter((s) => s.postReturnIntendedGeometry[0]?.intendedGeometry).length,
    nativeStrictSelectedPasses: natives
      .flatMap((c) => c.scans ?? [])
      .filter((s) => s.strictSelectedNativeStructure).length,
    controlSlots: controls.length * 3,
    controlExactSlots: controls.reduce(
      (sum, c) =>
        sum + Object.values(c.ordinary).filter((v) => v.exactURL).length,
      0,
    ),
    controlLimitation:
      "Normal control exact in all three implementations; inverted OpenCV fails while inverted ZXing/jsQR pass. Repeated profiles are not independent implementations.",
    newPayloadSources: 0,
    phoneTests: 0,
    phoneCandidates: 0,
    setupAbort: abort,
    cases,
    sources: {
      [script]: sha(await readFile(script)),
      [dir + "manifest.json"]: sha(await readFile(dir + "manifest.json")),
      [dir + "done.json"]: sha(await readFile(dir + "done.json")),
    },
  };
  assert.equal(a.nativeCaptures, planned);
  assert.equal(a.completedPrimaryReaderSlots, 3 * (planned + 2));
  assert.equal(a.controlExactSlots, 5);
  assert.equal(a.nativeStrictSelectedPasses, 0);
  await json(base + "analysis.json", a);
  await writeFile(
    base + "README.md",
    await format(
      `# Phase ${n} — ${["Visible outline Latin contours", "Counter-edge hypothesis", "Native page polarity", "Flat letter bowls", "Counter appendages"][n - 70]}\n\n${readmes[n]}\n\nAll results remain research only. Full native PNGs are not scannable-prose candidates. No source pixel was repaired, and no geometry was injected into an acceptance reader.\n`,
      { parser: "markdown" },
    ),
    { flag: "wx" },
  );
  const inventory = [];
  for (const p of [
    ...(await walk(base.slice(0, -1))),
    ...(await walk(source)),
  ].sort()) {
    const b = await readFile(p);
    inventory.push({ path: p, bytes: b.length, sha256: sha(b) });
  }
  const receipt = {
    at: new Date().toISOString(),
    phase: n,
    anchorHead: "f028c72870572a942d6d978d4df93d194e751442",
    goal: "unsolved",
    cap,
    prior: [{ path: prior, sha256: sha(await readFile(prior)) }],
    sources: { [script]: sha(await readFile(script)) },
    inventory,
  };
  const rb = await format(JSON.stringify(receipt), { parser: "json" });
  const bytes =
    inventory.reduce((s, f) => s + f.bytes, 0) + Buffer.byteLength(rb);
  assert(bytes < cap);
  await writeFile(base + "custody.json", rb, { flag: "wx" });
  receipts.push({
    path: base + "custody.json",
    sha256: sha(rb),
    logicalBytes: bytes,
    cap,
  });
  console.log(
    JSON.stringify({
      phase: n,
      bytes,
      primary: a.completedPrimaryReaderSlots,
      unattempted: a.unattemptedPrimaryReaderSlots,
      firstGeometry: a.nativeFirstIntendedBranches,
      strict: a.nativeStrictSelectedPasses,
    }),
  );
}
await json(
  "docs/research/prose-qr/session-2026-10-10-d/phase-receipts.json",
  receipts,
);

import assert from "node:assert/strict";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { gunzipSync } from "node:zlib";
import { sha, strict } from "./common.mjs";
const root = "docs/research/prose-qr/integrated-2026-10-10/empirical";
const source = "experiments/prose-qr/integrated-2026-10-10/empirical";
const read = async (p) => JSON.parse(await readFile(p));
const checks = [],
  limits = [],
  batches = [],
  passiveInvocations = [];
const check = (name, passed, evidence) => {
  checks.push({ name, passed: !!passed, evidence });
  assert(passed, name);
};
const hash = async (p) => sha(await readFile(p));
const walk = async (p) =>
  (
    await Promise.all(
      (await readdir(p, { withFileTypes: true })).map((e) =>
        e.isDirectory() ? walk(p + "/" + e.name) : [p + "/" + e.name],
      ),
    )
  ).flat();
const rgba = (p) => {
  const r = spawnSync(
    "python3",
    [
      "-c",
      "import cv2,sys;a=cv2.imread(sys.argv[1]);sys.stdout.buffer.write(cv2.cvtColor(a,cv2.COLOR_BGR2RGBA).tobytes())",
      p,
    ],
    { timeout: 10000, maxBuffer: 80000000 },
  );
  assert.equal(r.status, 0);
  return r.stdout;
};
const totals = {
  glyphResources: 0,
  nativeCaptures: 0,
  controlCaptures: 0,
  ordinaryCalls: 0,
  profiles: 0,
  repeats: 0,
  payloadTrials: 0,
  exactRepeats: 0,
  unattemptedReaderSlots: 0,
  unattemptedFullCaptures: 0,
  unattemptedResources: 0,
  nativeExactRecoveries: 0,
  nativeStrictPasses: 0,
};
for (const name of (await readdir(root, { withFileTypes: true }))
  .filter((e) => e.isDirectory() && /^resources-/.test(e.name))
  .map((e) => e.name)
  .sort()) {
  const p = await read(root + "/" + name + "/preregistration.json"),
    r = await read(root + "/" + name + "/results.json");
  for (const [path, expected] of Object.entries(p.sourceHashes))
    check(
      name + ": frozen script " + path,
      (await hash(path)) === expected,
      expected,
    );
  for (const t of p.specs) {
    const path = t.source ?? t.htmlPath;
    check(
      name + ": frozen resource HTML " + t.id,
      (await hash(path)) === (t.sourceSha256 ?? t.htmlSha256),
      path,
    );
  }
  for (const t of r.rows) {
    const exact =
      t.selectedExact ??
      (t.native.selected === t.expectedSelection &&
        t.native.text === t.expectedSelection);
    check(
      name + ": resource source/PNG custody " + t.id,
      t.sourceVerified && exact && (await hash(t.pngPath)) === t.pngSha256,
      t.pngPath,
    );
    check(
      name + ": installed native font " + t.id,
      t.nativeFonts.length > 0 &&
        t.nativeFonts.every((f) => f.isCustomFont === false),
      t.nativeFonts,
    );
    if (t.nativeFonts.some((f) => f.postScriptName !== t.font))
      limits.push({
        type: "frozen-font-descriptor-mismatch",
        resource: t.id,
        expected: t.font,
        actual: t.nativeFonts,
      });
    if (t.streamCustody) {
      for (const label of ["contours", "rgba"]) {
        const info = await read(t.dir + "/" + label + ".process.json"),
          stdout =
            label === "rgba"
              ? gunzipSync(
                  await readFile(t.dir + "/" + label + ".stdout.bin.gz"),
                )
              : await readFile(t.dir + "/" + label + ".stdout.txt"),
          stderr = await readFile(t.dir + "/" + label + ".stderr.txt");
        check(
          name + ": resource diagnostic stream custody " + t.id + "/" + label,
          info.status === 0 &&
            sha(stdout) === info.stdoutSha256 &&
            sha(stderr) === info.stderrSha256,
          info,
        );
        if (label === "rgba")
          check(
            name + ": exact resource pixel stream " + t.id,
            sha(stdout) === t.rgbaSha256 &&
              sha(rgba(t.pngPath)) === t.rgbaSha256,
            t.rgbaSha256,
          );
      }
    }
  }
  const failedUncaptured = (r.slots ?? []).filter(
    (t) => t.status === "failed" && !r.events.some((e) => e.id === t.id),
  ).length;
  check(
    name + ": finite denominator",
    r.captures === r.events.length &&
      r.rows.length === r.captures &&
      r.unattempted.length + r.captures + failedUncaptured === p.specs.length &&
      r.diagnostics === r.captures,
    {
      captures: r.captures,
      unattempted: r.unattempted.length,
      failedSetupBeforeCapture: failedUncaptured,
    },
  );
  check(name + ": owned browser closed", r.ownedBrowserClosed, null);
  totals.glyphResources += r.captures;
  totals.unattemptedResources += r.unattempted.length;
  totals.failedResourceSetupBeforeCapture =
    (totals.failedResourceSetupBeforeCapture ?? 0) + failedUncaptured;
}
for (const name of (await readdir(root, { withFileTypes: true }))
  .filter((e) => e.isDirectory() && /^(layout|payload)-/.test(e.name))
  .map((e) => e.name)
  .sort()) {
  const base = root + "/" + name,
    p = await read(base + "/preregistration.json"),
    r = await read(base + "/run-results.json"),
    events = await read(base + "/events.json");
  for (const [path, expected] of Object.entries(p.sourceHashes))
    check(
      name + ": frozen script " + path,
      (await hash(path)) === expected,
      expected,
    );
  for (const t of p.specs)
    check(
      name + ": frozen HTML " + t.id,
      (await hash(t.htmlPath)) === t.htmlSha256,
      t.htmlPath,
    );
  for (const c of r.captures) {
    const t = p.specs.find((t) => t.id === c.id);
    check(
      name + ": input/repeat hash " + c.id,
      (await hash(c.pngPath)) === c.pngSha256 &&
        (await hash(c.dir + "/repeat.png")) === c.repeatSha256 &&
        sha(rgba(c.pngPath)) === c.rgbaSha256 &&
        sha(rgba(c.dir + "/repeat.png")) === c.repeatRgbaSha256,
      c.dir,
    );
    check(
      name + ": exact repeat flag " + c.id,
      c.repeatExact === (c.pngSha256 === c.repeatSha256) &&
        c.repeatExact === (c.rgbaSha256 === c.repeatRgbaSha256),
      c.repeatExact,
    );
    check(
      name + ": after source custody " + c.id,
      c.sourceVerifiedAfterCapture &&
        (await hash(t.htmlPath)) === c.sourceHtmlSha256,
      t.htmlPath,
    );
    if (c.repeatExact) totals.exactRepeats++;
    if (c.kind === "native") {
      const d = await read(c.dir + "/dom.json");
      check(
        name + ": exact semantic source/paragraph/full Selection " + c.id,
        d.dom.paragraphs.length === 3 &&
          d.dom.paragraphs.every(
            (a, i) => a.text === t.texts[i] && a.selection === t.texts[i],
          ) &&
          d.dom.fullSelection === t.fullText &&
          d.dom.articleText === t.texts.join(""),
        c.dir + "/dom.json",
      );
      check(
        name + ": one visible span per actual codepoint " + c.id,
        d.dom.glyphs.length === [...t.texts.join("")].length &&
          new Set(d.dom.glyphs.map((g) => g.id)).size === d.dom.glyphs.length &&
          d.dom.glyphs.every(
            (g) =>
              g.opacity === "1" &&
              g.visibility === "visible" &&
              g.display !== "none",
          ) &&
          d.dom.images === 0 &&
          d.dom.descendantTags.every((tag) => ["P", "SPAN"].includes(tag)),
        d.dom.glyphs.length,
      );
      const fonts = d.fonts.flatMap((a) => a.fonts),
        actual = [...new Set(fonts.map((f) => f.postScriptName))];
      check(
        name + ": native installed font provenance " + c.id,
        fonts.every((f) => !f.isCustomFont) &&
          actual.every((f) => t.expectedFonts.includes(f)) &&
          t.expectedFonts.every((f) => actual.includes(f)),
        actual,
      );
      if (t.visualReviewRequired) {
        const review = await read(c.dir + "/visual-review.json"),
          ledger = await read(c.dir + "/actual-ledger.json"),
          imported = await read(t.measurementSpec.path),
          image = rgba(c.pngPath);
        check(
          name + ": original native image worker visual review " + c.id,
          review.pngSha256 === c.pngSha256 &&
            review.readable &&
            review.completeInk &&
            review.noLetterformOverlap,
          review,
        );
        check(
          name + ": complete actual pixel/function/quiet ledger " + c.id,
          ledger.pngSha256 === c.pngSha256 &&
            ledger.rgbaSha256 === c.rgbaSha256 &&
            ledger.specSha256 === (await hash(t.measurementSpec.path)) &&
            ledger.domSha256 === (await hash(c.dir + "/dom.json")) &&
            ledger.samples.length === t.geometry.dimension ** 2 &&
            ledger.quiet.length ===
              (t.geometry.dimension + 8) ** 2 - t.geometry.dimension ** 2 &&
            new Set(ledger.samples.map((a) => a.x + "," + a.y)).size ===
              ledger.samples.length &&
            [...ledger.samples, ...ledger.quiet].every(
              (a) =>
                a.gray === image[(a.py * t.width + a.px) * 4] &&
                a.literal === +(a.gray < 128) &&
                a.px ===
                  Math.floor(
                    t.geometry.origin + (a.x + 0.5) * t.geometry.unit,
                  ) &&
                a.py ===
                  Math.floor(t.geometry.origin + (a.y + 0.5) * t.geometry.unit),
            ) &&
            ledger.samples.every(
              (a) =>
                a.target === imported.target.matrix[a.y][a.x] &&
                JSON.stringify(a.ownership) ===
                  JSON.stringify(imported.target.map[a.y][a.x]),
            ) &&
            ledger.quiet.every((a) => a.target === 0),
          {
            samples: ledger.samples.length,
            quiet: ledger.quiet.length,
            literal: ledger.literal,
            adaptive: ledger.adaptive,
          },
        );
        const processReceipt = await read(c.dir + "/ledger-rgba.process.json"),
          exactRgba = gunzipSync(
            await readFile(c.dir + "/ledger-rgba.stdout.bin.gz"),
          );
        check(
          name + ": full source diagnostic raw stream custody " + c.id,
          processReceipt.status === 0 &&
            sha(exactRgba) === processReceipt.stdoutSha256 &&
            sha(exactRgba) === c.rgbaSha256 &&
            (await hash(c.dir + "/ledger-rgba.stderr.txt")) ===
              processReceipt.stderrSha256,
          processReceipt,
        );
        const reviewEvent = events.find(
            (e) => e.type === "visual-review-passed" && e.id === c.id,
          ),
          firstRead = events.find(
            (e) => e.type === "ordinaryCalls-invoked" && e.id === c.id,
          );
        check(
          name + ": reviewed unchanged native before ordinary slots " + c.id,
          reviewEvent &&
            firstRead &&
            Date.parse(reviewEvent.atUtc) < Date.parse(firstRead.atUtc) &&
            reviewEvent.receiptSha256 ===
              (await hash(c.dir + "/visual-review.json")),
          reviewEvent,
        );
        check(
          name + ": complete visible ornament envelopes retained " + c.id,
          ledger.ornamentInk.length === 4 &&
            ledger.ornamentInk.every(
              (a) =>
                a.visibleGray245InkBounds &&
                a.potentialBodyEnvelopeIntersections.length === 0,
            ) &&
            ledger.outOfViewportInkEnvelopes.length === 0,
          ledger.ornamentInk,
        );
      }
      if (t.samplePrediction) {
        const v = await read(c.dir + "/sample-verification.json");
        check(
          name + ": literal mixed sample model " + c.id,
          v.exact &&
            v.mismatches.length === 0 &&
            v.pngSha256 === c.pngSha256 &&
            v.predictionSha256 === (await hash(t.samplePrediction.path)),
          v.sampleCount,
        );
      }
    }
    const slots = r.slots.filter(
      (s) => s.id === c.id && s.status === "completed",
    );
    for (const slot of slots) {
      const rawBytes = await readFile(
          c.dir + "/" + slot.engine + ".raw.json.txt",
        ),
        raw = JSON.parse(rawBytes);
      check(
        name + ": raw ordinary custody " + c.id + "/" + slot.engine,
        sha(rawBytes) === slot.rawSha256 &&
          raw.pngSha256 === c.pngSha256 &&
          (!raw.rgbaSha256 || raw.rgbaSha256 === c.rgbaSha256),
        slot.texts,
      );
      if (slot.engine !== "opencv")
        check(
          name + ": options omitted " + c.id + "/" + slot.engine,
          raw.optionsArgumentOmitted === true,
          raw.invocation,
        );
      if (c.kind === "native" && slot.exactExpected)
        totals.nativeExactRecoveries++;
    }
    if (r.profiles.some((a) => a.id === c.id)) {
      const fullBytes = gunzipSync(
          await readFile(c.dir + "/passive-full.json.gz"),
        ),
        full = JSON.parse(fullBytes),
        summary = await read(c.dir + "/passive-summary.json");
      passiveInvocations.push({
        batch: name,
        id: c.id,
        pngSha256: c.pngSha256,
        instrumentedApiCalls: 1,
        additionalStockParityCalls: 0,
        branches: full.scans.map((s) => ({
          branch: s.branch,
          matrixDecoderInvocations: s.ordinaryDecodeAttempts.length,
        })),
        nestedMatrixDecoderInvocations: full.scans.reduce(
          (n, s) => n + s.ordinaryDecodeAttempts.length,
          0,
        ),
        source:
          "passive.mjs calls patched bundle once; parity compares saved ordinary baseline without a second stock call",
      });
      check(
        name + ": lossless full passive custody/parity " + c.id,
        sha(fullBytes) === summary.rawSha256 &&
          full.passiveReturnsMatch === true &&
          full.pngSha256 === c.pngSha256 &&
          full.rgbaSha256 === c.rgbaSha256,
        c.dir + "/passive-full.json.gz",
      );
      check(
        name + ": strict unchanged conjunction recomputation " + c.id,
        full.scans.every((s) => strict(s) === s.strictPass),
        full.scans.map((s) => ({ branch: s.branch, strictPass: s.strictPass })),
      );
      if (c.kind === "native")
        totals.nativeStrictPasses += full.scans.filter(
          (s) => s.strictPass,
        ).length;
    }
  }
  const counted = (key) =>
    events.filter((e) => e.type === key + "-invoked").length;
  for (const key of [
    "nativeCaptures",
    "controlCaptures",
    "ordinaryCalls",
    "profiles",
    "repeats",
    "payloadTrials",
  ])
    totals[key] += counted(key);
  check(
    name + ": event/capture/call denominators",
    counted("nativeCaptures") + counted("controlCaptures") ===
      r.captures.length &&
      counted("ordinaryCalls") ===
        r.slots.filter((s) => s.status !== "unattempted").length &&
      counted("profiles") === r.profiles.length &&
      counted("repeats") === r.captures.length,
    {
      captures: r.captures.length,
      ordinary: counted("ordinaryCalls"),
      profiles: counted("profiles"),
    },
  );
  check(name + ": owned browser closed", r.browserClosed, null);
  totals.unattemptedReaderSlots += r.slots.filter(
    (s) => s.status === "unattempted",
  ).length;
  totals.unattemptedFullCaptures += p.specs.length - r.captures.length;
  batches.push({
    name,
    frozen: p.denominator,
    captures: r.captures.length,
    ordinary: counted("ordinaryCalls"),
    profiles: counted("profiles"),
    stop: r.stop,
    unattemptedReaders: r.slots.filter((s) => s.status === "unattempted")
      .length,
  });
}
const callAccounting = {
  primaryOrdinaryApiCalls: totals.ordinaryCalls,
  instrumentedPassiveApiCalls: passiveInvocations.length,
  additionalStockParityApiCalls: 0,
  nestedMatrixDecoderInvocationsInsidePassive: passiveInvocations.reduce(
    (n, p) => n + p.nestedMatrixDecoderInvocations,
    0,
  ),
  profiles: passiveInvocations,
};
callAccounting.conservativeInclusiveSum =
  callAccounting.primaryOrdinaryApiCalls +
  callAccounting.instrumentedPassiveApiCalls +
  callAccounting.nestedMatrixDecoderInvocationsInsidePassive;
check(
  "Inclusive primary/passive/nested call accounting below96",
  callAccounting.conservativeInclusiveSum <= 96,
  callAccounting,
);
const budget = await read(root + "/budget.json");
check(
  "Global ledger reconciles exact actual events",
  Object.keys(budget).every((k) => budget[k] === totals[k]),
  { budget, totals },
);
check(
  "Allocation caps",
  totals.glyphResources <= 128 &&
    totals.nativeCaptures <= 24 &&
    totals.controlCaptures <= 8 &&
    totals.ordinaryCalls <= 96 &&
    totals.payloadTrials <= 4,
  totals,
);
check(
  "One passive and immediate repeat maximum per full capture",
  totals.profiles <= totals.nativeCaptures + totals.controlCaptures &&
    totals.repeats === totals.nativeCaptures + totals.controlCaptures,
  totals,
);
limits.push({
  type: "invalid-resource01-canvas-metrics",
  detail:
    "All resources-01 canvas advance/ascent/descent/left/right fields rejected because invalid computed font shorthand fell back to10px. Actual PNG, CDP fonts, Range rectangle and source diagnostic retained.",
});
limits.push({
  type: "strict-and-recovery",
  nativeStrictPasses: totals.nativeStrictPasses,
  nativeExactRecoveries: totals.nativeExactRecoveries,
  detail:
    "No qualifying native candidate. Wrong empty-string jsQR decode object stopped layout-01; later null results remain distinct. Native-app/phone/print/portable clipboard acceptance untested.",
});
const paths = [...(await walk(root)), ...(await walk(source))];
const artifactBytes = (
  await Promise.all(paths.map(async (p) => (await stat(p)).size))
).reduce((a, b) => a + b, 0);
check(
  "Owned artifact bytes below48MB",
  artifactBytes < 48000000,
  artifactBytes,
);
const result = {
  schema: "aqrobat.integrated.empirical-verification.v1",
  atUtc: new Date().toISOString(),
  verifierSha256: await hash(source + "/verify-v3.mjs"),
  passed: true,
  checks,
  totals,
  batches,
  callAccounting,
  limitations: [
    ...limits,
    {
      type: "resource-success-stderr-unavailable",
      batches: ["resources-01", "resources-02"],
      detail:
        "Successful contour stdout retained, stderr not independently archived by originalexecFileSync. Newresources03+ retainstdout/stderr/status fully.",
    },
    {
      type: "resource03-font-inspection-root-failure",
      detail:
        "CDP #artifact returnedemptyfonts for nestedarticle/p/spans. Fourornamentcaptures retained; firstbodyfailedsetupbeforecapture andfiveunattempted. Freshresources04queriesactual#textparagraph andpasses.",
    },
  ],
  allocation: {
    path: "docs/research/prose-qr/integrated-2026-10-10/allocation-02.json",
    sha256: await hash(
      "docs/research/prose-qr/integrated-2026-10-10/allocation-02.json",
    ),
  },
  artifactBytes,
  artifactFiles: paths.length,
  verificationBoundary:
    "No new captures, ordinary readers or passive profiles. Retained raw artifacts and code/source custody recomputed. Independent empirical review remains separate.",
};
await writeFile(
  root + "/verification-03.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    passed: true,
    checks: checks.length,
    totals,
    artifactBytes,
    limitations: result.limitations.length,
    callAccounting: { ...callAccounting, profiles: undefined },
  }),
);

import { readFile, readdir, writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { sha } from "./common.mjs";
const root = "docs/research/prose-qr/integrated-2026-10-10/empirical",
  source = "experiments/prose-qr/integrated-2026-10-10/empirical";
const read = async (p) => JSON.parse(await readFile(p));
const rows = [];
for (const name of (await readdir(root, { withFileTypes: true }))
  .filter(
    (e) =>
      e.isDirectory() &&
      /^(resources|layout|payload|construction)-/.test(e.name),
  )
  .map((e) => e.name)
  .sort()) {
  const dir = root + "/" + name,
    preregPath = dir + "/preregistration.json",
    p = await read(preregPath);
  const row = {
    id: name,
    actor: "integrated_empirical",
    kind: name.split("-")[0],
    preregistrationPath: preregPath,
    preregistrationSha256: sha(await readFile(preregPath)),
    frozenAtUtc: p.frozenAtUtc,
    planned: p.denominator,
    outcomes: [],
    captures: 0,
    ordinaryApiCalls: 0,
    passiveApiCalls: 0,
    nestedPassiveMatrixDecoderInvocations: 0,
    repeatAttempts: 0,
    exactRepeats: 0,
    exploratoryPayloadTrials: 0,
  };
  if (row.kind === "resources") {
    row.resultsPath = dir + "/results.json";
    const r = await read(row.resultsPath);
    row.planned = {
      resources: p.specs.length,
      diagnostics: p.specs.length,
      ordinaryApiCalls: 0,
      profiles: 0,
      repeats: 0,
    };
    row.attempted = {
      resources: r.captures,
      diagnostics: r.diagnostics,
      completedRows: r.rows.length,
    };
    row.captures = r.captures;
    row.unattempted = { resources: r.unattempted.length };
    row.failedSetupBeforeCapture = (r.slots ?? []).filter(
      (s) => s.status === "failed" && !r.events.some((e) => e.id === s.id),
    ).length;
    row.stop = r.stop;
    row.outcome = r.stop ? "stopped-preserved" : "completed-source-only";
    row.outcomes.push({
      sourceEligibility:
        "Resource diagnostics only, never ordinary first-selection or payload recovery",
      rows: r.rows.map((a) => ({
        id: a.id,
        font: a.font,
        sourceSha256: a.htmlSha256 ?? a.sourceSha256,
        pngSha256: a.pngSha256,
        models: a.models?.map((m) => ({
          axes: m.metric.completeAxes,
          worstRMS: m.metric.worstRMS,
        })),
        selectedExact:
          a.selectedExact ?? a.native?.selected === a.expectedSelection,
      })),
    });
  } else if (row.kind === "construction") {
    const failPath = dir + "/ownership-failure.json";
    let failure = null;
    try {
      failure = await read(failPath);
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
    row.resultsPath = failure ? failPath : dir + "/sampling-summary.json";
    const r = failure ?? (await read(row.resultsPath));
    row.attempted = {
      inputMaps: p.denominator.maps,
      modulePixelsRead: p.denominator.maps * p.denominator.moduleSamplesPerMap,
      quietPixelsRead: p.denominator.maps * p.denominator.quietSamplesPerMap,
      sourceAdaptiveBinarizerCalls: 2,
    };
    row.unattempted = { nativeConstructionOutputs: failure ? 1 : 0 };
    row.outcome = failure
      ? "rejected-source-ownership"
      : "complete-source-map-not-embedding";
    row.stop = failure
      ? {
          reason: "Changed pixel without conservative native glyph attribution",
          unknownCells: failure.unknown.length,
        }
      : null;
    row.outcomes.push(
      failure
        ? {
            unknownCells: failure.unknown.length,
            retainedUnknownCells: failure.unknown,
          }
        : {
            moduleSamples: r.moduleSamples,
            quietSamples: r.quietSamples,
            activeGlyphGroups: r.activeGlyphGroups,
            togglingSamples: r.togglingSamples,
            quietDark: r.quietBlackSamples,
            inputSha256: r.inputSha256,
          },
    );
  } else {
    row.resultsPath = dir + "/run-results.json";
    const r = await read(row.resultsPath),
      events = await read(dir + "/events.json");
    const count = (k) => events.filter((e) => e.type === k + "-invoked").length;
    row.captures = r.captures.length;
    row.ordinaryApiCalls = count("ordinaryCalls");
    row.passiveApiCalls = count("profiles");
    row.repeatAttempts = count("repeats");
    row.exactRepeats = r.captures.filter((c) => c.repeatExact).length;
    row.exploratoryPayloadTrials = count("payloadTrials");
    row.attempted = {
      nativeCaptures: count("nativeCaptures"),
      controlCaptures: count("controlCaptures"),
      ordinaryApiCalls: row.ordinaryApiCalls,
      passiveProfiles: row.passiveApiCalls,
      repeats: row.repeatAttempts,
      exploratoryPayloadTrials: row.exploratoryPayloadTrials,
    };
    row.unattempted = {
      captures: p.specs.length - r.captures.length,
      ordinarySlots: r.slots.filter((s) => s.status === "unattempted").length,
      profiles: p.denominator.profiles - row.passiveApiCalls,
      exploratoryPayloadTrials:
        p.denominator.payloadTrials - row.exploratoryPayloadTrials,
    };
    row.stop = r.stop;
    row.outcome = r.stop
      ? "stopped-preserved"
      : "completed-no-qualifying-native";
    for (const c of r.captures) {
      const slots = r.slots.filter((s) => s.id === c.id),
        o = {
          id: c.id,
          kind: c.kind,
          pngSha256: c.pngSha256,
          repeatExact: c.repeatExact,
          ordinary: slots.map((s) => ({
            engine: s.engine,
            status: s.status,
            texts: s.texts,
            exactURL: s.exactExpected ?? null,
          })),
          strict: null,
        };
      if (r.profiles.some((a) => a.id === c.id)) {
        const full = JSON.parse(
          gunzipSync(await readFile(c.dir + "/passive-full.json.gz")),
        );
        o.strict = full.scans.map((s) => ({
          branch: s.branch,
          strict: s.strictPass,
          intendedFirst:
            s.postReturnIntendedGeometry[0]?.intendedGeometry ?? false,
        }));
        o.nestedPassiveMatrixDecoderInvocations = full.scans.reduce(
          (n, s) => n + s.ordinaryDecodeAttempts.length,
          0,
        );
        row.nestedPassiveMatrixDecoderInvocations +=
          o.nestedPassiveMatrixDecoderInvocations;
      }
      row.outcomes.push(o);
    }
  }
  row.resultsSha256 = sha(await readFile(row.resultsPath));
  rows.push(row);
}
for (const [id, stderr, snapshot, reason] of [
  [
    "layout-01-prepare-01",
    "layout-01.prepare.stderr.txt",
    "layout-01.prepare-failed-source.mjs.gz",
    "Wrong relative vendor import; no source/preregistration generated",
  ],
  [
    "layout-01-prepare-02",
    "layout-01.prepare-fixed.stderr.txt",
    "layout-01.prepare-failed-source2.mjs.gz",
    "Wrong named vendor exports; pinned encoder exports default",
  ],
  [
    "layout-01-invocation-01",
    "layout-01.stderr.txt",
    null,
    "Runner invoked before preregistration existed; ENOENT before browser/capture/reader",
  ],
])
  rows.push({
    id,
    actor: "integrated_empirical",
    kind: "setup-failure",
    planned: { setupInvocations: 1 },
    attempted: {
      setupInvocations: 1,
      captures: 0,
      ordinaryApiCalls: 0,
      profiles: 0,
    },
    unattempted: {
      experimentalBatch: "Not yet frozen; no experimental denominator invented",
    },
    preregistrationPath: null,
    resultsPath: root + "/" + stderr,
    resultsSha256: sha(await readFile(root + "/" + stderr)),
    sourceSnapshot: snapshot ? root + "/" + snapshot : null,
    outcome: "rejected-before-experiment",
    stop: { reason },
    captures: 0,
    ordinaryApiCalls: 0,
    passiveApiCalls: 0,
    nestedPassiveMatrixDecoderInvocations: 0,
    repeatAttempts: 0,
    exactRepeats: 0,
    exploratoryPayloadTrials: 0,
  });
rows.push({
  id: "selection-preflight",
  actor: "integrated_empirical",
  kind: "selection-preflight",
  planned: { domSelectionChecks: 1 },
  attempted: { domSelectionChecks: 1, captures: 0, ordinaryApiCalls: 0 },
  preregistrationPath: null,
  resultsPath: root + "/selection-preflight.json",
  resultsSha256: sha(await readFile(root + "/selection-preflight.json")),
  outcome: "source-spacing-rejected-before-captures",
  stop: {
    reason:
      "Normal white-space trimmed absolute-span trailing spaces; subsequent frozen sources use white-space:pre",
  },
  captures: 0,
  ordinaryApiCalls: 0,
  passiveApiCalls: 0,
  nestedPassiveMatrixDecoderInvocations: 0,
  repeatAttempts: 0,
  exactRepeats: 0,
  exploratoryPayloadTrials: 0,
});
const total = (k) => rows.reduce((n, r) => n + (r[k] ?? 0), 0),
  budget = await read(root + "/budget.json");
const summary = {
  schema: "aqrobat.integrated.empirical-complete-batch-summary.v1",
  atUtc: new Date().toISOString(),
  builderSha256: sha(await readFile(source + "/summarize.mjs")),
  actor: "integrated_empirical",
  scope:
    "Every empirical frozen resource/layout/construction/payload batch plus retained pure setup/selection failures. Design/mechanism arithmetic batches belong to their separate handbacks; they did not invoke captures/readers.",
  rows,
  budget,
  accounting: {
    primaryOrdinaryApiCalls: total("ordinaryApiCalls"),
    passiveInstrumentedApiCalls: total("passiveApiCalls"),
    additionalStockParityCalls: 0,
    nestedPassiveMatrixDecoderInvocations: total(
      "nestedPassiveMatrixDecoderInvocations",
    ),
    conservativeInclusiveSum:
      total("ordinaryApiCalls") +
      total("passiveApiCalls") +
      total("nestedPassiveMatrixDecoderInvocations"),
    repeatsAttempted: total("repeatAttempts"),
    exactRepeats: total("exactRepeats"),
    exploratoryTrialsActuallyCaptured: total("exploratoryPayloadTrials"),
  },
  nonExperimentClosingChecks:
    "Verification, source hashing, formatting/syntax checks, report building and pure retained-profile arithmetic add no captures/readers/profiles. Source adaptive binarizer calls remain separately declared diagnostics.",
  newCaptures: 0,
  newReaderCalls: 0,
};
await writeFile(
  root + "/batch-summary.json",
  JSON.stringify(summary, null, 2) + "\n",
);
const columns = [
  "id",
  "actor",
  "kind",
  "planned",
  "attempted",
  "unattempted",
  "outcome",
  "stop",
  "preregistrationPath",
  "resultsPath",
  "ordinaryApiCalls",
  "passiveApiCalls",
  "nestedPassiveMatrixDecoderInvocations",
  "repeatAttempts",
  "exactRepeats",
  "exploratoryPayloadTrials",
];
const csv = (v) =>
  '"' +
  String(typeof v === "object" ? JSON.stringify(v) : (v ?? "")).replaceAll(
    '"',
    '""',
  ) +
  '"';
await writeFile(
  root + "/batch-summary.csv",
  columns.join(",") +
    "\n" +
    rows.map((r) => columns.map((c) => csv(r[c])).join(",")).join("\n") +
    "\n",
);
console.log(
  JSON.stringify({ rows: rows.length, accounting: summary.accounting, budget }),
);

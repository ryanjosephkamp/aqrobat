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
  batches = [];
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
for (const name of ["resources-01", "resources-02"]) {
  const p = await read(root + "/" + name + "/preregistration.json"),
    r = await read(root + "/" + name + "/results.json");
  for (const [path, expected] of Object.entries(p.sourceHashes))
    check(
      name + ": frozen script " + path,
      (await hash(path)) === expected,
      expected,
    );
  for (const t of p.specs)
    check(
      name + ": frozen prose " + t.id,
      (await hash(t.source)) === t.sourceSha256,
      t.source,
    );
  for (const t of r.rows) {
    check(
      name + ": resource source/PNG custody " + t.id,
      t.sourceVerified &&
        t.selectedExact &&
        (await hash(t.pngPath)) === t.pngSha256,
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
  }
  check(
    name + ": finite denominator",
    r.captures === r.events.length &&
      r.rows.length === r.captures &&
      r.unattempted.length + r.captures === p.specs.length &&
      r.diagnostics === r.captures,
    { captures: r.captures, unattempted: r.unattempted.length },
  );
  check(name + ": owned browser closed", r.ownedBrowserClosed, null);
  totals.glyphResources += r.captures;
  totals.unattemptedResources += r.unattempted.length;
}
for (const name of [
  "layout-01",
  "layout-02",
  "layout-03",
  "layout-04",
  "layout-05",
  "payload-01",
  "payload-02",
]) {
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
const budget = await read(root + "/budget.json");
check(
  "Global ledger reconciles exact actual events",
  Object.keys(budget).every((k) => budget[k] === totals[k]),
  { budget, totals },
);
check(
  "Allocation caps",
  totals.glyphResources <= 96 &&
    totals.nativeCaptures <= 20 &&
    totals.controlCaptures <= 6 &&
    totals.ordinaryCalls <= 78 &&
    totals.payloadTrials <= 3,
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
  "Owned artifact bytes below42MB",
  artifactBytes < 42000000,
  artifactBytes,
);
const result = {
  schema: "aqrobat.integrated.empirical-verification.v1",
  atUtc: new Date().toISOString(),
  verifierSha256: await hash(source + "/verify.mjs"),
  passed: true,
  checks,
  totals,
  batches,
  limitations: limits,
  artifactBytes,
  artifactFiles: paths.length,
  verificationBoundary:
    "No new captures, ordinary readers or passive profiles. Retained raw artifacts and code/source custody recomputed. Independent empirical review remains separate.",
};
await writeFile(
  root + "/verification.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    passed: true,
    checks: checks.length,
    totals,
    artifactBytes,
    limitations: limits.length,
  }),
);

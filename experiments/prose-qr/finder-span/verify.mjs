import { chromium } from "playwright";
import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { format } from "prettier";
import assert from "node:assert/strict";
import { readBarcodes } from "zxing-wasm/reader";
import { diagnose, bundleHash } from "../glyph-geometry/diagnostic.mjs";
import { decode } from "../decoders.mjs";
import { finderMatrix } from "../finder-native/layout.mjs";
const root = resolve("docs/research/prose-qr/phase-07"),
  sourceRoot = resolve("experiments/prose-qr/finder-span"),
  sha = (b) => createHash("sha256").update(b).digest("hex");
async function files(p) {
  const out = [];
  for (const e of await readdir(p, { withFileTypes: true })) {
    const q = resolve(p, e.name);
    out.push(...(e.isDirectory() ? await files(q) : [q]));
  }
  return out;
}
const list = await files(root),
  archives = new Map();
for (const p of list.filter((p) => p.endsWith(".mjs.txt")))
  archives.set(sha(await readFile(p)), relative(process.cwd(), p));
async function source(path, hash) {
  const current = sha(await readFile(path));
  assert(
    current === hash || archives.has(hash),
    "Missing executed source " + path,
  );
  return {
    path,
    sha256: hash,
    preservedAt: current === hash ? path : archives.get(hash),
  };
}
const batches = [],
  sources = [],
  planned = new Set(),
  ids = new Set(),
  inputs = [];
let native = 0,
  repeats = 0,
  controls = 0,
  aborts = 0;
const seed = JSON.parse(
    await readFile(
      "docs/research/prose-qr/phase-06/seam-02/seam-01-layout.json",
      "utf8",
    ),
  ),
  sourceFontGlyphs = JSON.parse(
    await readFile("docs/research/prose-qr/phase-06/font-metrics.json", "utf8"),
  ).fonts["Impact|400"].glyphs;
for (const path of list.filter((p) => p.endsWith("/manifest.json")).sort()) {
  const base = resolve(path, ".."),
    m = JSON.parse(await readFile(path, "utf8"));
  for (const [p, h] of Object.entries(m.sourceHashes))
    sources.push(await source(p, h));
  for (const s of m.specs) planned.add(s.id);
  let rows = [],
    abort = null;
  try {
    rows = (await readFile(resolve(base, "results.jsonl"), "utf8"))
      .trim()
      .split("\n")
      .filter(Boolean)
      .map(JSON.parse);
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  try {
    abort = JSON.parse(await readFile(resolve(base, "aborted.json"), "utf8"));
    assert.equal(abort.completed, rows.length);
    aborts++;
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  if (!abort) assert.equal(rows.length, m.specs.length);
  const replay = JSON.parse(
    await readFile(resolve(base, "seed-replay.json"), "utf8"),
  );
  assert(replay.matches);
  assert.equal(replay.expectedPNGHash, replay.replayedPNGHash);
  for (const r of rows) {
    assert(!ids.has(r.id));
    ids.add(r.id);
    assert.deepEqual(
      r.spec,
      m.specs.find((s) => s.id === r.id),
    );
    assert.equal(r.encodedPayload, null);
    assert.equal(r.diagnostic.correctFinder, false);
    const txt = await readFile(resolve(base, r.id + ".txt"));
    assert.equal(sha(txt), r.txtSha256);
    assert.equal(
      sha(await readFile(resolve(base, r.id + ".html.gz"))),
      r.gzipSha256,
    );
    const html = gunzipSync(
      await readFile(resolve(base, r.id + ".html.gz")),
    ).toString();
    assert(html.includes('id="corner-0"'));
    const l = JSON.parse(
      await readFile(resolve(base, r.id + "-layout.json"), "utf8"),
    );
    assert.equal(l.plainText, txt.toString());
    const expected = seed.plainText.split("\n");
    if (r.spec.guard) {
      const iw = Array(3).fill("I".repeat(14)).join(" ");
      expected[6] =
        r.spec.guard === 1
          ? expected[5]
          : r.spec.guard === 2
            ? "eeee me eeee me eeee me eeee"
            : iw;
      if (r.spec.guard === 4) expected[8] = iw;
    }
    assert.equal(l.plainText, expected.join("\n"));
    assert(l.actualAdvances.every((w) => w <= l.field));
    assert(l.structural.globalInkEnvelope <= l.lineHeight + 1e-8);
    assert.equal(r.fit.childElements, 0);
    assert.equal(r.fit.weight, "400");
    assert.equal(r.fit.fontSize, r.spec.fontSize + "px");
    assert(r.fit.scrollWidth <= Math.ceil(l.field) + 1);
    const fm = JSON.parse(
      await readFile(resolve(base, r.id + "-native-metrics.json"), "utf8"),
    );
    assert(fm.actualEnvelope <= l.lineHeight + 1 / 64);
    assert(fm.platformFonts.every((f) => f.familyName === "Impact"));
    for (const [i, s] of l.plainText.split("\n").entries()) {
      const glyphSum = [...s].reduce(
        (n, c) =>
          n +
          (c === " "
            ? (sourceFontGlyphs[" "].advance * r.spec.fontSize) / 20
            : fm.nativeGlyphMetrics[c].width) +
          l.structural.tracking,
        0,
      );
      assert(
        Math.abs(glyphSum - l.actualAdvances[i]) < 1 / 64,
        "Native advance mismatch",
      );
    }
    assert(r.replay.repeatMatches);
    assert.equal(r.pngSha256, r.replay.repeatedPNGHash);
    repeats++;
    native++;
    inputs.push({ base, type: "native-finder", record: r, layout: l });
  }
  const c = JSON.parse(await readFile(resolve(base, "controls.json"), "utf8"));
  assert(
    c.fullQR.baseline.jsQR.exact &&
      c.fullQR.baseline.zxing.exact &&
      c.fullQR.ordinaryZXing.exact,
  );
  assert(c.solidFinder.diagnostic.correctFinder);
  inputs.push(
    { base, type: "full-control", record: c.fullQR },
    {
      base,
      type: "solid-control",
      record: c.solidFinder,
      layout: { unit: 24, quiet: 5, modules: 25 },
    },
  );
  controls++;
  batches.push({
    batch: relative(root, base),
    planned: m.specs.length,
    native: rows.length,
    abort,
    uncompleted: m.specs
      .filter((s) => !rows.some((r) => r.id === s.id))
      .map((s) => s.id),
  });
}
assert.equal(planned.size, 6);
assert.equal(native, 5);
assert.equal(controls, 3);
assert.equal(aborts, 1);
assert.equal(repeats, 5);
assert.equal(inputs.length, 11);
const reject = JSON.parse(
    await readFile(resolve(root, "guard-source-width-rejection.json"), "utf8"),
  ),
  g = JSON.parse(
    await readFile("docs/research/prose-qr/phase-06/font-metrics.json", "utf8"),
  ).fonts["Impact|400"].glyphs;
assert.equal(
  [...reject.sourceRow].reduce((n, c) => n + g[c].advance - 0.5, 0),
  reject.actualAdvance,
);
assert(reject.actualAdvance > reject.field && !reject.nativeCapture);
assert(!ids.has(reject.id));
const auditReceipts = [];
for (const name of ["span-audit-01.json.gz", "join-audit-01.json.gz"]) {
  const b = await readFile(resolve(root, name)),
    a = JSON.parse(gunzipSync(b)),
    script = name.startsWith("span")
      ? "experiments/prose-qr/finder-span/audit.mjs"
      : "experiments/prose-qr/finder-span/joins.mjs";
  sources.push(await source(script, a.sourceScriptSha256));
  assert.equal(a.bundleSha256, bundleHash);
  assert.equal(a.newCaptures, 0);
  assert.equal(a.newPayloadProbes, 0);
  for (const r of a.results) {
    assert(r.instrumentedLocationsMatch);
    assert.equal(sha(await readFile(r.path)), r.pngSha256);
    assert.equal(r.allScoredPoints.length, r.scoredPointCount);
  }
  auditReceipts.push({
    name,
    sha256: sha(b),
    retainedInputs: a.results.length,
    ordinaryReturnsMatch: a.results.length,
  });
}
const prior = [];
for (const phase of ["phase-04", "phase-05", "phase-06"]) {
  const path = "docs/research/prose-qr/" + phase + "/custody.json",
    b = await readFile(path),
    c = JSON.parse(b);
  for (const r of c.inventory) {
    const actual = await readFile(r.path);
    assert.equal(actual.length, r.bytes);
    assert.equal(sha(actual), r.sha256);
  }
  prior.push({
    phase,
    path,
    sha256: sha(b),
    inventoryEntriesUnchanged: c.inventory.length,
  });
}
const downloads = JSON.parse(
  await readFile(
    "docs/research/prose-qr/phase-06/verification-final-02.json",
    "utf8",
  ),
).downloads;
for (const r of downloads)
  assert.equal(sha(await readFile("downloads/" + r.name)), r.sha256);
const pkg = JSON.parse(await readFile("package.json", "utf8"));
assert(pkg.private && pkg.version === "0.4.2");
const handback = JSON.parse(
  await readFile(resolve(root, "browser-check.json"), "utf8"),
);
assert.equal(
  handback.htmlSha256,
  sha(await readFile(resolve(root, "index.html"))),
);
assert.equal(
  handback.checkpointSha256,
  sha(await readFile(resolve(root, "CHECKPOINT.md"))),
);
assert.equal(handback.diagramStages, 3);
const browser = await chromium.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  }),
  pixelReplay = [];
try {
  const page = await browser.newPage();
  for (const { base, type, record: r, layout } of inputs) {
    const path = resolve(base, r.path),
      b = await readFile(path),
      out = { path: relative(process.cwd(), path), type, pngSha256: sha(b) };
    try {
      assert.equal(sha(b), r.pngSha256);
      const v = await page.evaluate(async (s) => {
          const img = new Image();
          img.src = "data:image/png;base64," + s;
          await img.decode();
          const c = document.createElement("canvas");
          c.width = img.width;
          c.height = img.height;
          const ctx = c.getContext("2d");
          ctx.drawImage(img, 0, 0);
          const a = ctx.getImageData(0, 0, c.width, c.height).data;
          let raw = "";
          for (let i = 0; i < a.length; i += 32768)
            raw += String.fromCharCode(...a.subarray(i, i + 32768));
          return { width: c.width, height: c.height, data: btoa(raw) };
        }, b.toString("base64")),
        p = {
          ...v,
          data: new Uint8ClampedArray(Buffer.from(v.data, "base64")),
        };
      assert.equal(v.width, r.width);
      assert.equal(v.height, r.height);
      assert.equal(sha(p.data), r.rgbaSha256);
      out.rgbaMatches = true;
      if (type === "full-control") {
        const d = await decode(p, "https://example.com/"),
          ordinary = await readBarcodes(p, { formats: ["QRCode"] });
        assert(
          d.jsQR.exact &&
            d.zxing.exact &&
            ordinary.some((x) => x.text === "https://example.com/"),
        );
        out.exactProfiles = 3;
      } else {
        const d = diagnose(p, { ...layout, matrix: finderMatrix() }),
          old = { ...r.diagnostic },
          now = { ...d };
        delete old.classification;
        delete now.classification;
        assert.deepEqual(JSON.parse(JSON.stringify(now)), old);
        out.diagnosticMatches = true;
      }
      out.passed = true;
    } catch (e) {
      out.passed = false;
      out.error = e.message;
    }
    pixelReplay.push(out);
  }
} finally {
  await browser.close();
}
let bytes = 0;
for (const p of [...(await files(root)), ...(await files(sourceRoot))])
  bytes += (await stat(p)).size;
const receipt = {
  at: new Date().toISOString(),
  baseline: "80f1b54a024cfb456f287078f2af7edb7e2579f8",
  sourceScriptSha256: sha(await readFile(new URL(import.meta.url))),
  batches,
  uniquePlannedNativeCases: 6,
  nativeFinderLayouts: native,
  intendedOrdinaryLocatorGeometries: 0,
  sourceWidthRejections: [reject],
  exactImmediateNativeRepeats: repeats,
  conventionalFullQrControls: controls,
  initialPassingControlProbeAttempts: 9,
  solidFinderControls: controls,
  exactSeedReplays: 3,
  encodedCandidatePayloads: 0,
  phoneCandidates: 0,
  auditReceipts,
  sourceCustody: sources,
  prior,
  downloads,
  productVersion: pkg.version,
  npmPrivate: pkg.private,
  readOnlyPixelReplay: {
    results: pixelReplay,
    passed: pixelReplay.filter((r) => r.passed).length,
    failed: pixelReplay.filter((r) => !r.passed).length,
    additionalPassingFullQrControlAttempts:
      pixelReplay.filter((r) => r.exactProfiles === 3).length * 3,
  },
  handbackBrowserCheck: {
    viewport: handback.viewport,
    diagramStages: 3,
    checkpointDownloadExact: true,
    clipboard: "Simulated fallback only; native clipboard untested",
  },
  phaseBytesBeforeReceipt: bytes,
  logicalFileSafeguardBytes: 1_500_000,
  proseAcceptance: "unsolved",
};
const output = await format(JSON.stringify(receipt), { parser: "json" });
assert(bytes + Buffer.byteLength(output) < 1_500_000);
await writeFile(resolve(root, "verification.json"), output, { flag: "wx" });
assert.equal(pixelReplay.length, 11);
assert(pixelReplay.every((r) => r.passed));
console.log(
  JSON.stringify({
    native,
    repeats,
    controls,
    prior: prior.map((r) => r.inventoryEntriesUnchanged),
    pixelReplay: pixelReplay.length,
    bytes,
  }),
);

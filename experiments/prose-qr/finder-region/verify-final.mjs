import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { chromium } from "playwright";
import { gunzipSync } from "node:zlib";
import { format } from "prettier";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { probe } from "./probe.mjs";
import { solidTriplet } from "../finder-native/layout.mjs";
import { decode } from "../decoders.mjs";
import { readBarcodes } from "zxing-wasm/reader";
const root = "docs/research/prose-qr/phase-08/",
  sha = (b) => createHash("sha256").update(b).digest("hex"),
  git = (...a) => execFileSync("git", a, { encoding: "utf8" }).trim();
assert.equal(git("branch", "--show-current"), "codex/aqrobat-foundation");
assert.equal(
  git("remote", "get-url", "origin"),
  "https://github.com/ryanjosephkamp/aqrobat.git",
);
const prior = [];
for (const phase of ["04", "05", "06", "07"]) {
  const path = `docs/research/prose-qr/phase-${phase}/custody.json`,
    b = await readFile(path),
    c = JSON.parse(b);
  for (const e of c.inventory) {
    const data = await readFile(e.path);
    assert.equal(data.length, e.bytes);
    assert.equal(sha(data), e.sha256);
  }
  prior.push({ path, sha256: sha(b), unchangedEntries: c.inventory.length });
}
const old = JSON.parse(
  await readFile("docs/research/prose-qr/phase-07/verification.json", "utf8"),
);
for (const s of old.sourceCustody)
  assert.equal(sha(await readFile(s.preservedAt)), s.sha256);
const downloads = [];
for (const d of old.downloads) {
  const b = await readFile("downloads/" + d.name);
  assert.equal(sha(b), d.sha256);
  downloads.push({ ...d, unchanged: true });
}
const packageInfo = JSON.parse(await readFile("package.json"));
assert.equal(packageInfo.private, true);
const batches = [],
  sources = [],
  results = [],
  errors = [];
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
try {
  const page = await browser.newPage();
  async function pixels(png) {
    const r = await page.evaluate(async (b) => {
      const i = new Image();
      i.src = "data:image/png;base64," + b;
      await i.decode();
      const c = document.createElement("canvas");
      c.width = i.width;
      c.height = i.height;
      const ctx = c.getContext("2d");
      ctx.drawImage(i, 0, 0);
      const a = ctx.getImageData(0, 0, c.width, c.height).data;
      let v = "";
      for (let n = 0; n < a.length; n += 32768)
        v += String.fromCharCode(...a.subarray(n, n + 32768));
      return { width: c.width, height: c.height, data: btoa(v) };
    }, png.toString("base64"));
    return { ...r, data: new Uint8ClampedArray(Buffer.from(r.data, "base64")) };
  }
  for (const batch of ["run-01", "pitch-01", "packing-01", "placement-01"]) {
    const base = root + batch + "/",
      manifest = JSON.parse(await readFile(base + "manifest.json"));
    for (const [path, h] of Object.entries(manifest.sources)) {
      assert.equal(sha(await readFile(path)), h);
      sources.push({ path, sha256: h });
    }
    const rows = (await readFile(base + "results.jsonl", "utf8"))
        .trim()
        .split("\n")
        .map(JSON.parse),
      summary = JSON.parse(await readFile(base + "summary.json"));
    assert.equal(rows.length, summary.native);
    assert.equal(rows.length + summary.rejections.length, manifest.maxNative);
    assert.equal(new Set(rows.map((r) => r.id)).size, rows.length);
    for (const rejection of summary.rejections) {
      assert.equal(rejection.nativeCaptured, false);
      assert(!rows.some((r) => r.id === rejection.id));
      const saved = JSON.parse(
        await readFile(base + rejection.id + "-source-rejection.json"),
      );
      assert.deepEqual(saved, rejection);
    }
    const seed = JSON.parse(await readFile(base + "seed-replay.json"));
    assert(seed.exact);
    assert.equal(seed.expected, seed.actual);
    batches.push({
      batch,
      native: rows.length,
      repeats: rows.filter((r) => r.repeatExact).length,
      intended: rows.filter((r) => r.probe.ordinary.correctFinder).length,
      legibilityRejected: rows.filter((r) => r.legibility.automaticRejected)
        .length,
      rejections: summary.rejections,
      selections: summary.selections,
    });
    for (const r of rows) {
      assert.equal(r.payload, null);
      assert.equal(r.phoneCandidate, false);
      assert(r.repeatExact);
      const l = JSON.parse(await readFile(base + r.id + "-layout.json"));
      assert.equal(l.plainText, l.lines.join("\n"));
      assert.equal(sha(await readFile(base + r.id + ".txt")), r.txtSha256);
      assert.equal(l.plainText, await readFile(base + r.id + ".txt", "utf8"));
      const html = await readFile(base + r.id + ".html.gz");
      assert.equal(sha(html), r.htmlSha256);
      assert(gunzipSync(html).toString().includes('id="corner-0"'));
      const native = JSON.parse(await readFile(base + r.id + "-native.json"));
      assert.equal(native.style.size, "20px");
      assert.equal(native.style.leading, "24px");
      assert.equal(native.style.weight, "400");
      assert.equal(native.style.tracking, "normal");
      assert(native.clearance >= 2);
      assert(native.advances.every((w) => w <= l.field));
      assert.equal(native.platformFonts.length, 1);
      assert.equal(native.platformFonts[0].familyName, l.spec.font);
      assert.equal(
        r.legibility.automaticRejected,
        native.minAdjacentInkGap < 0,
      );
      const png = await readFile(base + r.path);
      assert.equal(sha(png), r.pngSha256);
      const p = await pixels(png);
      assert.equal(sha(p.data), r.rgbaSha256);
      assert.equal(p.width, r.width);
      assert.equal(p.height, r.height);
      const measured = probe(p, l);
      assert.equal(JSON.stringify(measured), JSON.stringify(r.probe));
      results.push({
        batch,
        id: r.id,
        pngSha256: r.pngSha256,
        rgbaMatches: true,
        ordinaryAndPassiveReplayExact: true,
        intended: r.probe.ordinary.correctFinder,
        stableFractions: Object.values(measured.corners).map(
          (c) => c.stableFraction,
        ),
      });
    }
    const c = JSON.parse(await readFile(base + "controls.json"));
    for (const [kind, r] of Object.entries(c)) {
      const png = await readFile(base + r.path);
      assert.equal(sha(png), r.pngSha256);
      const p = await pixels(png);
      assert.equal(sha(p.data), r.rgbaSha256);
      if (kind === "full") {
        const baseline = await decode(p, "https://example.com/"),
          normal = await readBarcodes(p, { formats: ["QRCode"] });
        assert.deepEqual(baseline, r.baseline);
        assert(normal.some((x) => x.text === "https://example.com/"));
        results.push({
          batch,
          id: "full-control",
          rgbaMatches: true,
          exactProfiles: 3,
        });
      } else {
        const l = solidTriplet();
        l.lines = [];
        l.offset = 0;
        l.lineHeight = 24;
        const measured = probe(p, l);
        assert.equal(JSON.stringify(measured), JSON.stringify(r.probe));
        assert(measured.ordinary.correctFinder);
        assert.equal(measured.components.stableFraction, 1);
        assert.equal(measured.components.balancedFraction, 1);
        results.push({
          batch,
          id: "solid-control",
          rgbaMatches: true,
          ordinaryAndPassiveReplayExact: true,
          intended: true,
        });
      }
    }
  }
  const blank = {
      width: 210,
      height: 210,
      data: new Uint8ClampedArray(210 * 210 * 4).fill(255),
    },
    l = { ...solidTriplet(6), lines: [], offset: 0, lineHeight: 24 },
    negative = probe(blank, l);
  assert.equal(negative.ordinary.correctFinder, false);
  assert.equal(negative.scoredPointCount, 0);
  assert.equal(negative.components.axisMean, 0);
  assert.equal(negative.components.stableFraction, 0);
  assert.equal(negative.components.balancedFraction, 0);
} catch (e) {
  errors.push(e.stack);
  await writeFile(
    root + "verification-final-error-01.json",
    JSON.stringify({
      at: new Date().toISOString(),
      errors,
      completedReplay: results,
      batches,
      prior,
    }),
    { flag: "wx" },
  );
  throw e;
} finally {
  await browser.close();
}
const v = {
  at: new Date().toISOString(),
  sourceScriptSha256: sha(await readFile(new URL(import.meta.url))),
  head: git("rev-parse", "HEAD"),
  branch: git("branch", "--show-current"),
  remote: git("remote", "get-url", "origin"),
  batches,
  sources,
  prior,
  oldExecutedSourceHashesVerified: old.sourceCustody.length,
  downloads,
  productVersion: packageInfo.version,
  npmPrivate: packageInfo.private,
  replay: {
    pairs: results.length,
    native: results.filter((r) => !r.id.includes("control")).length,
    fullControls: 4,
    solidControls: 4,
    additionalPassingFullQrProfileAttempts: 12,
    results,
  },
  blankNegative: true,
  checkerErrors: errors,
  payloads: 0,
  phoneCandidates: 0,
  phoneTests: 0,
  goal: "unsolved",
};
await writeFile(
  root + "verification-final.json",
  await format(JSON.stringify(v), { parser: "json" }),
  { flag: "wx" },
);
console.log(
  JSON.stringify({
    native: results.filter((r) => !r.id.includes("control")).length,
    replayPairs: results.length,
    oldEntries: prior.reduce((n, p) => n + p.unchangedEntries, 0),
    errors,
  }),
);

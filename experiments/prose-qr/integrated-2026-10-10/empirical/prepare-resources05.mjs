import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { sha } from "./common.mjs";
const root = "docs/research/prose-qr/integrated-2026-10-10/empirical";
const source = "experiments/prose-qr/integrated-2026-10-10/empirical";
const out = root + "/resources-05";
const proposalPath =
  "docs/research/prose-qr/integrated-2026-10-10/mechanism/square-resources-01/source-spec.json";
const raw = await readFile(proposalPath);
assert.equal(
  sha(raw),
  "a5af82a70abbe5b9af6e20dad4fa00860a8ef3c0c8f6f98cb1c5d30bc44e3998",
);
const proposal = JSON.parse(raw);
assert.equal(proposal.sources.length, 8);
await mkdir(out);
await writeFile(out + "/imported-source-spec.json.txt", raw, { flag: "wx" });
const generatorPath =
  "experiments/prose-qr/integrated-2026-10-10/mechanism/square-resources.mjs";
const generator = await readFile(generatorPath);
assert.equal(sha(generator), proposal.sourceSha256);
await writeFile(out + "/imported-generator.mjs.gz", gzipSync(generator), {
  flag: "wx",
});
const specs = [];
for (const original of proposal.sources) {
  const html = await readFile(original.htmlPath);
  assert.equal(sha(html), original.htmlSha256);
  const dir = out + "/" + original.id;
  await mkdir(dir);
  const htmlPath = dir + "/source.html.txt";
  await writeFile(htmlPath, html, { flag: "wx" });
  const diagnosticContract = original.diagnosticContract
    ? {
        ...original.diagnosticContract,
        origin: { x: 32, y: 24 },
        extent: { width: 52 * 9.6328125, height: 3 * 19.265625 },
        samplePolicy:
          "floor(origin+offset+(index+.5)*pitch), all fixed rectangular source-grid centers including spaces/unowned gaps; class ownership from captured glyph Range rectangles, no affine mixed-color claim",
      }
    : undefined;
  specs.push({ ...original, dir, htmlPath, diagnosticContract });
}
const allocationPath =
  "docs/research/prose-qr/integrated-2026-10-10/allocation-02.json";
const sourceHashes = {};
for (const f of [
  "prepare-resources05.mjs",
  "run-resources-v5.mjs",
  "common.mjs",
  "diagnostic.mjs",
  "metrics.mjs",
  "holes.py",
])
  sourceHashes[source + "/" + f] = sha(await readFile(source + "/" + f));
sourceHashes[allocationPath] = sha(await readFile(allocationPath));
const prereg = {
  schema: "aqrobat.integrated.resources.v2",
  frozenAtUtc: new Date().toISOString(),
  cutoffUtc: "2026-10-10T23:29:22Z",
  allocation: { path: allocationPath, sha256: sourceHashes[allocationPath] },
  importedProposal: {
    path: proposalPath,
    sha256: sha(raw),
    generatorPath,
    generatorSha256: sha(generator),
  },
  hypothesis:
    "Fresh square native Unicode ornaments U+25A3/U+25A9 test geometric function repair; continuous prose uses actual0.75/1px native textstroke withsamecolor1.5pxshadow atgray180/204 and corrected declared38.53125samplingphase. This tests increased actualglyphsupport and squaregeometry together, not a shade-only swap. All8grid combinations retained, including previous phase comparison. Resources contain no encodedtarget, no fullcandidate/readers/profile/exploratory trial.",
  classification:
    "Source-resource measurement only. Unicode ornament lane is separate from alphabetic O/o and emoji-atlas implementation. Native black/gray prose has no tiles, QR graphics/modules, hidden duplicates or matrix background.",
  specs,
  sourceHashes,
  denominator: 8,
  captureOrder: specs.map((s) => s.id),
  ordinaryReaderCalls: 0,
  passiveProfiles: 0,
  repeatPerResource: 0,
  diagnosticsPerResource: 1,
  diagnostic:
    "One combined source pipeline per resource: complete gray245 visible-ink envelope and gray128 enclosed contours; actual native ornament complete-ink midpoint literal/adaptive four-axis runs; continuous prose fixed gray thresholds/pitches/offsets and captured Range ownership. No ordinary locator/decode and no first-selected gate substitution.",
  stops: proposal.stops,
  noSelectiveRetries: true,
  visualReviewRequired: true,
  visualReviewPolicy:
    "Each continuous body source pauses after its fixed diagnostic and before next resource for worker originalPNG inspection. At most180seconds; exactPNGhash receipt; reject unreadable/overlapping letters or lostink. No source changes/retry.",
};
await writeFile(
  out + "/preregistration.json",
  JSON.stringify(prereg, null, 2) + "\n",
  { flag: "wx" },
);
console.log(
  JSON.stringify({
    frozen: out,
    resources: specs.map((s) => s.id),
    proposalSha256: sha(raw),
    diagnostics: 8,
    ordinaryCalls: 0,
  }),
);

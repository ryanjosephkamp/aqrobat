import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { sha } from "./common.mjs";
const root = "docs/research/prose-qr/integrated-2026-10-10/empirical";
const source = "experiments/prose-qr/integrated-2026-10-10/empirical";
const out = root + "/resources-06";
const proposalPath =
  "docs/research/prose-qr/integrated-2026-10-10/mechanism/cutoff-resources-01/source-spec.json";
const raw = await readFile(proposalPath);
assert.equal(
  sha(raw),
  "23f5649f79a5d8ce3b9b6670b5c8dc37eef55683cf5f42fdac76e0083252fd54",
);
const proposal = JSON.parse(raw);
assert.equal(proposal.sources.length, 5);
await mkdir(out);
await writeFile(out + "/imported-source-spec.json.txt", raw, { flag: "wx" });
const generatorPath =
  "experiments/prose-qr/integrated-2026-10-10/mechanism/cutoff-resources.mjs";
const generator = await readFile(generatorPath);
assert.equal(sha(generator), proposal.sourceSha256);
await writeFile(out + "/imported-generator.mjs.gz", gzipSync(generator), {
  flag: "wx",
});
assert.equal(
  sha(await readFile(proposal.jsqrSourcePath)),
  proposal.jsqrSourceSha256,
);
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
  "prepare-resources06.mjs",
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
    "Final finite resource amendment: actual full-size624px ArialUnicodeMS U+25A3 square at unchanged intended pitch38.53125; native16px Menlo-Bold coherent prose gray228/232 with0.75/1px stroke andsamecolor1.5shadow. Tests native scaling and pinned adaptive low-dynamic-range cutoff at mixed black/gray neighborhoods. No transferred geometric or readability pass. All8 sampling grids retained exactly, including fixed extent boundary that yields only13centers at38.53125. No target, full candidate, ordinary reader, passive profile or exploratory trial.",
  classification:
    "Source-resource measurement only. Unicode ornament lane is separate from alphabetic O/o and emoji-atlas implementation. Native black/gray prose has no tiles, QR graphics/modules, hidden duplicates or matrix background.",
  specs,
  sourceHashes,
  denominator: 5,
  captureOrder: specs.map((s) => s.id),
  ordinaryReaderCalls: 0,
  passiveProfiles: 0,
  repeatPerResource: 0,
  diagnosticsPerResource: 1,
  diagnostic:
    "One combined source pipeline per resource: complete gray245 visible-ink envelope and gray128 enclosed contours; actual native ornament complete-ink midpoint literal/adaptive four-axis runs; continuous prose fixed gray thresholds/pitches/offsets and captured Range ownership. No ordinary locator/decode and no first-selected gate substitution.",
  stops: proposal.selectionStops,
  noSelectiveRetries: true,
  visualReviewRequired: true,
  visualReviewPolicy:
    "Each continuous body source pauses after its fixed diagnostic and before next resource for worker originalPNG inspection. At most180seconds; exactPNGhash receipt; reject unreadable, inadequately faint or overlapping letters or lostink; parent must inspect actual retainedPNG before any fullsource selection. No source changes/retry.",
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
    diagnostics: 5,
    ordinaryCalls: 0,
  }),
);

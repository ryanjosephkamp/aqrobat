import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { sha } from "./common.mjs";
const root = "docs/research/prose-qr/integrated-2026-10-10/empirical";
const source = "experiments/prose-qr/integrated-2026-10-10/empirical";
const out = root + "/resources-04";
const proposalPath =
  "docs/research/prose-qr/integrated-2026-10-10/mechanism/resources/source-spec.json";
const raw = await readFile(proposalPath);
assert.equal(
  sha(raw),
  "4f670856f7d321bda72a53c6ac1f2f3517a97dfed7be30a045d4abab2edf550c",
);
const proposal = JSON.parse(raw);
assert.equal(proposal.sources.length, 10);
await mkdir(out);
await writeFile(out + "/imported-source-spec.json.txt", raw, { flag: "wx" });
const generatorPath =
  "experiments/prose-qr/integrated-2026-10-10/mechanism/continuous.mjs";
const generator = await readFile(generatorPath);
assert.equal(sha(generator), proposal.sourceHashes[generatorPath]);
await writeFile(out + "/imported-generator.mjs.gz", gzipSync(generator), {
  flag: "wx",
});
const specs = [];
for (const original of proposal.sources.filter(
  (s) => s.kind === "continuous-resource",
)) {
  const originalHtml = await readFile(original.htmlPath);
  assert.equal(sha(originalHtml), original.htmlSha256);
  const html = Buffer.from(
    originalHtml.toString() +
      "\n<!-- Fresh empirical resource batch: native CDP font inspection uses #text paragraph root. Characters/styles unchanged. -->\n",
  );
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
  specs.push({
    ...original,
    dir,
    htmlPath,
    htmlSha256: sha(html),
    fontSelector: "#text",
    diagnosticContract,
  });
}
const allocationPath =
  "docs/research/prose-qr/integrated-2026-10-10/allocation-02.json";
const sourceHashes = {};
for (const f of [
  "prepare-resources04.mjs",
  "run-resources-v4.mjs",
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
    "Amends resources-03 which stopped after4ornaments beforefirstbodycapture because CDP #artifact article root returned no fonts for nested p/spans. Query actual #text paragraph root in this six-body-only batch; source content/styles unchanged but fresh HTML comment/hash and fresh harness bytes. Distinct normal-white-field mechanism: actual native Unicode section ornaments for finder roles, continuous coherent native prose with visible black/gray foreground and optional native text-shadow blur. Resources are independent of any encoded target. No full payload render, reader, profile or exploratory trial in this finite source batch.",
  classification:
    "Source-resource measurement only. Unicode ornament lane is separate from alphabetic O/o and emoji-atlas implementation. Native black/gray prose has no tiles, QR graphics/modules, hidden duplicates or matrix background.",
  specs,
  sourceHashes,
  denominator: 6,
  captureOrder: specs.map((s) => s.id),
  ordinaryReaderCalls: 0,
  passiveProfiles: 0,
  repeatPerResource: 0,
  diagnosticsPerResource: 1,
  diagnostic:
    "One combined source pipeline per resource: complete gray245 visible-ink envelope and gray128 enclosed contours; actual native ornament complete-ink midpoint literal/adaptive four-axis runs; continuous prose fixed gray thresholds/pitches/offsets and captured Range ownership. No ordinary locator/decode and no first-selected gate substitution.",
  stops: proposal.stops,
  noSelectiveRetries: true,
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
    diagnostics: 6,
    ordinaryCalls: 0,
  }),
);

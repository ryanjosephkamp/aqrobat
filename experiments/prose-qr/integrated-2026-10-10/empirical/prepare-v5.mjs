import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { sha } from "./common.mjs";
const root = "docs/research/prose-qr/integrated-2026-10-10/empirical";
const source = "experiments/prose-qr/integrated-2026-10-10/empirical";
const out = root + "/layout-05";
const importedPath =
  "docs/research/prose-qr/integrated-2026-10-10/design/v5-short-prose/source-spec.json";
const bytes = await readFile(importedPath);
assert.equal(
  sha(bytes),
  "75f62b3d27bd60d961f50de8a220e24e5bcd6eebbd2e848d14d2a65707f30bee",
);
const imported = JSON.parse(bytes);
await mkdir(out);
await writeFile(out + "/imported-source-spec.json.txt", bytes, { flag: "wx" });
const generatorPath =
  "experiments/prose-qr/integrated-2026-10-10/design/prepare-v5.mjs";
const generator = await readFile(generatorPath);
assert.equal(sha(generator), imported.sourceHashes[generatorPath]);
await writeFile(out + "/imported-generator.mjs.gz", gzipSync(generator), {
  flag: "wx",
});
const specs = [];
for (const original of imported.specs) {
  const html = await readFile(original.htmlPath);
  assert.equal(sha(html), original.htmlSha256);
  const dir = out + "/" + original.id;
  await mkdir(dir);
  const htmlPath = dir + "/source.html.txt";
  await writeFile(htmlPath, html, { flag: "wx" });
  specs.push({ ...original, dir, htmlPath });
}
const sourceHashes = {};
for (const f of [
  "prepare-v5.mjs",
  "run-batch-v4.mjs",
  "reader.mjs",
  "ordinary.py",
  "common.mjs",
  "passive.mjs",
  "metrics.mjs",
])
  sourceHashes[source + "/" + f] = sha(await readFile(source + "/" + f));
const preregistration = {
  schema: "aqrobat.integrated.full-batch.v1",
  frozenAtUtc: new Date().toISOString(),
  cutoffUtc: "2026-10-10T23:29:22Z",
  payload: imported.payload,
  payloadSha256: imported.payloadSha256,
  hypothesis:
    "New coherent 106-character prose, V5 placement, fewer function patterns, 17px body and one actual enlarged alignment o. Regular/bold complete native states measured without readers before construction selection. Capacity does not establish feasibility: first two blocks have 33 immutable words including parity, radius11.",
  specs,
  sourceHashes,
  readerOrder: [],
  separatorPolicy: specs[0].separatorPolicy,
  denominator: {
    native: 2,
    control: 0,
    ordinarySlots: 0,
    profiles: 0,
    repeats: 2,
    payloadTrials: 0,
  },
  importCustody: {
    path: importedPath,
    sha256: sha(bytes),
    generatorPath,
    generatorSha256: sha(generator),
  },
  uniformField: imported.uniformField,
  stops: [
    "Source/font/paragraph/full Selection mismatch",
    "Immediate repeat mismatch",
    "Visible native source integrity failure",
    "Deadline or allocation exhaustion",
  ],
  interpretation:
    "Capture-only, no strict gate assessment or ordinary recovery yet. Complete visible glyph ink and readability need direct image assessment. Literal rawgray128 sampling and quiet-ring defects remain separate from reader behavior.",
};
await writeFile(
  out + "/preregistration.json",
  JSON.stringify(preregistration, null, 2) + "\n",
  { flag: "wx" },
);
console.log(
  JSON.stringify({
    frozen: out,
    importedSha256: sha(bytes),
    specs: specs.map((s) => s.id),
  }),
);

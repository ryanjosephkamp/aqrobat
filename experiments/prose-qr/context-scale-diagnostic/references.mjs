import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { format } from "prettier";
import assert from "node:assert/strict";
import { generate } from "../../../src/core.mjs";
const root = "docs/research/prose-qr/phase-47/reference-01/",
  sha = (b) => createHash("sha256").update(b).digest("hex");
await mkdir(root);
const control = generate("https://example.com/", {
  ecc: "M",
  boost: false,
  width: 656,
  stroke: 0,
});
assert.equal(control.matrix.length, 25);
await writeFile(
  root + "control.json",
  await format(
    JSON.stringify({
      matrix: control.matrix,
      width: 656,
      quiet: 4,
      requestedEcc: control.requestedEcc,
      actualEcc: control.actualEcc,
      sources: Object.fromEntries(
        await Promise.all(
          [
            "src/core.mjs",
            "vendor/qrcodegen.mjs",
            "experiments/prose-qr/layout.mjs",
            "experiments/prose-qr/context-scale-diagnostic/references.mjs",
          ].map(async (p) => [p, sha(await readFile(p))]),
        ),
      ),
    }),
    { parser: "json" },
  ),
  { flag: "wx" },
);

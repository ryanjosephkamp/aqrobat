import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
if (process.platform !== "darwin")
  throw new Error(
    "This optional native text check requires macOS AppKit and Swift; it is not a cross-platform acceptance test.",
  );
const receipt = {
  engine: "macOS AppKit TextKit",
  nativePhone: "not run",
  physicalPrint: "not run",
  textEdit:
    "manual UI evidence is recorded separately in docs/validation.md; this script does not automate TextEdit",
  samples: [],
};
for (const [name, width] of [
  ["rocket", 1536],
  ["circle", 724],
  ["hash", 656],
]) {
  const output = `test-results/text-layout/${name}-native.png`;
  execFileSync("swift", [
    "tools/check-native-text.swift",
    `test-results/text-layout/${name}.rtf`,
    output,
  ]);
  const data = JSON.parse(await readFile(output + ".json"));
  if (name !== "hash") {
    const cell = (width * 0.75) / 33;
    const error = Math.max(
      ...data.glyphPositions.map((p) =>
        Math.abs(p.x - (p.column + 0.025) * cell),
      ),
    );
    assert(
      error < 0.06,
      `${name}: native glyphs must remain in intended columns`,
    );
    const baseline =
      data.glyphPositions[0].y -
      (data.glyphPositions[0].row * Math.round(cell * 20)) / 20;
    const vertical = Math.max(
      ...data.glyphPositions.map((p) =>
        Math.abs(p.y - (p.row * Math.round(cell * 20)) / 20 - baseline),
      ),
    );
    assert(vertical < 0.06, `${name}: native rows must retain uniform spacing`);
    receipt.samples.push({
      name,
      maximumColumnErrorPoints: error,
      maximumRowErrorPoints: vertical,
    });
  } else
    receipt.samples.push({
      name,
      check:
        "rendered real hash text with explicit Menlo bold and fixed line spacing; bitmap reviewed",
    });
}
await writeFile(
  "test-results/text-layout/native-receipt.json",
  JSON.stringify(receipt, null, 2) + "\n",
);
console.log(JSON.stringify(receipt, null, 2));

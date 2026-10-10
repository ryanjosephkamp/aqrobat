import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  solve,
  fitCanonical,
  constructWithinRadius,
  verifyCanonical,
} from "./padding-solver.mjs";

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath)
  throw Error(
    "Usage: node solve.mjs INPUT.json OUTPUT.json (output must be fresh)",
  );
const raw = await readFile(inputPath);
const input = JSON.parse(raw);
verifyCanonical(input.version, input.ecc, input.mask);
const mode = process.argv[4] ?? "exact";
if (!["exact", "canonical-fit", "radius"].includes(mode))
  throw Error("Mode must be exact, canonical-fit or radius");
const result =
  mode === "canonical-fit"
    ? fitCanonical(input)
    : mode === "radius"
      ? constructWithinRadius(input)
      : solve(input);
result.mode = mode;
result.input = {
  path: inputPath,
  sha256: createHash("sha256").update(raw).digest("hex"),
  bytes: raw.length,
};
result.source = Object.fromEntries(
  await Promise.all(
    [
      new URL(import.meta.url),
      new URL("./padding-solver.mjs", import.meta.url),
      new URL("../../../../vendor/qrcodegen.mjs", import.meta.url),
    ].map(async (url) => [
      url.pathname,
      createHash("sha256")
        .update(await readFile(url))
        .digest("hex"),
    ]),
  ),
);
await writeFile(outputPath, JSON.stringify(result, null, 2) + "\n", {
  flag: "wx",
});
console.log(
  JSON.stringify({
    status: result.status,
    constraints: result.suppliedConstraints,
    rank: result.rank,
    xors: result.xors,
    padding: result.padding,
    alteredPaddingBytes: result.alteredPaddingBytes ?? null,
    contradictionModules: result.contradiction?.length ?? null,
  }),
);

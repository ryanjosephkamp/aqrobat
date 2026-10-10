import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import {
  solve,
  fitCanonical,
  constructWithinRadius,
  verifyCanonical,
} from "./padding-solver.mjs";
import { immutableClosureBound } from "./immutable-closure.mjs";
const [inputPath, expected, out] = process.argv.slice(2);
assert(
  inputPath &&
    /^[a-f0-9]{64}$/.test(expected) &&
    out &&
    out.startsWith("docs/research/prose-qr/integrated-2026-10-10/design/"),
);
const sha = (x) => createHash("sha256").update(x).digest("hex"),
  raw = await readFile(inputPath);
assert.equal(sha(raw), expected);
const original = JSON.parse(raw);
assert.equal(original.version, 5);
assert(original.quietSamples.every((s) => s.base === 0 || s.base === 1));
const input = {
  ...original,
  polarity: original.geometry.polarity,
  quietSamples: original.quietSamples.map(({ base, ...sample }) => ({
    ...sample,
    logical: base,
  })),
};
const sources = {};
for (const p of [
  "experiments/prose-qr/integrated-2026-10-10/design/measured-v5-batch.mjs",
  "experiments/prose-qr/integrated-2026-10-10/design/padding-solver.mjs",
  "experiments/prose-qr/integrated-2026-10-10/design/immutable-closure.mjs",
  "vendor/qrcodegen.mjs",
])
  sources[p] = sha(await readFile(p));
const cases = [];
for (const ecc of ["L", "M", "Q", "H"])
  for (let mask = 0; mask < 8; mask++) cases.push({ ecc, mask });
await mkdir(out);
const plan = {
  schema: "aqrobat.changed-layout-pure-batch.v1",
  frozenAtUtc: new Date().toISOString(),
  input: { path: inputPath, sha256: expected, bytes: raw.length },
  adapter:
    "Copy declared geometry.polarity to top-level and rename quietSamples[].base to logical without changing coordinates/value. No native sample changes.",
  adaptedSha256: sha(JSON.stringify(input)),
  sources,
  cases,
  denominator: 32,
  diagnostics: [
    "canonical-fit",
    "exact-canonical",
    "exact-post-terminator-affine",
    "immutable-data-and-whole-block-parity-closure",
    "bounded-post-terminator-radius-unless-closure-already-excludes-it",
  ],
  maxXors: 2000000,
  maxRadiusRounds: 96,
  ranking: [
    "sum max(0, block symbol errors-radius)",
    "worst block excess",
    "function mismatch",
    "module mismatch",
    "ECC L,M,Q,H",
    "mask ascending",
  ],
  captures: 0,
  readers: 0,
  claims:
    "Necessary bounds and finite pure hypotheses; no standard conformance claim for arbitrary padding, no reader/gate implication.",
  stop: [
    "input/source custody changed",
    "canonical parity failure",
    "unexpected exception",
    "design deadline22:14:22Z",
  ],
};
await writeFile(
  out + "/preregistration.json",
  JSON.stringify(plan, null, 2) + "\n",
  { flag: "wx" },
);
await writeFile(out + "/native-input.json.gz", gzipSync(raw, { level: 9 }), {
  flag: "wx",
});
const rows = [];
try {
  for (const { ecc, mask } of cases) {
    for (const [p, h] of Object.entries(sources))
      assert.equal(sha(await readFile(p)), h);
    verifyCanonical(5, ecc, mask);
    const native = { ...input, ecc, mask },
      canonical = { ...native, padding: "canonical" };
    const fit = fitCanonical(canonical),
      exactCanonical = solve(canonical),
      exactAffine = solve({ ...native, padding: "post-terminator-affine" }),
      closure = immutableClosureBound(native);
    const radius = closure.exceedsDeclaredRadius
      ? {
          status: "immutable-closure-radius-failure",
          trace: [],
          claim:
            "Necessary measured immutable data/parity lower bound already exceeds ideal radius; no redundant greedy search.",
          closure,
        }
      : constructWithinRadius({ ...native, padding: "post-terminator-affine" });
    const filename = `case-${ecc}-${mask}.json.gz`,
      body = gzipSync(
        Buffer.from(
          JSON.stringify({
            ecc,
            mask,
            fit,
            exactCanonical,
            exactAffine,
            closure,
            radius,
          }),
        ),
        { level: 9 },
      );
    await writeFile(out + "/" + filename, body, { flag: "wx" });
    const residual = fit.residual,
      excess = residual.blocks.map((b) =>
        Math.max(0, b.symbolErrors - b.symbolErrorRadius),
      );
    rows.push({
      ecc,
      mask,
      artifact: filename,
      sha256: sha(body),
      bytes: body.length,
      totalSymbolExcess: excess.reduce((a, b) => a + b, 0),
      worstBlockExcess: Math.max(...excess),
      blockErrors: residual.blocks.map((b) => ({
        block: b.block,
        errors: b.symbolErrors,
        radius: b.symbolErrorRadius,
      })),
      functionMismatch: Object.values(residual.functionMismatch).reduce(
        (a, b) => a + b,
        0,
      ),
      functionMismatchByRole: residual.functionMismatch,
      totalModuleMismatch: residual.totalMismatch,
      quietRing: residual.quietRing,
      exactCanonical: exactCanonical.status,
      exactAffine: exactAffine.status,
      closureLowerBound: closure.blocks.map((b) => ({
        block: b.block,
        minimumErrors: b.unavoidableImmutableSymbolErrors,
        radius: b.symbolRadius,
        fixedData: b.immutableDataCodewords,
        fixedParity: b.immutableParityCodewords,
      })),
      closureExceedsRadius: closure.exceedsDeclaredRadius,
      radiusStatus: radius.status,
      radiusRounds: radius.trace.length,
    });
    console.log(JSON.stringify(rows.at(-1)));
  }
} catch (e) {
  await writeFile(out + "/abort.txt", String(e.stack ?? e) + "\n", {
    flag: "wx",
  });
  throw e;
} finally {
  const rank = rows
    .slice()
    .sort(
      (a, b) =>
        a.totalSymbolExcess - b.totalSymbolExcess ||
        a.worstBlockExcess - b.worstBlockExcess ||
        a.functionMismatch - b.functionMismatch ||
        a.totalModuleMismatch - b.totalModuleMismatch ||
        "LMQH".indexOf(a.ecc) - "LMQH".indexOf(b.ecc) ||
        a.mask - b.mask,
    );
  const best = rank[0];
  if (best) {
    const fit = fitCanonical({
      ...input,
      ecc: best.ecc,
      mask: best.mask,
      padding: "canonical",
    });
    await writeFile(
      out + "/best-canonical-proposal.json",
      JSON.stringify(
        {
          ...fit,
          rankRule: plan.ranking,
          sourceInput: plan.input,
          warning:
            "Out-of-radius residual-ranked hypothesis unless explicitly established otherwise. Source style recipe only, no target image in prose. Independent canonical control and actual native evidence required.",
        },
        null,
        2,
      ) + "\n",
      { flag: "wx" },
    );
  }
  await writeFile(
    out + "/summary.json",
    JSON.stringify(
      {
        denominator: 32,
        attempted: rows.length,
        unattempted: cases.filter(
          (c) => !rows.some((r) => r.ecc === c.ecc && r.mask === c.mask),
        ),
        rows,
        ranking: rank.map((r) => `${r.ecc}-${r.mask}`),
        bestCanonicalProposal: best ? `${best.ecc}-${best.mask}` : null,
        withinRadius: rows.filter(
          (r) => r.radiusStatus === "ideal-data-radius-met",
        ).length,
        closureExcluded: rows.filter((r) => r.closureExceedsRadius).length,
        captures: 0,
        readers: 0,
      },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );
}

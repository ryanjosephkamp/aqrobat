import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import {
  solve,
  fitCanonical,
  immutablePrefixBound,
  constructWithinRadius,
  verifyCanonical,
} from "./padding-solver.mjs";

const base =
  "docs/research/prose-qr/integrated-2026-10-10/empirical/construction-02/native-input.json";
const expected =
  "7c6f6ef13be741047d05d1212d402a5291f74c0d43f40406ec25a859feb4fb30";
const out = "docs/research/prose-qr/integrated-2026-10-10/design/measured-01";
const sha = (raw) => createHash("sha256").update(raw).digest("hex");
const raw = await readFile(base);
assert.equal(sha(raw), expected, "Frozen empirical input custody");
const input = JSON.parse(raw);
assert.equal(input.version, 10);
const sources = {};
for (const path of [
  "experiments/prose-qr/integrated-2026-10-10/design/measured-batch.mjs",
  "experiments/prose-qr/integrated-2026-10-10/design/padding-solver.mjs",
  "vendor/qrcodegen.mjs",
  "package-lock.json",
])
  sources[path] = sha(await readFile(path));
const cases = [];
for (const ecc of ["L", "M", "Q", "H"])
  for (let mask = 0; mask < 8; mask++) cases.push({ ecc, mask });
await mkdir(out);
const plan = {
  schema: "aqrobat.design-measured-batch.v1",
  frozenAtUtc: new Date().toISOString(),
  input: { path: base, sha256: expected, bytes: raw.length },
  sources,
  denominator: cases.length,
  cases,
  diagnosticsPerCase: [
    "canonical-fit",
    "exact-canonical",
    "exact-post-terminator-affine",
    "immutable-prefix-bound",
    "bounded-post-terminator-radius",
  ],
  rounds: "At most min(96, sum floor(ECCbytes/2)+1) for each case",
  maxXorsPerSolve: 2000000,
  ranking: [
    "total codeword errors above per-block symbol radius",
    "worst block excess",
    "function mismatch count",
    "total module mismatch count",
    "ECC order L,M,Q,H",
    "mask ascending",
  ],
  sourceGeometry:
    "Unchanged empirical native module sample map; changing ECC/mask does not rerender or remeasure native pixels",
  captures: 0,
  readers: 0,
  profiles: 0,
  stop: [
    "Changed input/source custody",
    "Failed canonical parity",
    "Unexpected solver exception",
    "Design cutoff22:14:22Z",
  ],
  claims:
    "Pure finite diagnostics. Padding noncanonical is separate. Function/quiet/remainder/source-model defects remain visible. No native or ordinary-reader acceptance follows. All unattempted rows retained on stop.",
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
    for (const [path, hash] of Object.entries(sources))
      assert.equal(sha(await readFile(path)), hash);
    verifyCanonical(10, ecc, mask);
    const native = { ...input, ecc, mask };
    const canonicalInput = { ...native, padding: "canonical" };
    const fit = fitCanonical(canonicalInput);
    const exactCanonical = solve(canonicalInput);
    const exactAffine = solve({ ...native, padding: "post-terminator-affine" });
    const prefixBound = immutablePrefixBound(native);
    const radius = constructWithinRadius({
      ...native,
      padding: "post-terminator-affine",
    });
    const residual = fit.residual;
    const excesses = residual.blocks.map((b) =>
      Math.max(0, b.symbolErrors - b.symbolErrorRadius),
    );
    const record = {
      ecc,
      mask,
      inputVariantSha256: sha(JSON.stringify(native)),
      canonicalInputSha256: sha(JSON.stringify(canonicalInput)),
      fit,
      exactCanonical,
      exactAffine,
      prefixBound,
      radius,
    };
    const filename = `case-${ecc}-${mask}.json.gz`;
    const body = gzipSync(Buffer.from(JSON.stringify(record)), { level: 9 });
    await writeFile(out + "/" + filename, body, { flag: "wx" });
    const row = {
      ecc,
      mask,
      artifact: filename,
      bytes: body.length,
      sha256: sha(body),
      totalSymbolExcess: excesses.reduce((a, b) => a + b, 0),
      worstBlockExcess: Math.max(...excesses),
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
      prefixLowerBound: prefixBound.blocks.map((b) => ({
        block: b.block,
        minimumErrors: b.unavoidablePrefixSymbolErrors,
        radius: b.symbolRadius,
      })),
      prefixExceedsRadius: prefixBound.exceedsDeclaredRadius,
      radiusStatus: radius.status,
      radiusRounds: radius.trace.length,
    };
    rows.push(row);
    console.log(
      JSON.stringify({
        ecc,
        mask,
        excess: row.totalSymbolExcess,
        exact: row.exactAffine,
        radius: row.radiusStatus,
        prefix: row.prefixLowerBound,
      }),
    );
  }
} catch (error) {
  await writeFile(out + "/abort.txt", String(error.stack ?? error) + "\n", {
    flag: "wx",
  });
  throw error;
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
            "Residual-ranked proposal only; data radius, function/quiet fit, strict gate and reader recovery are not established",
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
        schema: "aqrobat.design-measured-summary.v1",
        denominator: cases.length,
        attempted: rows.length,
        unattempted: cases.filter(
          (c) => !rows.some((r) => c.ecc === r.ecc && c.mask === r.mask),
        ),
        ranking: rank.map((r) => `${r.ecc}-${r.mask}`),
        rows,
        bestCanonicalProposal: best ? `${best.ecc}-${best.mask}` : null,
        radiusMet: rows.filter(
          (r) => r.radiusStatus === "ideal-data-radius-met",
        ).length,
        captures: 0,
        readers: 0,
      },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );
}

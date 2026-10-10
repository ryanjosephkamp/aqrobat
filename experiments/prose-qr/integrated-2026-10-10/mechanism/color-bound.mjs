import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { construct } from "../design/padding-solver.mjs";

const sha = (b) => createHash("sha256").update(b).digest("hex");
export const WHITE_LOCK_THRESHOLD = 219;

// Conditional fixed-alpha RGB source-over model, with one gray unit allowed
// for integer/measurement rounding. Every current ink paint is gray<=180 on
// white. If A is combined foreground alpha, currentGray<=255-75*A; thus the
// all-black lower bound is255*(1-A)>=3.4*currentGray-612. A reported219 yields
// >=129.2 even after one-unit uncertainty, so it cannot become literal<128.
// This is not a measured native recoloring invariance or an adaptive bound.
export function darkestFixedAlphaGray(reportedGray) {
  return Math.max(0, 255 - (255 * (255 - (reportedGray - 1))) / 75);
}

export function colorBoundCase(ledger, ecc, mask) {
  let b;
  try {
    b = construct(2, ecc, mask);
  } catch (e) {
    return {
      ecc,
      mask,
      status: "exact-payload-overflow-rejected",
      message: e.message,
    };
  }
  const locked = ledger.samples.filter((s) => s.gray >= WHITE_LOCK_THRESHOLD);
  const wrongWords = new Set();
  const lockedCells = [];
  const lockedFunction = [];
  for (const s of locked) {
    if (!b.matrix[s.y][s.x]) continue;
    const meta = b.map[s.y][s.x];
    if (meta.kind === "function") {
      lockedFunction.push({ x: s.x, y: s.y, gray: s.gray, role: meta.role });
      continue;
    }
    if (meta.kind === "remainder") continue;
    const owner = b.ownership.stream[meta.streamByte];
    const block = b.ownership.blocks[owner.block];
    const immutable =
      owner.kind === "data"
        ? owner.index < b.canonical.prefixBytes
        : block.offset + block.dataLength <= b.canonical.prefixBytes;
    if (!immutable) continue;
    wrongWords.add(meta.streamByte);
    lockedCells.push({ x: s.x, y: s.y, gray: s.gray, ...meta });
  }
  const blocks = b.ownership.blocks.map((block) => {
    const words = [...wrongWords].filter(
      (i) => b.ownership.stream[i].block === block.block,
    );
    return {
      block: block.block,
      radius: Math.floor(block.eccLength / 2),
      unavoidableWrongSymbols: words.length,
      streamBytes: words,
      exceeds: words.length > Math.floor(block.eccLength / 2),
    };
  });
  return {
    ecc,
    mask,
    status: blocks.some((b) => b.exceeds)
      ? "within-radius-excluded-in-fixed-alpha-literal-model"
      : "necessary-bound-inconclusive",
    prefixBytes: b.canonical.prefixBytes,
    paddingBytes: b.canonical.paddingBytes,
    fixedAlphaWhiteCenters: locked.length,
    lockedFunction,
    lockedCells,
    blocks,
  };
}

export async function runColorBound(ledgerPath, specPath, out) {
  assert(
    out.startsWith("docs/research/prose-qr/integrated-2026-10-10/mechanism/"),
  );
  const raw = await readFile(ledgerPath);
  const specRaw = await readFile(specPath);
  const ledger = JSON.parse(raw);
  const spec = JSON.parse(specRaw);
  assert.equal(ledger.samples.length, 625);
  assert.equal(ledger.quiet.length, 464);
  assert.equal(new Set(ledger.samples.map((s) => `${s.x},${s.y}`)).size, 625);
  assert(spec.glyphs.every((g) => g.gray >= 0 && g.gray <= 180));
  assert.equal(ledger.width, spec.width);
  assert.equal(ledger.height, spec.height);
  assert.equal(ledger.css.bodyGray, 180);
  assert.equal(spec.target.payload, "https://example.com/");
  const prereg = {
    schema: "aqrobat.measured-fixed-alpha-color-bound.v1",
    atUtc: new Date().toISOString(),
    sourceSha256: sha(
      await readFile(
        "experiments/prose-qr/integrated-2026-10-10/mechanism/color-bound.mjs",
      ),
    ),
    encoderSha256: sha(await readFile("vendor/qrcodegen.mjs")),
    solverSha256: sha(
      await readFile(
        "experiments/prose-qr/integrated-2026-10-10/design/padding-solver.mjs",
      ),
    ),
    ledgerPath,
    ledgerSha256: sha(raw),
    specPath,
    specSha256: sha(specRaw),
    pngSha256: ledger.pngSha256,
    rgbaSha256: ledger.rgbaSha256,
    denominator: 32,
    cases: ["L", "M", "Q", "H"].flatMap((ecc) =>
      Array.from({ length: 8 }, (_, mask) => ({ ecc, mask })),
    ),
    nativeCaptures: 0,
    readerCalls: 0,
    binarizerCalls: 0,
    hypothesis:
      "Unchanged source/font/placement/raster alpha and blur alpha; only genuine ink RGB colors may change. Native RGB source-over on uniform white is the declared model. Current foreground paints are0or180. A reported gray>=219 remains>=128 even if every paint becomesblack, allowing1grayunit uncertainty. Native color-dependent rasterization is not measured. Adaptive binarizer dependencies, different sampling geometry, font/style/size/spacing changes, erasures and ordinary-reader behavior are outside this bound.",
    claimLimit:
      "Exclude existence of an exact-URL matrix within each block's ordinary hard-decision symbol radius at these625fixed literal samples under the declared model. This is not general native-prose impossibility or an impossibility of ordinary-reader recovery.",
  };
  await mkdir(out);
  await writeFile(
    out + "/preregistration.json",
    JSON.stringify(prereg, null, 2) + "\n",
    { flag: "wx" },
  );
  const cases = prereg.cases.map(({ ecc, mask }) =>
    colorBoundCase(ledger, ecc, mask),
  );
  const result = {
    ...prereg,
    whiteLockThreshold: WHITE_LOCK_THRESHOLD,
    fixedAlphaWhiteCenters: ledger.samples
      .filter((s) => s.gray >= WHITE_LOCK_THRESHOLD)
      .map(({ x, y, gray }) => ({
        x,
        y,
        gray,
        darkestModelGray: darkestFixedAlphaGray(gray),
      })),
    quietSourceSamples: ledger.quiet.length,
    quietActualLiteralDark: ledger.quiet.filter((q) => q.literal).length,
    quietActualAdaptiveDark: ledger.quiet.filter((q) => q.adaptive).length,
    cases,
    counts: Object.fromEntries(
      [
        "within-radius-excluded-in-fixed-alpha-literal-model",
        "necessary-bound-inconclusive",
        "exact-payload-overflow-rejected",
      ].map((k) => [k, cases.filter((c) => c.status === k).length]),
    ),
  };
  await writeFile(
    out + "/result.json.gz",
    gzipSync(JSON.stringify(result, null, 2) + "\n"),
    { flag: "wx" },
  );
  return result;
}

if (
  process.argv[1] &&
  import.meta.url === new URL("file://" + process.argv[1]).href
) {
  const r = await runColorBound(
    process.argv[2],
    process.argv[3],
    process.argv[4],
  );
  console.log(
    JSON.stringify({
      counts: r.counts,
      fixedAlphaWhiteCenters: r.fixedAlphaWhiteCenters.length,
      cases: r.cases.map(({ ecc, mask, status, blocks }) => ({
        ecc,
        mask,
        status,
        blocks,
      })),
    }),
  );
}

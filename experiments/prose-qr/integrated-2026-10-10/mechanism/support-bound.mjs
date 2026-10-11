import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { construct } from "../design/padding-solver.mjs";
import { layoutArticle } from "./article-v3.mjs";
const sha = (b) => createHash("sha256").update(b).digest("hex");
export function boundCase(spec, ecc, mask) {
  let b;
  try {
    b = construct(spec.geometry.version, ecc, mask);
  } catch (e) {
    return {
      ecc,
      mask,
      status: "exact-payload-overflow-rejected",
      message: e.message,
    };
  }
  const n = b.matrix.length,
    pitch = spec.geometry.unit,
    origin = spec.geometry.origin;
  const envelopes = spec.glyphs
    .filter((g) => g.ch.trim())
    .map((g) =>
      g.role === "body"
        ? {
            x0: g.x - 2 - 3 * g.shadow,
            x1: g.x + spec.options.advance + 2 + 3 * g.shadow,
            y0: g.y - 2 - 3 * g.shadow,
            y1: g.y + 17 + 3 * g.shadow,
            role: g.role,
          }
        : {
            x0: g.nominalInkBounds.left,
            x1: g.nominalInkBounds.left + g.nominalInkBounds.width,
            y0: g.nominalInkBounds.top,
            y1: g.nominalInkBounds.top + g.nominalInkBounds.height,
            role: g.role,
          },
    );
  const symbols = new Set(),
    locked = [],
    functionLocked = [],
    coverage = [];
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const px = origin + (x + 0.5) * pitch,
        py = origin + (y + 0.5) * pitch;
      // Every covered center is granted an arbitrary independent binary state,
      // even inside a source ornament and even where native ink is actually white.
      // This strictly relaxes genuine whole-source-glyph coupling under the
      // declared envelope assumption. It is never a source glyph recipe.
      const covered = envelopes.some(
        (e) => px >= e.x0 && px <= e.x1 && py >= e.y0 && py <= e.y1,
      );
      coverage.push({ x, y, covered });
      if (covered || !b.matrix[y][x]) continue;
      const meta = b.map[y][x];
      if (meta.kind === "function") {
        functionLocked.push({ x, y, role: meta.role });
        continue;
      }
      if (meta.kind === "remainder") continue;
      const owner = b.ownership.stream[meta.streamByte];
      const block = b.ownership.blocks[owner.block];
      const fixed =
        owner.kind === "data"
          ? owner.index < b.canonical.prefixBytes
          : block.offset + block.dataLength <= b.canonical.prefixBytes;
      if (fixed) {
        symbols.add(meta.streamByte);
        locked.push({ x, y, ...meta });
      }
    }
  const blocks = b.ownership.blocks.map((block) => {
    const errors = [...symbols].filter(
      (i) => b.ownership.stream[i].block === block.block,
    );
    return {
      block: block.block,
      radius: Math.floor(block.eccLength / 2),
      lockedWrongSymbols: errors.length,
      streamBytes: errors,
      exceeds: errors.length > Math.floor(block.eccLength / 2),
    };
  });
  return {
    ecc,
    mask,
    status: blocks.some((b) => b.exceeds)
      ? "excluded-in-declared-support-relaxation"
      : "necessary-bound-inconclusive",
    prefixBytes: b.canonical.prefixBytes,
    paddingBytes: b.canonical.paddingBytes,
    covered: coverage.filter((c) => c.covered).length,
    uncovered: coverage.filter((c) => !c.covered).length,
    blocks,
    lockedCells: locked,
    functionLockedCells: functionLocked,
    coverage,
  };
}
export async function runBound(optionsPath, out) {
  assert(
    out?.startsWith("docs/research/prose-qr/integrated-2026-10-10/mechanism/"),
  );
  await mkdir(out);
  const raw = await readFile(optionsPath),
    options = JSON.parse(raw),
    spec = layoutArticle(options).spec;
  const sources = [
      "experiments/prose-qr/integrated-2026-10-10/mechanism/support-bound.mjs",
      "experiments/prose-qr/integrated-2026-10-10/mechanism/article-v3.mjs",
      "experiments/prose-qr/integrated-2026-10-10/design/padding-solver.mjs",
      "vendor/qrcodegen.mjs",
      optionsPath,
    ],
    sourceHashes = {};
  for (const p of sources) sourceHashes[p] = sha(await readFile(p));
  const prereg = {
    schema: "aqrobat.independent-support-bound.v1",
    frozenAtUtc: new Date().toISOString(),
    sourceHashes,
    denominator: 32,
    cases: ["L", "M", "Q", "H"].flatMap((ecc) =>
      Array.from({ length: 8 }, (_, mask) => ({ ecc, mask })),
    ),
    captureCalls: 0,
    readerCalls: 0,
    diagnostic:
      "Pure native-source geometry relaxation only. It grants arbitrary independent bits anywhere inside full nonspace body Range envelopes with2px slack plus3shadow radii, or inside complete ornament ink bounding rectangles. All function mismatches are reported but omitted from RS exclusion. Only immutable data-prefix/ECC closure cells can produce a necessary symbol-error bound. Envelopes are source-derived assumptions to be checked against any actual full native source; no general native-text impossibility.",
    sourceSpecSha256: sha(JSON.stringify(spec)),
    stops: [
      "source/hash drift",
      "exact URL altered",
      "missing ownership or invalid canonical encoding",
    ],
  };
  await writeFile(
    out + "/preregistration.json",
    JSON.stringify(prereg, null, 2) + "\n",
    { flag: "wx" },
  );
  const cases = prereg.cases.map(({ ecc, mask }) => boundCase(spec, ecc, mask));
  const result = {
    ...prereg,
    finishedAtUtc: new Date().toISOString(),
    cases,
    counts: Object.fromEntries(
      [
        "excluded-in-declared-support-relaxation",
        "necessary-bound-inconclusive",
        "exact-payload-overflow-rejected",
      ].map((k) => [k, cases.filter((c) => c.status === k).length]),
    ),
  };
  await writeFile(
    out + "/result.json",
    JSON.stringify(result, null, 2) + "\n",
    { flag: "wx" },
  );
  return result;
}
if (
  process.argv[1] &&
  import.meta.url === new URL("file://" + process.argv[1]).href
) {
  const result = await runBound(process.argv[2], process.argv[3]);
  console.log(
    JSON.stringify({
      counts: result.counts,
      cases: result.cases.map(({ ecc, mask, status, covered, blocks }) => ({
        ecc,
        mask,
        status,
        covered,
        blocks: blocks?.map(({ block, radius, lockedWrongSymbols }) => ({
          block,
          radius,
          lockedWrongSymbols,
        })),
      })),
    }),
  );
}

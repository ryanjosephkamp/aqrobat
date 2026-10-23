import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";

const sha = (b) => createHash("sha256").update(b).digest("hex");

export function sourceEnvelopes(spec) {
  return spec.glyphs
    .filter((g) => g.ch.trim())
    .map((g) => {
      const m = 2 + 3 * g.shadow;
      return g.role === "body"
        ? {
            p: g.p,
            index: g.index,
            role: g.role,
            x0: g.x - m,
            x1: g.x + spec.options.advance + m,
            y0: g.y - m,
            y1: g.y + 17 + m,
          }
        : {
            p: g.p,
            index: g.index,
            role: g.role,
            x0: g.nominalInkBounds.left,
            x1: g.nominalInkBounds.left + g.nominalInkBounds.width,
            y0: g.nominalInkBounds.top,
            y1: g.nominalInkBounds.top + g.nominalInkBounds.height,
          };
    });
}

export function buildLedger(spec) {
  const { dimension: n, unit, origin } = spec.geometry;
  assert.equal(n, spec.target.matrix.length);
  const envelopes = sourceEnvelopes(spec);
  const centers = [];
  for (let y = -4; y < n + 4; y++) {
    for (let x = -4; x < n + 4; x++) {
      const px = origin + (x + 0.5) * unit;
      const py = origin + (y + 0.5) * unit;
      const quiet = x < 0 || y < 0 || x >= n || y >= n;
      const hits = envelopes.filter(
        (e) => px >= e.x0 && px <= e.x1 && py >= e.y0 && py <= e.y1,
      );
      const meta = quiet ? { kind: "quiet" } : spec.target.map[y][x];
      centers.push({
        x,
        y,
        px,
        py,
        region: quiet ? "quiet" : "matrix",
        target: quiet ? 0 : spec.target.matrix[y][x],
        metadata: meta,
        envelopeCovered: hits.length > 0,
        coveringGlyphs: hits.map(({ p, index }) => ({ p, index })),
      });
    }
  }
  const matrix = centers.filter((c) => c.region === "matrix");
  const quiet = centers.filter((c) => c.region === "quiet");
  assert.equal(matrix.length, n * n);
  assert.equal(quiet.length, (n + 8) ** 2 - n * n);
  const byRole = {};
  for (const c of centers) {
    const role =
      c.metadata.kind === "function"
        ? "function:" + c.metadata.role
        : c.metadata.kind;
    const row = (byRole[role] ??= {
      total: 0,
      targetDark: 0,
      covered: 0,
      uncoveredTargetDark: 0,
    });
    row.total++;
    row.targetDark += +!!c.target;
    row.covered += +c.envelopeCovered;
    row.uncoveredTargetDark += +(!c.envelopeCovered && !!c.target);
  }
  const outsideCanvas = envelopes.filter(
    (e) => e.x0 < 0 || e.y0 < 0 || e.x1 > spec.width || e.y1 > spec.height,
  );
  const outsideNominalMatrix = envelopes.filter(
    (e) =>
      e.x0 < origin ||
      e.y0 < origin ||
      e.x1 > origin + n * unit ||
      e.y1 > origin + n * unit,
  );
  return {
    schema: "aqrobat.complete-source-envelope-ledger.v1",
    interpretation:
      "Pure source-envelope relaxation only. Covered means arbitrary independent binary control is granted at this center; it is not a measured black pixel, a valid source style assignment, or a decoder result. Uncovered means white only within the declared finite-support model. Native shadow tails, font overhangs, full-size ornament antialiasing, all inter-center pixels and adaptive dependencies require actual evidence. In particular zero potential dark quiet centers does not establish a pixel-white quiet region.",
    matrixCenterDenominator: matrix.length,
    quietCenterDenominator: quiet.length,
    totalCenterDenominator: centers.length,
    whitespaceGlyphsRetainedInSource: spec.glyphs.filter((g) => !g.ch.trim())
      .length,
    actualSourceGlyphDenominator: spec.glyphs.length,
    matrixCovered: matrix.filter((c) => c.envelopeCovered).length,
    potentialDarkQuietCenters: quiet.filter((c) => c.envelopeCovered).length,
    byRole,
    outsideCanvasEnvelopes: outsideCanvas,
    outsideNominalMatrixEnvelopes: outsideNominalMatrix,
    fullInkRequirement:
      "Do not clip to the gray128 nominal ornament rectangle. Resource threshold245 ink has up to one extra source pixel at an edge, scaled here without native remeasurement; actual full-size visible ink must be retained, including any ink outside the nominal matrix. No CSS overflow clipping is used. Quiet positivity must be measured from actual input separately.",
    envelopes,
    centers,
  };
}

export async function freezeLedger(specPath, out) {
  assert(
    out.startsWith("docs/research/prose-qr/integrated-2026-10-10/mechanism/"),
  );
  const raw = await readFile(specPath);
  const source = await readFile(
    "experiments/prose-qr/integrated-2026-10-10/mechanism/ledger.mjs",
  );
  const prereg = {
    atUtc: new Date().toISOString(),
    sourceSha256: sha(source),
    specPath,
    specSha256: sha(raw),
    nativeCaptures: 0,
    readerCalls: 0,
    binarizerCalls: 0,
    denominator:
      "All (25+8)^2 centers: 625 matrix and 464 four-module quiet-ring centers; every source character remains in the source denominator.",
  };
  await mkdir(out);
  await writeFile(
    out + "/preregistration.json",
    JSON.stringify(prereg, null, 2) + "\n",
    { flag: "wx" },
  );
  const result = { ...prereg, ...buildLedger(JSON.parse(raw)) };
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
  const r = await freezeLedger(process.argv[2], process.argv[3]);
  console.log(
    JSON.stringify({
      matrix: r.matrixCenterDenominator,
      quiet: r.quietCenterDenominator,
      covered: r.matrixCovered,
      potentialDarkQuiet: r.potentialDarkQuietCenters,
      outsideCanvas: r.outsideCanvasEnvelopes.length,
      outsideMatrix: r.outsideNominalMatrixEnvelopes.length,
      byRole: r.byRole,
    }),
  );
}

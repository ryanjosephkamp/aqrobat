import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resourceSources } from "./continuous.mjs";

const sha = (b) => createHash("sha256").update(b).digest("hex");
export function squareResources() {
  const prior = resourceSources();
  const out = [];
  for (const font of ["ArialUnicodeMS", "AppleSymbols"])
    for (const symbol of ["▣", "▩"]) {
      const s = structuredClone(
        prior.find((s) => s.font === font && s.symbol === "◉"),
      );
      s.id = `square-${font}-${symbol.codePointAt(0).toString(16)}`;
      s.symbol = symbol;
      s.expectedSelection = symbol;
      s.html = s.html.replaceAll("◉", symbol);
      s.fontSelector = "#text";
      s.classification =
        "A genuine installed native U+25A3 or U+25A9 source ornament, tested as a distinct square-symbol resource. No alphabetic finder success, custom font, image, substitution or emoji atlas. Any full prose must visibly name/select the actual square symbol and retain normal words as data-bearing text.";
      out.push(s);
    }
  for (const gray of [180, 204])
    for (const stroke of [0.75, 1]) {
      const s = structuredClone(
        prior.find((s) => s.gray === gray && s.shadow === 1.5),
      );
      s.id = `phase-stroke-${gray}-${String(stroke).replace(".", "p")}`;
      s.stroke = stroke;
      s.fontSelector = "#text";
      s.html = s.html.replaceAll(
        "text-shadow:",
        `-webkit-text-stroke:${stroke}px currentColor;text-shadow:`,
      );
      s.diagnosticContract.origin = { x: 32, y: 24 };
      s.diagnosticContract.centerOffsets = [
        { x: 0, y: 0 },
        { x: 2.408203125, y: 0 },
        { x: 0, y: -9.6328125 },
        { x: 2.408203125, y: -9.6328125 },
      ];
      s.diagnosticContract.phaseInterpretation =
        "All declared origin/offset/pitch cross products are retained. At pitch38.53125 and offset.y=-9.6328125, effective origin14.3671875 puts first sample y33.6328125, exactly9.6328125 after the first real CSS top24; alternate native rows are sampled at the same phase. Prior pitch38.53125 origin24 hit inter-line gaps. Fractional pixel rounding and glyph-dependent ink still require actual measurement. Ordinary adaptive output remains dependent on neighboring styles.";
      s.classification =
        "Continuous native prose with visible genuine foreground stroke0.75or1px and same-color shadow1.5px. This tests added native glyph support coupled to corrected sampling phase. No graphics, hidden modules, removed ink, custom font or duplicate source. Reject if ordinary words or letterforms become unreadable or overlap.";
      out.push(s);
    }
  assert.equal(out.length, 8);
  return out;
}

export async function freezeSquareResources(out) {
  assert(
    out.startsWith("docs/research/prose-qr/integrated-2026-10-10/mechanism/"),
  );
  await mkdir(out);
  const sources = [];
  for (const s of squareResources()) {
    const dir = out + "/" + s.id;
    await mkdir(dir);
    const htmlPath = dir + "/source.html.txt";
    await writeFile(htmlPath, s.html, { flag: "wx" });
    sources.push({
      ...s,
      html: undefined,
      htmlPath,
      htmlSha256: sha(s.html),
      dir,
    });
  }
  const r = {
    schema: "aqrobat.square-and-phase-stroke-resource-proposal.v1",
    atUtc: new Date().toISOString(),
    sourceSha256: sha(
      await readFile(
        "experiments/prose-qr/integrated-2026-10-10/mechanism/square-resources.mjs",
      ),
    ),
    priorSourceSha256: sha(
      await readFile(
        "experiments/prose-qr/integrated-2026-10-10/mechanism/continuous.mjs",
      ),
    ),
    denominator: 8,
    sources,
    ordinaryCalls: 0,
    fullNativeCalls: 0,
    diagnosticLimit:
      "One preregistered resource pipeline each; literal/adaptive grids and complete glyph/contour receipts. Never replace ordinary first-selected output with a chosen source point.",
    subsequentSelection:
      "At most one fresh calibrated square resource may follow if actual font/Selection/fullink and four-axis geometry are useful. No full trial is automatically authorized by a resource score. A final source must couple source-specific center support and actual square geometry, preserve exact canonical V2Qmask1 and historical samegeometry control custody, and keep words coherent/readable.",
    stops: [
      "font substitution",
      "wrong selected codepoint/text",
      "clipped ink",
      "unreadable/overlapping actual letterforms",
      "source/hash/cap failure",
    ],
  };
  await writeFile(
    out + "/source-spec.json",
    JSON.stringify(r, null, 2) + "\n",
    { flag: "wx" },
  );
  return r;
}

if (
  process.argv[1] &&
  import.meta.url === new URL("file://" + process.argv[1]).href
) {
  const r = await freezeSquareResources(process.argv[2]);
  console.log(
    JSON.stringify({
      denominator: r.denominator,
      sources: r.sources.map(({ id, htmlSha256 }) => ({ id, htmlSha256 })),
    }),
  );
}

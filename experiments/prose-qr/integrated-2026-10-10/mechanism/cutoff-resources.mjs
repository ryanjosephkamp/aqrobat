import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { squareResources } from "./square-resources.mjs";

const sha = (b) => createHash("sha256").update(b).digest("hex");
export function cutoffResources() {
  const previous = squareResources();
  const square = structuredClone(
    previous.find((s) => s.id === "square-ArialUnicodeMS-25a3"),
  );
  square.id = "calibrated-ArialUnicodeMS-25a3-624";
  square.size = 624;
  square.width = square.height = 1024;
  square.cssOrigin = [128, 32];
  square.intendedCounterCenter = { x: 313.25, y: 415.5 };
  square.html = square.html
    .replace("left:64px;", "left:128px;")
    .replace("font-size:192px", "font-size:624px")
    .replace("width:384px;height:320px", "width:1024px;height:1024px");
  square.classification =
    "One actual full-size native U+25A3 square resource at624px, derived from actual192px gray128bbox83x83 to target269.71875px at the unchanged QR pitch38.53125. This is a new native measurement; no scaling transfer pass is assumed. Parent must inspect actual visible glyph; source/fullink/actualfont required. Intended center is separately declared, never ordinary firstselection replacement.";
  const out = [square];
  for (const gray of [228, 232])
    for (const stroke of [0.75, 1]) {
      const s = structuredClone(
        previous.find((s) => s.gray === 204 && s.stroke === stroke),
      );
      s.id = `cutoff-gray-${gray}-stroke-${String(stroke).replace(".", "p")}`;
      s.gray = gray;
      s.html = s.html.replaceAll(
        "rgb(204,204,204)",
        `rgb(${gray},${gray},${gray})`,
      );
      s.classification =
        "Final conditional dynamic-range resource hypothesis: genuine visible foreground228or232 with native stroke andshadow onwhite255. At232, maximum isolated gray/white contrast23 is below pinned jsQR cutoff24; neighboring black glyphs and adaptive block dependence are not assumed independent. At228, contrast27 is above that cutoff. Faintness is expected; exactSelection and decoder behavior cannot establish readability. Parent visual assessment of retained nativePNG is required before any payload source selection; reject inadequate actual prose readability.";
      out.push(s);
    }
  assert.equal(out.length, 5);
  return out;
}

export async function freezeCutoffResources(out) {
  assert(
    out.startsWith("docs/research/prose-qr/integrated-2026-10-10/mechanism/"),
  );
  await mkdir(out);
  const sources = [];
  for (const s of cutoffResources()) {
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
    schema: "aqrobat.final-cutoff-square-resource-proposal.v1",
    atUtc: new Date().toISOString(),
    sourceSha256: sha(
      await readFile(
        "experiments/prose-qr/integrated-2026-10-10/mechanism/cutoff-resources.mjs",
      ),
    ),
    priorSourceSha256: sha(
      await readFile(
        "experiments/prose-qr/integrated-2026-10-10/mechanism/square-resources.mjs",
      ),
    ),
    jsqrSourcePath: "node_modules/jsqr/dist/jsQR.js",
    jsqrSourceSha256: sha(await readFile("node_modules/jsqr/dist/jsQR.js")),
    cutoffSourceLines: [392, 441],
    denominator: 5,
    sources,
    ordinaryCalls: 0,
    fullNativeCalls: 0,
    hypothesisBeforeMeasurement:
      "An isolated pure gray232/white block has max-min23<=MIN_DYNAMIC_RANGE24, whereasgray228 has27>24. Actual mixed native foreground, grayscale rounding, neighbor blackpoint propagation, pixel support and human readability must be measured; no adaptive independence or acceptable faint-prose claim.",
    selectionStops: [
      "Unreadable actual native words or faint letterforms",
      "font/codepoint/Selection/hash mismatch",
      "clipped/missing full glyph ink",
      "bad measured native support",
      "no justified source-specific within-radius matrix prediction",
    ],
    finalAmendment: true,
    budget:
      "5ofremaining8resource slots under current <=16additional-resource authorization. No further resource amendment in this mechanism lane. A final native payload trial remains unselected unless actual evidence and parent visual assessment justify it.",
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
  const r = await freezeCutoffResources(process.argv[2]);
  console.log(
    JSON.stringify({
      denominator: r.denominator,
      sources: r.sources.map(({ id, htmlSha256 }) => ({ id, htmlSha256 })),
    }),
  );
}

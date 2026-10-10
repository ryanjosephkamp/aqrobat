import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import {
  construct,
  PAYLOAD,
  verifyCanonical,
} from "../design/padding-solver.mjs";

export const ROOT = "docs/research/prose-qr/integrated-2026-10-10/mechanism";
export const sha = (b) => createHash("sha256").update(b).digest("hex");
const esc = (s) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const face = (f) => `@font-face{font-family:'${f}';src:local('${f}')}`;
const html = (title, css, content, fonts) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title><style>${fonts.map(face).join("")}html,body{margin:0;background:white}#artifact{position:relative;background:white}${css}</style></head><body><article id="artifact">${content}</article></body></html>`;

export function resourceSources() {
  const sources = [];
  for (const [font, expected] of [
    ["AppleSymbols", "AppleSymbols"],
    ["ArialUnicodeMS", "ArialUnicodeMS"],
  ])
    for (const symbol of ["◉", "⊙"]) {
      const id = `ornament-${font}-${symbol.codePointAt(0).toString(16)}`;
      const size = 192,
        width = 384,
        height = 320;
      const content = `<span id="text" style="position:absolute;left:64px;top:32px;font-family:'${font}';font-size:${size}px;line-height:1.2;color:black;white-space:pre">${symbol}</span>`;
      sources.push({
        id,
        kind: "ornament-resource",
        font,
        size,
        symbol,
        expectedSelection: symbol,
        expectedFonts: [expected],
        width,
        height,
        html: html(
          "Native selected Unicode ornament",
          `#artifact{width:${width}px;height:${height}px}`,
          content,
          [font],
        ),
        classification:
          "An actual Unicode source character with its own semantic section-marker role; not an alphabetic O/o or replacement font. Measure full native ink/counters before declaring any finder geometry.",
      });
    }
  const phrase =
    "Ordinary words stay visible. A camera reads the ink; a person reads the words. Our source preserves every letter, space, and mark.";
  for (const gray of [153, 180, 204])
    for (const shadow of [0, 1.5]) {
      const id = `continuous-gray-${gray}-shadow-${String(shadow).replace(".", "p")}`;
      const lines = [
        "Ordinary words stay visible. A camera reads the ink;",
        "a person reads the words. Our source preserves every",
        "letter, space, and mark.",
      ];
      assert.equal(lines.join(" "), phrase);
      const spans = [];
      let index = 0;
      for (let row = 0; row < lines.length; row++) {
        const line = lines[row] + (row + 1 < lines.length ? " " : "");
        for (let col = 0; col < line.length; col++) {
          const ch = line[col],
            value = Math.floor(col / 4) % 2 ? gray : 0;
          const color = `rgb(${value},${value},${value})`;
          spans.push(
            `<span id="g-0-${index++}" data-index="${index - 1}" data-font="Menlo-Bold" style="left:${32 + col * 9.6328125}px;top:${24 + row * 19.265625}px;color:${color};text-shadow:0 0 ${shadow}px ${color}">${esc(ch)}</span>`,
          );
        }
      }
      const width = 640,
        height = 128;
      sources.push({
        id,
        kind: "continuous-resource",
        font: "Menlo-Bold",
        size: 16,
        gray,
        shadow,
        symbol: phrase,
        expectedSelection: phrase,
        expectedFonts: ["Menlo-Bold"],
        width,
        height,
        html: html(
          "Continuous native prose contrast resource",
          `#artifact{width:${width}px;height:${height}px}#text{margin:0}span{position:absolute;font-family:'Menlo-Bold';font-size:16px;line-height:1;white-space:pre;font-kerning:none;font-variant-ligatures:none;letter-spacing:0}`,
          `<p id="text">${spans.join("")}</p>`,
          ["Menlo-Bold"],
        ),
        classification:
          "Continuous ordinary prose with native foreground and optional native text shadow. No tiles, blocks, per-cell background, image, clipped ink, or hidden text. Gray remains visibly present; readability is an actual-source rejection condition.",
        diagnosticContract: {
          perResource: 1,
          kind: "Combined literal-gray ink envelope plus deterministic preregistered center support and gray/black separability summary; not ordinary recovery or finder acceptance",
          pixelThresholds: [64, 96, 128, 160, 192, 224],
          gridPitches: [19.265625, 38.53125],
          centerOffsets: [
            { x: 0, y: 0 },
            { x: 2.408203125, y: 0 },
            { x: 0, y: 2 },
            { x: 2.408203125, y: 2 },
          ],
          noAdaptiveIndependenceClaim: true,
        },
      });
    }
  return sources;
}

export async function freezeResources(output = ROOT + "/resources") {
  await mkdir(output, { recursive: true });
  const specs = [];
  for (const r of resourceSources()) {
    const dir = output + "/" + r.id;
    await mkdir(dir);
    const htmlPath = dir + "/source.html.txt";
    await writeFile(htmlPath, r.html, { flag: "wx" });
    specs.push({
      ...r,
      html: undefined,
      dir,
      htmlPath,
      htmlSha256: sha(r.html),
    });
  }
  const sourcePath =
    "experiments/prose-qr/integrated-2026-10-10/mechanism/continuous.mjs";
  const result = {
    schema: "aqrobat.continuous-prose-resource-proposal.v1",
    frozenAtUtc: new Date().toISOString(),
    sources: specs,
    denominator: {
      ornamentResources: 4,
      continuousResources: 6,
      total: 10,
      captures: 10,
      maxSourceDiagnostics: 10,
      ordinaryReaders: 0,
      fullNativeCaptures: 0,
    },
    sourceHashes: { [sourcePath]: sha(await readFile(sourcePath)) },
    empiricalOwner:
      "integrated_empirical; this package does not launch apps, capture, diagnose pixels, binarize or decode.",
    stops: [
      "source or exactSelection mismatch",
      "native font substitution or a missing glyph",
      "hidden text, clipped ink, or unreadable normal words",
      "source/capture custody failure",
      "resource denominator or source-diagnostic allowance exceeded",
    ],
    policy:
      "Empirical must preregister its executable harness and full denominator before capture. This is an unmeasured frozen source proposal, not evidence.",
  };
  await writeFile(
    output + "/source-spec.json",
    JSON.stringify(result, null, 2) + "\n",
    { flag: "wx" },
  );
  return result;
}

if (
  process.argv[1] &&
  import.meta.url === new URL("file://" + process.argv[1]).href
) {
  if (process.argv[2] !== "resources")
    throw Error("Usage: node continuous.mjs resources [fresh-output]");
  const result = await freezeResources(process.argv[3]);
  console.log(
    JSON.stringify({
      path: (process.argv[3] ?? ROOT + "/resources") + "/source-spec.json",
      resources: result.sources.map((s) => s.id),
      denominator: result.denominator,
    }),
  );
}

import { generate } from "../../../src/core.mjs";
import { escapeHtml } from "../layout.mjs";
import { captureBatch } from "./capture.mjs";
function wordCells(spec, metrics) {
  const qr = generate(spec.payload, { ecc: "Q", boost: false, stroke: 0 });
  const advance = metrics.fonts[spec.font + "|400"].advanceEm * 20;
  const unit = advance * spec.charsPerModule,
    lineHeight = unit / 2,
    pad = unit * 5;
  const dark =
    spec.charsPerModule === 4
      ? ["NOW", "OWN", "MOM", "MOW", "WOW"]
      : ["NOON", "MOWN", "MOON"];
  const light =
    spec.charsPerModule === 4
      ? ["fir", "ill", "lit", "sir", "fit"]
      : ["rill", "lilt", "till", "tilt", "rift"];
  let state = 52341;
  const random = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
  const lines = [];
  for (let row = 0; row < qr.modules * 2; row++) {
    const words = [];
    for (let col = 0; col < qr.modules; col++) {
      const list = qr.matrix[Math.floor(row / 2)][col] ? dark : light;
      words.push(list[spec.varied ? Math.floor(random() * list.length) : 0]);
    }
    lines.push(
      words.join(" ") +
        (row % 4 === 3 || row === qr.modules * 2 - 1
          ? "."
          : row % 4 === 1
            ? ","
            : ""),
    );
  }
  const content = `<pre id="text-body" style="margin:0;padding:0;width:${qr.modules * unit}px;height:${qr.modules * unit}px;font:400 20px/${lineHeight}px '${spec.font}',monospace;letter-spacing:0;font-variant-ligatures:none;color:black">${lines.map((line) => `<span class="line" style="display:block;height:${lineHeight}px;line-height:${lineHeight}px;white-space:pre">${escapeHtml(line)}</span>`).join("")}</pre>`;
  return {
    spec,
    content,
    markup: `<article id="artifact" style="box-sizing:content-box;width:${qr.modules * unit}px;height:${qr.modules * unit}px;padding:${pad}px;background:white;color:black">${content}</article>`,
    lines,
    plainText: lines.join("\n"),
    matrix: qr.matrix,
    modules: qr.modules,
    unit,
    pad,
    side: Math.ceil((qr.modules + 10) * unit),
    structural: {
      fontSize: 20,
      lineHeightEm: lineHeight / 20,
      emptyLines: 0,
      multipleInternalSpaces: 0,
      minCharactersPerLine: Math.min(...lines.map((x) => x.length)),
      maxCharactersPerLine: Math.max(...lines.map((x) => x.length)),
      uniformWeight: 400,
      uniformInk: "black",
      wordCount: qr.modules * qr.modules * 2,
      semanticClaim:
        "Curated real English words in random order; no sentence/meaning claim. Every light and dark region contains a word; no empty module holes.",
    },
  };
}
const parameters = [];
for (const font of ["Menlo", "Courier New"])
  for (const charsPerModule of [4, 5])
    for (const varied of [false, true])
      parameters.push({
        id: `words-${parameters.length + 1}`,
        payload: "AQROBAT-TEST",
        font,
        charsPerModule,
        linesPerModule: 2,
        fontSize: 20,
        quiet: 5,
        ecc: "Q",
        varied,
        content: "real-word-cells",
        track: "plain-black",
      });
await captureBatch("words-01", parameters, wordCells, [
  "experiments/prose-qr/unweighted/word-cells.mjs",
  "experiments/prose-qr/unweighted/capture.mjs",
]);

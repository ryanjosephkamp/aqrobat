import { generate } from "../../../src/core.mjs";
import { escapeHtml } from "../layout.mjs";

export const DICTIONARY =
  `a an as at be by do go he if in is it me my no of on or so to up us we all and are art ask bad bag bed bee big bit box boy but can car cat cut day did dog dry ear eat end eye far fat few fit fix fly for fun get got had has hat her him his hot how ice its job joy key kid let lie lit lot low man map may met mix mom mud new nor not now odd off old one our out own pen put red row run sad sat saw say sea see set she shy sit six sky son sun ten the tie tin top toy too try two use war was way web wet who why win won yes yet you after again ahead alone along apple april beach begin black bread bring brown chair child clean clear close cloud color could dance dream earth early empty every field first floor fresh fruit funny garden glass green group guide happy heart heavy hello house image ink inside light little local lower magic make many maybe memory might money month morning mother motion music never night ocean often other paper people place plain point quiet quick rain read river room round said same scan screen small smile soft sound space stand start still stone story summer table tell text their there these thing think three time today together tomorrow touch trail trees turn under until upper usual value very voice walk warm water where which white whole window winter woman words world would write young`.split(
    /\s+/,
  );
export const STORY =
  "Morning light crossed the quiet room, and the open window carried the scent of rain. A little bird rested near the garden while we made warm tea. We watched the clouds move beyond the trees and talked about the walk we would take later. Every small sound seemed clear in the still air. The day had only begun, and there was time to look closely at the ordinary things around us.";
const STATES = [
  {
    name: "uniform-regular",
    darkWeight: 400,
    lightWeight: 400,
    gray: 0,
    track: "uniform",
  },
  {
    name: "uniform-bold",
    darkWeight: 700,
    lightWeight: 700,
    gray: 0,
    track: "uniform",
  },
  {
    name: "weight-only",
    darkWeight: 700,
    lightWeight: 400,
    gray: 0,
    track: "weight",
  },
  {
    name: "gray-120",
    darkWeight: 700,
    lightWeight: 400,
    gray: 120,
    track: "grayscale",
  },
  {
    name: "gray-180",
    darkWeight: 700,
    lightWeight: 400,
    gray: 180,
    track: "grayscale",
  },
];
export function specs(payload = "AQROBAT-TEST") {
  const out = [];
  for (const font of ["Menlo", "Courier New"])
    for (const charsPerModule of [2, 3])
      for (const content of ["fabricated", "dictionary", "story"])
        for (const state of STATES) {
          if (content === "story" && state.track === "uniform") continue;
          out.push({
            id: `flow-${String(out.length + 1).padStart(3, "0")}`,
            payload,
            font,
            charsPerModule,
            content,
            ...state,
            fontSize: 20,
            ecc: "M",
            boost: false,
            quiet: 5,
          });
        }
  return out;
}
function random(seed) {
  let x = seed >>> 0;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}
export function build(spec, metrics) {
  const qr = generate(spec.payload, {
    ecc: spec.ecc,
    boost: spec.boost,
    stroke: 0,
  });
  const advance = metrics.fonts[`${spec.font}|400`].advanceEm * spec.fontSize;
  const unit = advance * spec.charsPerModule;
  const columns = qr.modules * spec.charsPerModule;
  const linesPerModule = spec.linesPerModule || 1;
  const totalLines = qr.modules * linesPerModule;
  const lineHeight = unit / linesPerModule;
  const pad = spec.quiet * unit;
  const side = Math.ceil((qr.modules + spec.quiet * 2) * unit);
  const rng = random(9137);
  const glyph = (char, weight) =>
    metrics.glyphs[`${spec.font}|${weight}`][char] ||
    metrics.glyphs[`${spec.font}|${weight}`][char.toLowerCase()];
  const mass = (char, dark) => {
    const g = glyph(char, dark ? spec.darkWeight : spec.lightWeight);
    return (g?.inkMass || 0) * (dark ? 1 : 1 - spec.gray / 255);
  };
  const weights = [...new Set([spec.darkWeight, spec.lightWeight])];
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  const max = Math.max(
    ...weights.flatMap((w) => [...alphabet].map((c) => glyph(c, w).inkMass)),
  );
  const min =
    Math.min(
      ...weights.flatMap((w) => [...alphabet].map((c) => glyph(c, w).inkMass)),
    ) *
    (1 - spec.gray / 255);
  const target = (row, col) =>
    !!qr.matrix[Math.floor(row / linesPerModule)][
      Math.min(qr.modules - 1, Math.floor(col / spec.charsPerModule))
    ];
  const charCost = (c, dark) => {
    const tone = (mass(c, dark) - min) / (max - min);
    return dark ? (1 - tone) ** 2 : tone ** 2;
  };
  const lines = [];
  if (spec.content === "story") {
    const words = STORY.split(" ");
    let wi = 0;
    for (let row = 0; row < totalLines; row++) {
      let line = "";
      while (true) {
        const w = words[wi % words.length];
        if (line.length + (line ? 1 : 0) + w.length > columns) break;
        line += (line ? " " : "") + w;
        wi++;
      }
      lines.push(line);
    }
  } else {
    for (let row = 0; row < totalLines; row++) {
      const punctuation =
        row % 4 === 3 || row === totalLines - 1
          ? "."
          : row % 4 === 1
            ? ","
            : "";
      const width = columns - (punctuation ? 1 : 0);
      const cost = new Array(width + 1).fill(Infinity),
        choice = [];
      cost[width] = 0;
      for (let pos = width - 1; pos >= 0; pos--) {
        let options;
        if (spec.content === "dictionary") options = DICTIONARY;
        else
          options = Array.from({ length: 8 }, (_, i) => {
            const length = i + 2;
            let word = "";
            for (let j = 0; j < length; j++) {
              const dark = target(row, pos + j);
              const vowels = j % 3 === 1;
              const pool = vowels ? "aeiou" : "bcdfghjklmnpqrstvwxyz";
              const sorted = [...pool].sort(
                (a, b) => charCost(a, dark) - charCost(b, dark),
              );
              word += sorted[Math.floor(rng() * Math.min(3, sorted.length))];
            }
            return word;
          });
        for (let word of options) {
          const end = pos + word.length;
          if (end > width) continue;
          const next = end === width ? end : end + 1;
          if (next > width || !Number.isFinite(cost[next])) continue;
          let value = [...word].reduce(
            (sum, c, j) => sum + charCost(c, target(row, pos + j)),
            0,
          );
          if (end < width) value += target(row, end) ? 0.85 : 0.03;
          value += cost[next] + 0.1 + rng() * 0.18;
          if (value < cost[pos]) {
            cost[pos] = value;
            choice[pos] = { word, next };
          }
        }
      }
      let line = "",
        pos = 0;
      while (pos < width) {
        const c = choice[pos];
        if (!c) throw Error("Cannot fit whole words");
        line += (line ? " " : "") + c.word;
        pos = c.next;
      }
      lines.push(line + punctuation);
    }
    for (let row = 0; row < lines.length; row++) {
      if (row % 4 === 0)
        lines[row] = lines[row][0].toUpperCase() + lines[row].slice(1);
    }
  }
  let maxOptical = 0,
    maxRightOverflow = 0;
  const styles = [];
  const markupLines = lines
    .map((line, row) => {
      const markup = [...line]
        .map((char, col) => {
          const dark = target(row, col),
            weight = dark ? spec.darkWeight : spec.lightWeight;
          const g = glyph(char, weight);
          if (g) {
            maxOptical = Math.max(
              maxOptical,
              (((g.ascent + g.descent) / 40) * spec.fontSize) / lineHeight,
            );
            maxRightOverflow = Math.max(
              maxRightOverflow,
              (g.right / 40) * spec.fontSize - advance,
            );
          }
          const shade = dark ? 0 : spec.gray;
          styles.push({ row, col, char, dark, weight, shade });
          return `<span style="font-weight:${weight};color:rgb(${shade},${shade},${shade})">${escapeHtml(char)}</span>`;
        })
        .join("");
      return `<span class="line" style="display:block;height:${lineHeight}px;line-height:${lineHeight}px;white-space:pre">${markup}</span>`;
    })
    .join("");
  const content = `<p id="text-body" style="margin:0;padding:0;width:${qr.modules * unit}px;height:${qr.modules * unit}px;font:${spec.lightWeight} ${spec.fontSize}px/${lineHeight}px '${spec.font}',monospace;letter-spacing:0;font-variant-ligatures:none">${markupLines}</p>`;
  const markup = `<article id="artifact" style="box-sizing:content-box;width:${qr.modules * unit}px;height:${qr.modules * unit}px;padding:${pad}px;background:white;color:black;overflow:visible">${content}</article>`;
  return {
    spec,
    markup,
    content,
    plainText: lines.join("\n"),
    lines,
    styles,
    modules: qr.modules,
    matrix: qr.matrix,
    columns,
    advance,
    unit,
    lineHeight,
    pad,
    side,
    structural: {
      fontSize: spec.fontSize,
      lineHeightEm: lineHeight / spec.fontSize,
      maxOpticalHeightToLineHeight: maxOptical,
      maximumAdvanceOverflowPx: maxRightOverflow,
      emptyLines: lines.filter((l) => !l.trim()).length,
      multipleInternalSpaces: lines.filter((l) => / {2,}/.test(l)).length,
      minCharactersPerLine: Math.min(...lines.map((l) => l.length)),
      maxCharactersPerLine: Math.max(...lines.map((l) => l.length)),
      words: lines.join(" ").split(/\s+/).length,
      semanticClaim:
        spec.content === "story"
          ? "Fixed original paragraph repeated to fill the block; not optimized for semantic QR embedding"
          : "Word salad or fabricated words; semantic and grammatical quality not claimed",
    },
  };
}
export const documentHtml = (markup) =>
  `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:white;color:black}body{width:max-content}*{font-synthesis:weight;box-sizing:content-box}</style></head><body>${markup}</body></html>`;

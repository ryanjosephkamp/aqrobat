import { generate } from "../../../src/core.mjs";
import { DICTIONARY } from "../flow/layout.mjs";
import { escapeHtml } from "../layout.mjs";
const EXTRA =
  "mammal mammoth minimum maximum mum mumble mummy memory mammogram moon moonbeam wood woodworm woman women mom ammo among game gaming gagging bag baggage big rib ill lilliputian little lit lilt tilt tilting tile till tin it if fit fritter fifty fire rifle trill trifle trivial ritual rill rigid ripe ripe rip iris irises sir stir still sift silt silty stiff rift thrift thrill thriller mirror murmur murmuring murmurs rubber rubbing bud budding bob bobbing dog dogma dim amid under upper people paper map mopping meeting bringing".split(
    " ",
  );
function rng(seed = 71337) {
  let x = seed;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}
export function plainLayout(spec, metrics) {
  const qr = generate(spec.payload, { ecc: spec.ecc, boost: false, stroke: 0 });
  const glyphs = metrics.glyphs[spec.font + "|400"];
  const advance = metrics.fonts[spec.font + "|400"].advanceEm * spec.fontSize;
  const unit = advance * spec.charsPerModule,
    columns = qr.modules * spec.charsPerModule;
  const rows = qr.modules * spec.linesPerModule,
    lineHeight = unit / spec.linesPerModule,
    pad = 5 * unit;
  const side = Math.ceil((qr.modules + 10) * unit);
  const random = rng();
  const alphabet =
    spec.caseMode === "lower"
      ? "abcdefghijklmnopqrstuvwxyz"
      : "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const masses = [...alphabet].map((c) => glyphs[c].inkMass);
  const min = Math.min(...masses),
    max = Math.max(...masses);
  const target = (row, col) =>
    !!qr.matrix[Math.floor(row / spec.linesPerModule)][
      Math.min(qr.modules - 1, Math.floor(col / spec.charsPerModule))
    ];
  const cost = (ch, dark) => {
    const tone = (glyphs[ch]?.inkMass || 0) - min;
    const v = tone / (max - min);
    return dark ? (1 - v) ** 2 : v ** 2;
  };
  const dictionary = [...new Set([...DICTIONARY, ...EXTRA])].filter(
    (w) => w.length >= 2,
  );
  const lines = [];
  for (let row = 0; row < rows; row++) {
    const punctuation =
      row % 4 === 3 || row === rows - 1 ? "." : row % 4 === 1 ? "," : "";
    const width = columns - (punctuation ? 1 : 0);
    const dp = new Array(width + 1).fill(Infinity),
      choices = [];
    dp[width] = 0;
    for (let pos = width - 1; pos >= 0; pos--) {
      let options = [];
      if (spec.content === "dictionary")
        options =
          spec.caseMode === "word-caps"
            ? dictionary.flatMap((w) => [w, w.toUpperCase()])
            : dictionary;
      else
        for (let len = 2; len <= 12; len++)
          for (const upper of spec.caseMode === "word-caps"
            ? [false, true]
            : [false]) {
            let word = "";
            for (let j = 0; j < len; j++) {
              const dark = target(row, pos + j),
                vowel = j % spec.vowelEvery === 1;
              let pool = vowel ? "aeiou" : "bcdfghjklmnpqrstvwxyz";
              if (upper) pool = pool.toUpperCase();
              const ranked = [...pool].sort(
                (a, b) => cost(a, dark) - cost(b, dark),
              );
              word += ranked[Math.floor(random() * spec.topChoices)];
            }
            options.push(word);
          }
      for (let word of options) {
        if (pos === 0 && row % 4 === 0)
          word = word[0].toUpperCase() + word.slice(1);
        const end = pos + word.length,
          next = end === width ? end : end + 1;
        if (end > width || next > width || !Number.isFinite(dp[next])) continue;
        let score = [...word].reduce(
          (s, c, j) => s + cost(c, target(row, pos + j)),
          0,
        );
        if (end < width) score += target(row, end) ? 1.2 : 0;
        score += dp[next] + 0.03 + random() * 0.02;
        if (score < dp[pos]) {
          dp[pos] = score;
          choices[pos] = { word, next };
        }
      }
    }
    let pos = 0,
      line = "";
    while (pos < width) {
      const c = choices[pos];
      if (!c) throw Error("Whole-word packing failed");
      line += (line ? " " : "") + c.word;
      pos = c.next;
    }
    lines.push(line + punctuation);
  }
  const content = `<pre id="text-body" style="margin:0;padding:0;width:${qr.modules * unit}px;height:${qr.modules * unit}px;font:400 ${spec.fontSize}px/${lineHeight}px '${spec.font}',monospace;letter-spacing:0;font-variant-ligatures:none;color:black">${lines.map((line) => `<span class="line" style="display:block;height:${lineHeight}px;line-height:${lineHeight}px;white-space:pre">${escapeHtml(line)}</span>`).join("")}</pre>`;
  const markup = `<article id="artifact" style="box-sizing:content-box;width:${qr.modules * unit}px;height:${qr.modules * unit}px;padding:${pad}px;background:white;color:black;overflow:visible">${content}</article>`;
  return {
    spec,
    markup,
    content,
    lines,
    plainText: lines.join("\n"),
    matrix: qr.matrix,
    modules: qr.modules,
    unit,
    pad,
    side,
    structural: {
      fontSize: spec.fontSize,
      lineHeightEm: lineHeight / spec.fontSize,
      emptyLines: lines.filter((x) => !x.trim()).length,
      multipleInternalSpaces: lines.filter((x) => / {2,}/.test(x)).length,
      minCharactersPerLine: Math.min(...lines.map((x) => x.length)),
      maxCharactersPerLine: Math.max(...lines.map((x) => x.length)),
      wordCount: lines.join(" ").split(/\s+/).length,
      uniformWeight: 400,
      uniformInk: "black",
      caseMode: spec.caseMode,
      semanticClaim:
        spec.content === "dictionary"
          ? "Whole real words; word salad, not coherent sentences"
          : "Fabricated word forms; semantic quality not claimed",
    },
  };
}

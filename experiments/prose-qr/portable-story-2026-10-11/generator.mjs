import { generate } from "../../../src/core.mjs";

export const FONT_FAMILIES = [
  "Impact",
  "Avenir Next Condensed",
  "Arial Black",
  "PT Sans Narrow",
  "Georgia",
  "Arial",
  "Courier New",
];
export const DEFAULT_PROSE =
  "Morning light crossed the quiet room, and the open window carried the scent of rain. A little bird rested near the garden while we made warm tea. We watched the clouds move beyond the trees and talked about the walk we would take later. Every small sound seemed clear in the still air. The day had only begun, and there was time to look closely at the ordinary things around us.";
export const DEFAULT_RECIPE = Object.freeze({
  payload: "https://example.com/",
  text: DEFAULT_PROSE,
  font: "Impact",
  fontSize: 12,
  field: 600,
  linesPerModule: 2,
  quiet: 5,
  ecc: "Q",
  dark: 0,
  gray: 180,
  darkWeight: 400,
  lightWeight: 400,
  repeat: true,
});
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function validatePortable(input) {
  const s = { ...DEFAULT_RECIPE, ...input };
  if (typeof s.text !== "string" || !s.text.trim() || !s.text.isWellFormed())
    throw new Error("Enter nonempty, well-formed source prose.");
  if (new TextEncoder().encode(s.text).length > 50000)
    throw new Error(
      "Source exceeds this research tool’s 50,000-byte bound; nothing was shortened.",
    );
  if (
    /[\p{Cc}]/u.test(s.text.replace(/[\t\r\n]/g, "")) ||
    /[^\p{Script=Latin}0-9\p{P}\p{White_Space}]/u.test(s.text)
  )
    throw new Error(
      "This renderer supports Latin letters, digits and punctuation. Other scripts, combining marks and symbols need a shaping-aware renderer; input was preserved and rejected.",
    );
  if (!FONT_FAMILIES.includes(s.font))
    throw new Error("Choose a listed installed font.");
  for (const [k, min, max] of [
    ["fontSize", 10, 20],
    ["field", 400, 1000],
    ["quiet", 4, 5],
    ["linesPerModule", 1, 4],
    ["dark", 0, 200],
    ["gray", 0, 200],
    ["darkWeight", 100, 900],
    ["lightWeight", 100, 900],
  ])
    if (!Number.isFinite(s[k]) || s[k] < min || s[k] > max)
      throw new Error(`Invalid ${k}.`);
  if (
    !Number.isInteger(s.linesPerModule) ||
    !Number.isInteger(s.quiet) ||
    !["L", "M", "Q", "H"].includes(s.ecc) ||
    typeof s.repeat !== "boolean"
  )
    throw new Error("Invalid layout settings.");
  if (s.gray < s.dark)
    throw new Error("Light ink must be at least as light as dark ink.");
  return s;
}
export function measurePortable(input, documentObject = document) {
  const s = validatePortable(input),
    c = documentObject.createElement("canvas").getContext("2d");
  const probe = "Morning light ABCDEFGHIJKLM abcdefghijkl 2026";
  const probeWidth = (font) => {
    c.font = `400 16px ${font}`;
    return c.measureText(probe).width;
  };
  const available = ["monospace", "serif"].some(
    (f) => Math.abs(probeWidth(`'${s.font}',${f}`) - probeWidth(f)) > 0.001,
  );
  if (!available)
    throw new Error(
      `${s.font} is unavailable on this computer. Choose an installed font; no silent fallback was used.`,
    );
  c.fontKerning = "none";
  const glyphs = {},
    weights = [...new Set([s.darkWeight, s.lightWeight])];
  for (const char of [...new Set(s.text + " ")]) {
    if (/\s/u.test(char) && char !== " ") continue;
    const ms = weights.map((w) => {
      c.font = `${w} ${s.fontSize}px '${s.font}'`;
      const m = c.measureText(char);
      return {
        advance: m.width,
        ascent: m.actualBoundingBoxAscent,
        descent: m.actualBoundingBoxDescent,
      };
    });
    glyphs[char] = {
      advance: Math.max(...ms.map((m) => m.advance)),
      // Native bounds can be signed (quotes sit wholly above the baseline).
      // Use a conservative baseline envelope while retaining raw metrics.
      ascent: Math.max(0, ...ms.map((m) => m.ascent)),
      descent: Math.max(0, ...ms.map((m) => m.descent)),
      weights: ms,
    };
  }
  return { font: s.font, size: s.fontSize, weights, glyphs };
}
function balancedRows(words, widthOf, space, field, rowCount) {
  const n = words.length;
  if (n < rowCount * 2)
    throw new Error(
      "Too little text to fill the square with readable word spacing. Enable complete-source repetition or supply more prose.",
    );
  const prefix = [0];
  for (const w of words) prefix.push(prefix.at(-1) + widthOf(w));
  let costs = new Float64Array(n + 1).fill(Infinity);
  costs[0] = 0;
  const history = [];
  for (let row = 0; row < rowCount; row++) {
    const next = new Float64Array(n + 1).fill(Infinity),
      prev = new Int32Array(n + 1).fill(-1);
    for (let i = 0; i < n; i++) {
      if (!Number.isFinite(costs[i])) continue;
      const max = n - (rowCount - row - 1) * 2;
      for (let j = i + 2; j <= max; j++) {
        const inkWidth = prefix[j] - prefix[i],
          natural = inkWidth + (j - i - 1) * space;
        if (natural > field + 0.00001) break;
        const gap = (field - inkWidth) / (j - i - 1);
        if (gap > space * 4) continue;
        const penalty = (gap / space - 1) ** 2;
        if (costs[i] + penalty < next[j]) {
          next[j] = costs[i] + penalty;
          prev[j] = i;
        }
      }
    }
    history.push(prev);
    costs = next;
  }
  if (!Number.isFinite(costs[n]))
    throw new Error(
      "Complete source copies cannot fill this square within the spacing bound. Change width, size or repetition; no source was dropped.",
    );
  const lines = [];
  let end = n;
  for (let row = rowCount - 1; row >= 0; row--) {
    const start = history[row][end];
    lines.unshift(words.slice(start, end));
    end = start;
  }
  return lines;
}
export function composePortable(input, measurement) {
  const spec = validatePortable(input),
    qr = generate(spec.payload, { ecc: spec.ecc, boost: false, stroke: 0 });
  if (
    !measurement ||
    measurement.font !== spec.font ||
    measurement.size !== spec.fontSize ||
    !measurement.glyphs ||
    [...new Set([spec.darkWeight, spec.lightWeight])].some(
      (w) => !measurement.weights.includes(w),
    )
  )
    throw new Error(
      "Native measurement does not match the requested font, size or weights.",
    );
  for (const g of Object.values(measurement.glyphs))
    if (
      ![g.advance, g.ascent, g.descent].every(Number.isFinite) ||
      g.advance <= 0 ||
      g.ascent < 0 ||
      g.descent < 0
    )
      throw new Error("Invalid native glyph metrics.");
  const field = spec.field,
    pitch = field / qr.modules,
    leading = pitch / spec.linesPerModule,
    rowCount = qr.modules * spec.linesPerModule;
  const envelope =
    Math.max(...Object.values(measurement.glyphs).map((g) => g.ascent)) +
    Math.max(...Object.values(measurement.glyphs).map((g) => g.descent));
  if (envelope > leading + 0.01)
    throw new Error(
      `Letters need ${envelope.toFixed(2)}px height but rows allow ${leading.toFixed(2)}px. Enlarge the field or reduce type size; nothing was shrunk automatically.`,
    );
  const advance = (c) => {
    const g = measurement.glyphs[c];
    if (!g) throw new Error("Source character was not measured.");
    return g.advance;
  };
  const widthOf = (w) => [...w].reduce((n, c) => n + advance(c), 0),
    space = advance(" "),
    words = spec.text.trim().split(/\s+/u);
  if (words.some((w) => widthOf(w) > field))
    throw new Error(
      "A complete word exceeds the text width; words are never split or shortened.",
    );
  const greedy = [];
  let cursor = 0;
  for (let row = 0; row < rowCount; row++) {
    let used = 0;
    const line = [];
    while (true) {
      const word = words[cursor % words.length],
        w = widthOf(word);
      if (used + (line.length ? space : 0) + w > field) break;
      used += (line.length ? space : 0) + w;
      line.push(word);
      cursor++;
    }
    greedy.push(line);
  }
  if (words.length > cursor)
    throw new Error(
      `Source overflow: one full copy does not fit (${words.length} words, about ${cursor} available). Nothing was shortened.`,
    );
  let copies = spec.repeat ? Math.floor(cursor / words.length) : 1,
    lines;
  if (cursor === copies * words.length) lines = greedy;
  else
    lines = balancedRows(
      Array.from({ length: copies }, () => words).flat(),
      widthOf,
      space,
      field,
      rowCount,
    );
  const outputWords = lines.flat();
  if (
    outputWords.length !== words.length * copies ||
    !outputWords.every((w, i) => w === words[i % words.length])
  )
    throw new Error("Internal source-preservation check failed.");
  const runs = [],
    fragments = [],
    gaps = [];
  for (const [li, picked] of lines.entries()) {
    const gap =
      picked.length > 1
        ? (field - picked.reduce((n, w) => n + widthOf(w), 0)) /
          (picked.length - 1)
        : 0;
    gaps.push(gap);
    let x = 0;
    const markup = [],
      lineRuns = [];
    for (const [wi, word] of picked.entries()) {
      let dx = 0;
      const letters = [];
      for (const c of word) {
        const a = advance(c),
          col = Math.min(qr.modules - 1, Math.floor((x + dx + a / 2) / pitch)),
          dark = qr.matrix[Math.floor(li / spec.linesPerModule)][col],
          shade = dark ? spec.dark : spec.gray,
          weight = dark ? spec.darkWeight : spec.lightWeight;
        letters.push(
          `<span style="display:inline-block;width:${a}px;color:rgb(${shade},${shade},${shade});font-weight:${weight}">${escape(c)}</span>`,
        );
        lineRuns.push({ text: c, color: shade, weight, x: x + dx, advance: a });
        dx += a;
      }
      if (wi < picked.length - 1)
        lineRuns.push({
          text: " ",
          color: spec.dark,
          weight: spec.darkWeight,
          x: x + dx,
          advance: gap,
        });
      markup.push(
        `<span class="word" style="position:absolute;left:${x}px;top:0;white-space:pre">${letters.join("")}${wi < picked.length - 1 ? " " : ""}</span>`,
      );
      x += widthOf(word) + gap;
    }
    runs.push(lineRuns);
    fragments.push(
      `<span class="line" style="position:absolute;display:block;left:0;top:${li * leading}px;width:${field}px;height:${leading}px;line-height:${leading}px;white-space:pre">${markup.join("")}</span>`,
    );
  }
  const pad = spec.quiet * pitch,
    plainText = lines.map((l) => l.join(" ")).join("\n");
  const markup = `<article id="artifact" style="position:relative;box-sizing:content-box;width:${field}px;height:${field}px;padding:${pad}px;background:white"><pre id="text-body" style="position:relative;margin:0;padding:0;width:${field}px;height:${field}px;font:400 ${spec.fontSize}px/${leading}px '${spec.font}';font-kerning:none;font-variant-ligatures:none">${fragments.join("\n")}</pre></article>`;
  return {
    spec,
    markup,
    html: `<!doctype html><html><head><meta charset="utf-8"><title>Aqrobat prose QR</title><style>html,body{margin:0;padding:0;background:white}</style></head><body>${markup}</body></html>`,
    source: spec.text,
    plainText,
    lines: lines.map((l) => l.join(" ")),
    runs,
    matrix: qr.matrix,
    modules: qr.modules,
    side: field + 2 * pad,
    pitch,
    leading,
    measurement,
    summary: {
      font: spec.font,
      fontPixels: spec.fontSize,
      fontPoints: spec.fontSize * 0.75,
      bodyCssPixels: field,
      bodyInches: field / 96,
      pageCssPixels: field + 2 * pad,
      rows: rowCount,
      maxLineCharacters: Math.max(...lines.map((l) => l.join(" ").length)),
      sourceWords: words.length,
      outputWords: outputWords.length,
      completeCopies: copies,
      partialCopies: 0,
      wordOrderAndCasePreserved: true,
      sourceWhitespace:
        "Preserved exactly in source TXT and recipe. Display wraps whole words and normalizes inter-word whitespace.",
      scanStatus:
        "Untested generated output; evidence applies only to named saved examples.",
      spacingRatio: [Math.min(...gaps) / space, Math.max(...gaps) / space],
      envelope,
    },
  };
}
function rtfEscape(t) {
  let r = "";
  for (let i = 0; i < t.length; i++) {
    const n = t.charCodeAt(i),
      c = t[i];
    r +=
      c === "\\" || c === "{" || c === "}"
        ? "\\" + c
        : n >= 32 && n < 127
          ? c
          : `\\u${n > 32767 ? n - 65536 : n}?`;
  }
  return r;
}
export function portableRtf(layout) {
  const s = layout.spec,
    w = s.field * 0.75,
    h = w,
    leading = layout.leading * 0.75;
  if (!Number.isInteger(s.fontSize * 1.5))
    throw new Error(
      "RTF half-point font sizes cannot preserve this exact CSS size. Use an even integer CSS font size or export HTML.",
    );
  if (w > 468 || h + leading > 648)
    throw new Error(
      "This body exceeds the RTF export’s US Letter document bound. Choose a smaller field.",
    );
  const left = (612 - w) / 2,
    top = (792 - h) / 2,
    bottom = top - leading;
  const avenir = s.font === "Avenir Next Condensed";
  const faces = avenir
    ? [
        "AvenirNextCondensed-Heavy",
        "AvenirNextCondensed-UltraLight",
        "AvenirNextCondensed-Regular",
      ]
    : [s.font];
  const index = (weight) =>
    avenir ? (weight >= 800 ? 0 : weight <= 200 ? 1 : 2) : 0;
  const colors = [...new Set([s.dark, s.gray])],
    colorIndex = (c) => colors.indexOf(c) + 1;
  const rows = layout.runs
    .map(
      (r) =>
        r
          .map(
            (c) =>
              `\\f${index(c.weight)}\\b${!avenir && c.weight >= 600 ? 1 : 0}\\cf${colorIndex(c.color)} ${rtfEscape(c.text)}`,
          )
          .join("") + "\\line\n",
    )
    .join("");
  return `{\\rtf1\\ansi\\ansicpg1252\\deff0\\uc1{\\fonttbl${faces.map((f, i) => `{\\f${i}\\fnil ${f};}`).join("")}}{\\colortbl;${colors.map((c) => `\\red${c}\\green${c}\\blue${c};`).join("")}}\\paperw12240\\paperh15840\\margl${Math.round(left * 20)}\\margr${Math.round(left * 20)}\\margt${Math.round(top * 20)}\\margb${Math.round(bottom * 20)}\\viewkind4\\pard\\qj\\sl-${Math.round(leading * 20)}\\slmult0\\fi0\\li0\\ri0\\sa0\\sb0\\f0\\fs${s.fontSize * 1.5}\\kerning0\\expndtw0\n${rows}\\par}`;
}

export function portableClipboardHtml(layout) {
  const s = layout.spec,
    points = s.fontSize * 0.75,
    linePoints = layout.leading * 0.75;
  const lines = layout.runs.map(
    (row) =>
      row
        .map(
          (c) =>
            `<span style="font-family:'${s.font}';font-size:${points}pt;font-weight:${c.weight};color:rgb(${c.color},${c.color},${c.color})">${escape(c.text)}</span>`,
        )
        .join("") + "<br>",
  );
  return `<html><head><meta charset="utf-8"></head><body><p style="font-family:'${s.font}';font-size:${points}pt;line-height:${linePoints}pt;mso-line-height-rule:exactly;text-align:justify;text-align-last:justify;margin:0;width:${s.field * 0.75}pt;font-kerning:none;font-variant-ligatures:none">${lines.join("")}</p></body></html>`;
}

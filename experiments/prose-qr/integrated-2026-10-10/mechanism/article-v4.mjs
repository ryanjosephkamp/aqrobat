import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import {
  layoutArticle as oldLayout,
  texts as oldTexts,
} from "./article-v3.mjs";
import {
  construct,
  verifyCanonical,
  PAYLOAD,
} from "../design/padding-solver.mjs";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const esc = (s) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
export const texts = oldTexts.map((t, p) =>
  p === 1
    ? t
        .replace(
          " A prediction at a chosen point cannot speak for that choice.",
          "",
        )
        .replace(
          " Neither outcome changes the sentence that the person has just read.",
          "",
        )
    : t,
);
// Deterministic native word layout. This partitions real source tokens among
// ordinary row segments, minimizes uneven fill, and never breaks a word,
// removes a space, duplicates a character, or paints a graphics tile.
export function partition(indices, text, slots) {
  const all = indices.map((i) => text[i]).join(""),
    tokens = all.match(/\s+|\S+\s*/g) ?? [];
  assert.equal(tokens.join(""), all);
  const starts = [0];
  for (const t of tokens) starts.push(starts.at(-1) + t.length);
  const totalCap = slots.reduce((a, s) => a + s.capacity, 0),
    ratio = all.length / totalCap,
    memo = new Map();
  const find = (si, ti) => {
    const key = si + ":" + ti;
    if (memo.has(key)) return memo.get(key);
    if (si === slots.length)
      return ti === tokens.length ? { cost: 0, ends: [] } : null;
    let best = null;
    for (let end = ti; end <= tokens.length; end++) {
      const len = starts[end] - starts[ti];
      if (len > slots[si].capacity) break;
      const rest = find(si + 1, end);
      if (!rest) continue;
      const cost =
        rest.cost +
        (len / slots[si].capacity - ratio) ** 2 +
        (len === 0 ? 0.15 : 0);
      if (!best || cost < best.cost) best = { cost, ends: [end, ...rest.ends] };
    }
    memo.set(key, best);
    return best;
  };
  const fit = find(0, 0);
  assert(
    fit,
    "Native prose does not fit the declared word-safe slots; reject overflow",
  );
  let token = 0,
    index = 0;
  return slots.map((s, k) => {
    const len = starts[fit.ends[k]] - starts[token],
      part = indices.slice(index, index + len);
    index += len;
    token = fit.ends[k];
    return { ...s, indices: part, text: part.map((i) => text[i]).join("") };
  });
}
export function layoutArticle(options) {
  const old = oldLayout(options).spec,
    { geometry } = old,
    unit = geometry.unit,
    origin = geometry.origin,
    n = geometry.dimension,
    advance = old.options.advance,
    bodySize = old.options.bodySize,
    bodyCenter = old.options.bodyCenterFromTop,
    gray = old.options.bodyGray,
    shadow = old.options.shadow,
    margin = 2 + 3 * shadow;
  assert.equal(
    n,
    25,
    "This revised finite composition is declared for V2 only",
  );
  const positions = old.glyphs
      .filter((g) => g.role !== "body")
      .map((g) => ({ ...g })),
    rows = [];
  const marker = positions.find(
    (g) => g.role === "named-alignment-marker",
  ).nominalInkBounds;
  const slot = (p, line, cy, x0, x1) => ({
    p,
    line,
    cy,
    x0,
    x1,
    capacity: Math.floor((x1 - x0) / advance) - 1,
  });
  const p0 = Array.from({ length: 13 }, (_, i) =>
    slot(
      0,
      i,
      origin + (0.5 + (7 * i) / 12) * unit,
      origin + 8 * unit,
      origin + 17 * unit,
    ),
  );
  const p1 = [];
  for (let i = 0; i < 18; i++) {
    const cy = origin + (8.5 + (9 * i) / 17) * unit,
      left = i === 17 ? origin + 8 * unit : origin;
    if (cy + 17 >= marker.top && cy - 17 <= marker.top + marker.height) {
      p1.push(slot(1, i, cy, left, marker.left - margin));
      p1.push(
        slot(1, i, cy, marker.left + marker.width + margin, origin + n * unit),
      );
    } else p1.push(slot(1, i, cy, left, origin + n * unit));
  }
  const p2 = [];
  for (let i = 0; i < 12; i++) {
    const cy = origin + (18.5 + (6 * i) / 11) * unit;
    if (cy + 17 >= marker.top && cy - 17 <= marker.top + marker.height) {
      p2.push(slot(2, i, cy, origin + 8 * unit, marker.left - margin));
      p2.push(
        slot(2, i, cy, marker.left + marker.width + margin, origin + n * unit),
      );
    } else p2.push(slot(2, i, cy, origin + 8 * unit, origin + n * unit));
  }
  const putRow = (r) => {
    rows.push({ ...r, indices: undefined });
    r.indices.forEach((index, col) =>
      positions.push({
        p: r.p,
        index,
        ch: texts[r.p][index],
        x: r.x0 + (3 * advance) / 4 + col * advance,
        y: r.cy - bodyCenter,
        role: "body",
        font: "Menlo-Bold",
        size: bodySize,
        line: r.line,
      }),
    );
  };
  partition(
    Array.from({ length: texts[0].length - 2 }, (_, i) => i + 1),
    texts[0],
    p0,
  ).forEach(putRow);
  partition(
    Array.from({ length: texts[1].length }, (_, i) => i),
    texts[1],
    p1,
  ).forEach(putRow);
  const ai = texts[2].indexOf("⊙"),
    prefix = Array.from({ length: ai - 1 }, (_, i) => i + 1),
    first = p2[0];
  assert(prefix.length <= first.capacity + 2);
  prefix.forEach((index, col) =>
    positions.push({
      p: 2,
      index,
      ch: texts[2][index],
      x: first.x0 - advance / 2 + col * advance,
      y: first.cy - bodyCenter,
      role: "body",
      font: "Menlo-Bold",
      size: bodySize,
      line: 0,
    }),
  );
  partition(
    Array.from({ length: texts[2].length - ai - 1 }, (_, i) => ai + i + 1),
    texts[2],
    p2.slice(1),
  ).forEach(putRow);
  positions.sort((a, b) => a.p - b.p || a.index - b.index);
  for (let p = 0; p < 3; p++) {
    const g = positions.filter((g) => g.p === p);
    assert.equal(g.map((g) => g.ch).join(""), texts[p]);
    assert.equal(new Set(g.map((g) => g.index)).size, texts[p].length);
  }
  const { version, ecc, mask } = old.options;
  verifyCanonical(version, ecc, mask);
  const encoded = construct(version, ecc, mask);
  const glyphs = positions.map((g) => {
    const x = Math.floor((g.x + advance / 2 - origin) / unit),
      y = Math.floor((g.y + bodyCenter - origin) / unit),
      target =
        g.role === "body" && x >= 0 && y >= 0 && x < n && y < n
          ? encoded.matrix[y][x]
          : 1;
    return {
      ...g,
      module: g.role === "body" ? { x, y, target } : null,
      gray: g.role === "body" ? (target ? 0 : gray) : 0,
      shadow: g.role === "body" ? shadow : 0,
    };
  });
  const fonts = [...new Set(glyphs.map((g) => g.font))],
    ps = texts
      .map(
        (t, p) =>
          `<p id="p${p}" class="prose">${glyphs
            .filter((g) => g.p === p)
            .map((g) => {
              const c = `rgb(${g.gray},${g.gray},${g.gray})`;
              return `<span id="g-${g.p}-${g.index}" data-index="${g.index}" data-role="${g.role}" data-font="${g.font}" style="left:${g.x}px;top:${g.y}px;font-family:'${g.font}';font-size:${g.size}px;line-height:${g.role === "body" ? 1 : 1.2};color:${c};text-shadow:0 0 ${g.shadow}px ${c}">${esc(g.ch)}</span>`;
            })
            .join("")}</p>`,
      )
      .join("");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>One page, two readings — continuous native prose revision4</title><style>${fonts.map((f) => `@font-face{font-family:'${f}';src:local('${f}')}`).join("")}html,body{margin:0;background:white}#artifact{position:relative;width:${old.width}px;height:${old.height}px;background:white}p{margin:0}span{position:absolute;white-space:pre;font-kerning:none;font-variant-ligatures:none;letter-spacing:0}</style></head><body><article id="artifact">${ps}</article></body></html>`;
  return {
    html,
    spec: {
      ...old,
      sourceRevision: "continuous-native-prose-v4",
      texts,
      fullText: texts.join("\n\n"),
      glyphs,
      rows,
      options: {
        ...old.options,
        wordLayout:
          "Deterministic whole-word DP with normal20.40–22.48px row spacing at16px native font; complete marker envelope plus6.5px margin excluded. First and last row centers span declared paragraph bands, including ordinary line/paragraph gaps in every constraint denominator.",
      },
      htmlSha256: sha(html),
      target: {
        payload: PAYLOAD,
        version,
        ecc,
        mask,
        padding: "canonical",
        dataCodewords: encoded.code.dataCodewords,
        interleavedCodewords: encoded.code.interleavedCodewords,
        ownership: encoded.ownership,
        map: encoded.map,
        matrix: encoded.matrix,
        matrixSha256: sha(JSON.stringify(encoded.matrix)),
      },
      amends:
        "Preserved source-v3 and support-01 excluded24fittingcases/8overflow. New explicit prose revision removes two narrative sentences and redistributes whole source words vertically, keeping normal line spacing and marker float exclusion. No prior empirical batch or capture changed.",
    },
  };
}
export async function freezeArticle(optionsPath, out) {
  assert(
    out?.startsWith("docs/research/prose-qr/integrated-2026-10-10/mechanism/"),
  );
  const raw = await readFile(optionsPath),
    built = layoutArticle(JSON.parse(raw));
  await mkdir(out);
  const htmlPath = out + "/source.html.txt";
  await writeFile(htmlPath, built.html, { flag: "wx" });
  const paths = [
      "experiments/prose-qr/integrated-2026-10-10/mechanism/article-v4.mjs",
      "experiments/prose-qr/integrated-2026-10-10/mechanism/article-v3.mjs",
      "experiments/prose-qr/integrated-2026-10-10/mechanism/article-v2.mjs",
      "experiments/prose-qr/integrated-2026-10-10/design/padding-solver.mjs",
      "vendor/qrcodegen.mjs",
      optionsPath,
    ],
    sourceHashes = {};
  for (const p of paths) sourceHashes[p] = sha(await readFile(p));
  const spec = {
    ...built.spec,
    sourceHashes,
    htmlPath,
    dir: out,
    frozenAtUtc: new Date().toISOString(),
  };
  await writeFile(
    out + "/source-spec.json",
    JSON.stringify(spec, null, 2) + "\n",
    { flag: "wx" },
  );
  return spec;
}
if (
  process.argv[1] &&
  import.meta.url === new URL("file://" + process.argv[1]).href
) {
  const s = await freezeArticle(process.argv[2], process.argv[3]);
  console.log(
    JSON.stringify({
      htmlPath: s.htmlPath,
      htmlSha256: s.htmlSha256,
      textCharacters: s.texts.map((t) => t.length),
      glyphs: s.glyphs.length,
      sourceRevision: s.sourceRevision,
    }),
  );
}

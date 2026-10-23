import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { texts as originalTexts } from "./article.mjs";
import { texts as shorterTexts } from "./article-v2.mjs";
import { partition } from "./article-v4.mjs";
import {
  construct,
  verifyCanonical,
  PAYLOAD,
} from "../design/padding-solver.mjs";

const sha = (b) => createHash("sha256").update(b).digest("hex");
const esc = (s) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
export function layoutPhase(options) {
  const { squareFinder, alignment, bodyGray, stroke } = options;
  assert(
    squareFinder && alignment,
    "Actual calibrated native full-size resources required",
  );
  assert(["▣", "▩"].includes(squareFinder.symbol));
  assert(
    squareFinder.noScale === true,
    "Do not transfer an unmeasured font size",
  );
  assert([180, 204, 228, 232].includes(bodyGray));
  assert([0.75, 1].includes(stroke));
  for (const m of [squareFinder, alignment]) {
    assert(m.resourcePath && m.resourceSha256 && m.font && m.expectedFont);
    assert(m.inkBounds.length === 4 && m.cssOrigin.length === 2);
  }
  const texts = [
    shorterTexts[0]
      .replaceAll("◉", squareFinder.symbol)
      .replace("three round ornaments", "three square ornaments"),
    shorterTexts[1],
    shorterTexts[2]
      .replaceAll("◉", squareFinder.symbol)
      .replace(" Our closing marker is in view: ", " Our closing marker: "),
  ];
  const n = 25,
    advance = 9.6328125,
    unit = 4 * advance,
    origin = 4 * unit;
  const width = Math.ceil((n + 8) * unit),
    bodySize = 16,
    bodyCenter = advance;
  const shadow = 1.5,
    margin = 2 + 3 * shadow + stroke;
  verifyCanonical(2, "Q", 1);
  const encoded = construct(2, "Q", 1);
  const glyphs = [],
    rows = [],
    justification = [];
  const addOrnament = (p, index, center, measure, modules, role) => {
    const [bx, by, bw, bh] = measure.inkBounds;
    const scale =
      measure.noScale === true ? 1 : (modules * unit) / Math.max(bw, bh);
    glyphs.push({
      p,
      index,
      ch: texts[p][index],
      x: center.x - (bx + bw / 2 - measure.cssOrigin[0]) * scale,
      y: center.y - (by + bh / 2 - measure.cssOrigin[1]) * scale,
      font: measure.font,
      size: measure.size * scale,
      role,
      gray: 0,
      shadow: 0,
      stroke: 0,
      center,
      modules,
      resourcePath: measure.resourcePath,
      resourceSha256: measure.resourceSha256,
      nativeScale: scale,
      nominalInkBounds: {
        left: center.x - (bw * scale) / 2,
        top: center.y - (bh * scale) / 2,
        width: bw * scale,
        height: bh * scale,
      },
    });
  };
  const corners = [
    { x: origin + 3.5 * unit, y: origin + 3.5 * unit },
    { x: origin + (n - 3.5) * unit, y: origin + 3.5 * unit },
    { x: origin + 3.5 * unit, y: origin + (n - 3.5) * unit },
  ];
  addOrnament(0, 0, corners[0], squareFinder, 7, "section-ornament-start");
  addOrnament(
    0,
    texts[0].length - 1,
    corners[1],
    squareFinder,
    7,
    "section-ornament-end",
  );
  addOrnament(2, 0, corners[2], squareFinder, 7, "section-ornament-closing");
  const markerIndex = texts[2].indexOf("⊙"),
    markerCenter = { x: origin + 18.5 * unit, y: origin + 18.5 * unit };
  addOrnament(
    2,
    markerIndex,
    markerCenter,
    alignment,
    5,
    "named-alignment-marker",
  );
  const marker = glyphs.at(-1).nominalInkBounds;
  const phase = origin + 0.75 * advance;
  const slot = (p, line, cy, x0, x1) => {
    const first = Math.ceil((x0 + margin - phase) / advance);
    const end = Math.floor((x1 - margin - phase) / advance);
    return {
      p,
      line,
      cy,
      x0,
      x1,
      first,
      end,
      capacity: Math.max(0, end - first),
    };
  };
  const band = (p, count, firstY, left, right) => {
    const result = [];
    for (let i = 0; i < count; i++) {
      const cy = origin + (firstY + 0.5 * i) * unit;
      const x0 = p === 1 && i === count - 1 ? origin + 8 * unit : left;
      if (
        p !== 0 &&
        cy + 17 + stroke >= marker.top &&
        cy - 17 - stroke <= marker.top + marker.height
      ) {
        result.push(slot(p, i, cy, x0, marker.left - margin));
        result.push(slot(p, i, cy, marker.left + marker.width + margin, right));
      } else result.push(slot(p, i, cy, x0, right));
    }
    return result;
  };
  const p0 = band(0, 15, 0.5, origin + 8 * unit, origin + 17 * unit);
  const p1 = band(1, 19, 8.5, origin, origin + n * unit);
  const p2 = band(2, 13, 18.5, origin + 8 * unit, origin + n * unit);
  const putRow = (r, fixedLeft = false) => {
    rows.push({ ...r, indices: undefined });
    if (!r.indices.length) return;
    const chars = r.indices.map((i) => texts[r.p][i]);
    let first = 0,
      last = chars.length - 1;
    while (first <= last && !chars[first].trim()) first++;
    while (last >= first && !chars[last].trim()) last--;
    const spaces = chars
      .map((ch, i) => (ch === " " && i >= first && i < last ? i : -1))
      .filter((i) => i >= 0);
    const natural = last - first + 1;
    const extra = fixedLeft
      ? 0
      : Math.min(spaces.length, Math.max(0, r.capacity - natural));
    const expanded = new Set(spaces.slice(0, extra));
    const start = fixedLeft ? r.first - first : r.end - natural - extra - first;
    let usedExtra = 0;
    for (let i = 0; i < chars.length; i++) {
      const x = phase + (start + i + usedExtra) * advance,
        y = r.cy - bodyCenter;
      const mx = Math.floor((x + advance / 2 - origin) / unit),
        my = Math.floor((y + bodyCenter - origin) / unit);
      const target =
        mx >= 0 && my >= 0 && mx < n && my < n ? encoded.matrix[my][mx] : 1;
      glyphs.push({
        p: r.p,
        index: r.indices[i],
        ch: chars[i],
        x,
        y,
        line: r.line,
        role: "body",
        font: "Menlo-Bold",
        size: bodySize,
        gray: target ? 0 : bodyGray,
        stroke,
        shadow,
        module: { x: mx, y: my, target },
      });
      if (expanded.has(i)) usedExtra++;
    }
    justification.push({
      p: r.p,
      line: r.line,
      nativeAdvance: advance,
      expandedSourceSpaceIndices: [...expanded].map((i) => r.indices[i]),
      maximumSpaceAdvance: 2 * advance,
      horizontalPhase: 0.75 * advance,
      nativeLeading: unit / 2,
    });
  };
  partition(
    Array.from({ length: texts[0].length - 2 }, (_, i) => i + 1),
    texts[0],
    p0,
  ).forEach((r) => putRow(r));
  partition(
    Array.from({ length: texts[1].length }, (_, i) => i),
    texts[1],
    p1,
  ).forEach((r) => putRow(r));
  const prefix = Array.from({ length: markerIndex - 1 }, (_, i) => i + 1);
  assert(prefix.length <= p2[0].capacity);
  putRow(
    {
      ...p2[0],
      indices: prefix,
      text: prefix.map((i) => texts[2][i]).join(""),
    },
    true,
  );
  partition(
    Array.from(
      { length: texts[2].length - markerIndex - 1 },
      (_, i) => markerIndex + i + 1,
    ),
    texts[2],
    p2.slice(1),
  ).forEach((r) => putRow(r));
  glyphs.sort((a, b) => a.p - b.p || a.index - b.index);
  for (let p = 0; p < 3; p++) {
    const gs = glyphs.filter((g) => g.p === p);
    assert.equal(gs.map((g) => g.ch).join(""), texts[p]);
    assert.equal(new Set(gs.map((g) => g.index)).size, texts[p].length);
  }
  const fonts = [...new Set(glyphs.map((g) => g.font))];
  const paragraphs = texts
    .map(
      (t, p) =>
        `<p class="prose" id="p${p}">${glyphs
          .filter((g) => g.p === p)
          .map((g) => {
            const c = `rgb(${g.gray},${g.gray},${g.gray})`;
            return `<span id="g-${p}-${g.index}" data-index="${g.index}" data-role="${g.role}" data-font="${g.font}" style="left:${g.x}px;top:${g.y}px;font-family:'${g.font}';font-size:${g.size}px;line-height:${g.role === "body" ? 1 : 1.2};color:${c};-webkit-text-stroke:${g.stroke}px currentColor;text-shadow:0 0 ${g.shadow}px ${c}">${esc(g.ch)}</span>`;
          })
          .join("")}</p>`,
    )
    .join("");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Native phase-locked continuous prose with actual square ornaments</title><style>${fonts.map((f) => `@font-face{font-family:'${f}';src:local('${f}')}`).join("")}html,body{margin:0;background:white}#artifact{position:relative;width:${width}px;height:${width}px;background:white}p{margin:0}span{position:absolute;white-space:pre;font-kerning:none;font-variant-ligatures:none;letter-spacing:0}</style></head><body><article id="artifact">${paragraphs}</article></body></html>`;
  return {
    html,
    spec: {
      schema: "aqrobat.phase-locked-square-native-prose.v1",
      kind: "native",
      payloadTrial: true,
      width,
      height: width,
      texts,
      fullText: texts.join("\n\n"),
      separatorPolicy: "Two LF between real paragraphs",
      glyphs,
      rows,
      justification,
      expectedFonts: fonts,
      geometry: {
        version: 2,
        dimension: n,
        unit,
        origin,
        counters: corners,
        alignment: markerCenter,
      },
      options: {
        ...options,
        advance,
        bodySize,
        shadow,
        bodyCenterFromTop: bodyCenter,
        nativeLeading: unit / 2,
      },
      htmlSha256: sha(html),
      sourceRevision: "phase-locked-native-square-prose-v2",
      target: {
        payload: PAYLOAD,
        version: 2,
        ecc: "Q",
        mask: 1,
        padding: "canonical",
        matrix: encoded.matrix,
        map: encoded.map,
        ownership: encoded.ownership,
        dataCodewords: encoded.code.dataCodewords,
        interleavedCodewords: encoded.code.interleavedCodewords,
        matrixSha256: sha(JSON.stringify(encoded.matrix)),
      },
      readingOrderContract:
        "Continuous whole words in source paragraph order; actual Unicode ornaments are visibly named and selected. All source characters appear once. Actual word spaces may occupy one or two native advances; letter advance and half-module leading stay fixed. No tiles, graphics, duplicate text or clipped native ink.",
      allowReadWithoutStrictGate:
        "Only an explicitly preregistered failed-gate exploratory payload trial under the unchanged allocation; no acceptance claim from this flag.",
      unverified: [
        "Actual mixed native foreground support and adaptive dependencies",
        "full-source firstselected geometry",
        "ordinary recovery",
        "owner readability",
        "portable styled copy, phone, nativeapp and physicalprint",
      ],
    },
  };
}

export async function freezePhase(optionsPath, out) {
  assert(
    out.startsWith("docs/research/prose-qr/integrated-2026-10-10/mechanism/"),
  );
  const raw = await readFile(optionsPath),
    { html, spec } = layoutPhase(JSON.parse(raw));
  await mkdir(out);
  const htmlPath = out + "/source.html.txt";
  await writeFile(htmlPath, html, { flag: "wx" });
  const paths = [
    "experiments/prose-qr/integrated-2026-10-10/mechanism/article-phase-v2.mjs",
    "experiments/prose-qr/integrated-2026-10-10/mechanism/article.mjs",
    "experiments/prose-qr/integrated-2026-10-10/mechanism/article-v2.mjs",
    "experiments/prose-qr/integrated-2026-10-10/mechanism/article-v4.mjs",
    "experiments/prose-qr/integrated-2026-10-10/design/padding-solver.mjs",
    "vendor/qrcodegen.mjs",
    optionsPath,
  ];
  const sourceHashes = Object.fromEntries(
    await Promise.all(paths.map(async (p) => [p, sha(await readFile(p))])),
  );
  const frozen = {
    ...spec,
    htmlPath,
    sourceHashes,
    frozenAtUtc: new Date().toISOString(),
  };
  await writeFile(
    out + "/source-spec.json",
    JSON.stringify(frozen, null, 2) + "\n",
    { flag: "wx" },
  );
  return frozen;
}

if (
  process.argv[1] &&
  import.meta.url === new URL("file://" + process.argv[1]).href
) {
  const s = await freezePhase(process.argv[2], process.argv[3]);
  console.log(
    JSON.stringify({
      htmlPath: s.htmlPath,
      htmlSha256: s.htmlSha256,
      characters: s.glyphs.length,
      rows: s.rows.length,
    }),
  );
}

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import {
  construct,
  verifyCanonical,
  PAYLOAD,
} from "../design/padding-solver.mjs";

export const texts = [
  "◉ One page can hold two readings. A person follows the words in their ordinary order and finds an account of a small library. A camera follows the pattern of light and dark ink. The librarian wants both readings to belong to the same page. She keeps the sentences whole, leaves every mark visible, and gives the three round ornaments a simple role: they frame the opening paragraph and introduce the closing paragraph. ◉",
  "Each morning the librarian opens a window and sets a book on the long wooden table. The room is quiet enough to hear a page turn. One day a visitor brings a camera and asks whether the page could carry a second, very short message. The librarian writes https://example.com/ on a separate card as the exact address to preserve. The final slash matters because an experiment must keep the message it was given. She returns to the page and considers its ordinary materials: letters, spaces, native fonts, visible color, and a plain white background. A darker word is still a word. A lighter word must remain visible enough for a person to read. No hidden picture can take the place of the writing. The visitor suggests changing the shape of every letter. She prefers to keep familiar forms and normal words. The lines may bend around a large ornament, as text has long bent around a drop capital, but the account must remain coherent. Every source character must appear once. A selection should recover each paragraph and the whole page with the declared separators. These requirements give the experiment its useful difficulty. The camera will make its own choice about where to look and how to separate light from dark. A prediction at a chosen point cannot speak for that choice. The librarian therefore keeps the original source and records the unchanged input before asking any reader for an answer. If a reader finds nothing, the empty result remains in the record. If a reader finds a different message, the experiment stops. Neither outcome changes the sentence that the person has just read.",
  "◉ Our closing marker is in view: ⊙ It names a shared point in this account rather than replacing a letter. The three larger ornaments give the page a beginning, a closing frame, and a final entry. All four symbols remain visible and selected. The librarian closes the book when the room grows dim. She keeps the evidence beside the source, including failed predictions and any tests that were never reached. The visitor leaves with the same address on the card and a clearer question about the page. Tomorrow they may have a useful result, or a carefully bounded failure. Either way, the words should survive.",
];
export const SEPARATORS = "\n\n";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const esc = (s) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

// This API does arithmetic on supplied native measurements. It never measures,
// captures, launches an app, binarizes, locates, reads or changes the encoder.
export function layoutArticle(options) {
  const {
    version = 2,
    ecc = "M",
    mask = 0,
    advance = 9.6328125,
    bodySize = 16,
    bodyGray = 180,
    shadow = 1.5,
    bodyCenterFromTop = 9.6328125,
    finder,
    alignment,
  } = options;
  assert(
    finder && alignment,
    "Supply full native resource measurements; do not invent geometry",
  );
  for (const m of [finder, alignment]) {
    assert(m.resourcePath && m.resourceSha256 && m.font && m.expectedFont);
    assert(m.symbol === (m === finder ? "◉" : "⊙"));
    assert(Number.isFinite(m.size) && m.size > 0 && m.inkBounds?.length === 4);
    assert(m.cssOrigin?.length === 2);
  }
  assert(version >= 2 && version <= 6);
  assert(
    bodyGray >= 128 && bodyGray <= 204,
    "No white, transparent, or nearly white source state",
  );
  verifyCanonical(version, ecc, mask);
  const encoded = construct(version, ecc, mask),
    n = encoded.matrix.length,
    pitch = 4 * advance,
    origin = 4 * pitch,
    lineHeight = pitch / 2,
    side = n * pitch,
    width = Math.ceil((n + 8) * pitch),
    height = width;
  const positions = [],
    rows = [];
  const put = (
    p,
    index,
    x,
    y,
    role = "body",
    font = "Menlo-Bold",
    size = bodySize,
    extra = {},
  ) =>
    positions.push({
      p,
      index,
      ch: texts[p][index],
      x,
      y,
      role,
      font,
      size,
      ...extra,
    });
  const placeOrnament = (p, index, center, modules, measure, role) => {
    assert.equal(texts[p][index], measure.symbol);
    const [bx, by, bw, bh] = measure.inkBounds;
    const scale = (modules * pitch) / Math.max(bw, bh);
    put(
      p,
      index,
      center.x - (bx + bw / 2 - measure.cssOrigin[0]) * scale,
      center.y - (by + bh / 2 - measure.cssOrigin[1]) * scale,
      role,
      measure.font,
      measure.size * scale,
      {
        scale,
        resourcePath: measure.resourcePath,
        resourceSha256: measure.resourceSha256,
        nominalInkBounds: {
          left: center.x - (bw * scale) / 2,
          top: center.y - (bh * scale) / 2,
          width: bw * scale,
          height: bh * scale,
        },
        center,
        modules,
      },
    );
  };
  const corners = [
    { x: origin + 3.5 * pitch, y: origin + 3.5 * pitch },
    { x: origin + (n - 3.5) * pitch, y: origin + 3.5 * pitch },
    { x: origin + 3.5 * pitch, y: origin + (n - 3.5) * pitch },
  ];
  placeOrnament(0, 0, corners[0], 7, finder, "section-ornament-start");
  placeOrnament(
    0,
    texts[0].length - 1,
    corners[1],
    7,
    finder,
    "section-ornament-end",
  );
  placeOrnament(2, 0, corners[2], 7, finder, "section-ornament-closing");
  const alignmentIndex = texts[2].indexOf("⊙");
  // Native glyph stays at its source position after a complete opening clause.
  // The clause occupies the first left segment beside the marker. Later prose
  // wraps around the complete marker envelope without clipping or overlap.
  const ap = n - 7,
    alignmentCenter = {
      x: origin + (ap + 0.5) * pitch,
      y: origin + (ap + 0.5) * pitch,
    };
  placeOrnament(
    2,
    alignmentIndex,
    alignmentCenter,
    5,
    alignment,
    "named-alignment-marker",
  );
  const slots = (line, x0, x1) => ({
    line,
    x0,
    x1,
    capacity: Math.floor((x1 - x0) / advance) - 1,
  });
  const p0slots = Array.from({ length: 14 }, (_, line) =>
    slots(line, origin + 8 * pitch, origin + (n - 8) * pitch),
  );
  const p1slots = Array.from({ length: 2 * (n - 16) }, (_, i) =>
    slots(16 + i, origin, origin + side),
  );
  const p2slots = [];
  const bottomLine = 2 * (n - 7);
  for (let line = bottomLine; line <= 2 * n - 2; line++) {
    const midY = origin + line * lineHeight + pitch / 2;
    const marker = positions.find(
      (g) => g.role === "named-alignment-marker",
    ).nominalInkBounds;
    if (
      midY >= marker.top - pitch / 2 &&
      midY <= marker.top + marker.height + pitch / 2
    ) {
      p2slots.push(slots(line, origin + 8 * pitch, origin + (ap - 2) * pitch));
      p2slots.push(slots(line, origin + (ap + 3) * pitch, origin + side));
    } else p2slots.push(slots(line, origin + 8 * pitch, origin + side));
  }
  const fill = (p, indices, available) => {
    let cursor = 0;
    for (const slot of available) {
      if (cursor === indices.length) break;
      assert(slot.capacity > 0);
      let take = Math.min(slot.capacity, indices.length - cursor);
      if (cursor + take < indices.length) {
        const chars = indices
          .slice(cursor, cursor + take)
          .map((i) => texts[p][i])
          .join("");
        const last = chars.lastIndexOf(" ");
        if (last >= 0) take = last + 1;
        else {
          const remainder = indices
            .slice(cursor)
            .map((i) => texts[p][i])
            .join("");
          assert(
            remainder.split(" ")[0].length <= slot.capacity,
            "Word cannot fit; do not split it or silently shrink",
          );
        }
      }
      const used = indices.slice(cursor, cursor + take);
      const startX = slot.x0 + (3 * advance) / 4;
      for (let col = 0; col < used.length; col++)
        put(
          p,
          used[col],
          startX + col * advance,
          origin + slot.line * lineHeight + pitch / 2 - bodyCenterFromTop,
          "body",
          "Menlo-Bold",
          bodySize,
          { line: slot.line },
        );
      rows.push({
        p,
        line: slot.line,
        startIndex: used[0],
        endIndex: used.at(-1),
        startX,
        capacity: slot.capacity,
        text: used.map((i) => texts[p][i]).join(""),
      });
      cursor += take;
    }
    assert.equal(
      cursor,
      indices.length,
      `Paragraph${p} overflow; reject instead of shorten`,
    );
  };
  fill(
    0,
    Array.from({ length: texts[0].length - 2 }, (_, i) => i + 1),
    p0slots,
  );
  fill(
    1,
    Array.from({ length: texts[1].length }, (_, i) => i),
    p1slots,
  );
  // The first complete clause is deliberately frozen at its normal reading
  // position left of the real marker. Then subsequent lines use both sides.
  const clause = Array.from({ length: alignmentIndex - 1 }, (_, i) => i + 1);
  const firstLeft = p2slots[0];
  assert(
    clause.length <= firstLeft.capacity + 1,
    "The opening clause must fit before its marker",
  );
  for (let col = 0; col < clause.length; col++)
    put(
      2,
      clause[col],
      firstLeft.x0 - advance / 2 + col * advance,
      origin + firstLeft.line * lineHeight + pitch / 2 - bodyCenterFromTop,
      "body",
      "Menlo-Bold",
      bodySize,
      { line: firstLeft.line },
    );
  const after = Array.from(
    { length: texts[2].length - alignmentIndex - 1 },
    (_, i) => alignmentIndex + i + 1,
  );
  fill(2, after, p2slots.slice(1));
  positions.sort((a, b) => a.p - b.p || a.index - b.index);
  for (let p = 0; p < 3; p++) {
    const g = positions.filter((a) => a.p === p);
    assert.equal(g.map((a) => a.ch).join(""), texts[p]);
    assert.equal(new Set(g.map((a) => a.index)).size, texts[p].length);
  }
  const fonts = [...new Set(positions.map((g) => g.font))];
  const glyphs = positions.map((g) => {
    const mx = Math.floor((g.x + advance / 2 - origin) / pitch),
      my = Math.floor((g.y + bodyCenterFromTop - origin) / pitch);
    const bit =
      g.role === "body" && mx >= 0 && my >= 0 && mx < n && my < n
        ? encoded.matrix[my][mx]
        : 1;
    const value = bit ? 0 : bodyGray;
    return {
      ...g,
      module: g.role === "body" ? { x: mx, y: my, target: bit } : null,
      gray: g.role === "body" ? value : 0,
      shadow: g.role === "body" ? shadow : 0,
    };
  });
  const paragraphs = texts
    .map(
      (text, p) =>
        `<p id="p${p}" class="prose">${glyphs
          .filter((g) => g.p === p)
          .map((g) => {
            const color = `rgb(${g.gray},${g.gray},${g.gray})`;
            return `<span id="g-${g.p}-${g.index}" data-index="${g.index}" data-role="${g.role}" data-font="${g.font}" style="left:${g.x}px;top:${g.y}px;font-family:'${g.font}';font-size:${g.size}px;line-height:${g.role === "body" ? 1 : 1.2};color:${color};text-shadow:0 0 ${g.shadow}px ${color}">${esc(g.ch)}</span>`;
          })
          .join("")}</p>`,
    )
    .join("");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>One page, two readings — continuous native prose</title><style>${fonts.map((f) => `@font-face{font-family:'${f}';src:local('${f}')}`).join("")}html,body{margin:0;background:white}#artifact{position:relative;width:${width}px;height:${height}px;background:white}p{margin:0}span{position:absolute;white-space:pre;font-kerning:none;font-variant-ligatures:none;letter-spacing:0}</style></head><body><article id="artifact">${paragraphs}</article></body></html>`;
  const spec = {
    schema: "aqrobat.continuous-native-prose.v1",
    kind: "native",
    purpose:
      "Unmeasured full-payload construction from continuous native prose foreground; actual source/glyph/selection/reader evidence required",
    payloadTrial: true,
    width,
    height,
    texts,
    fullText: texts.join(SEPARATORS),
    separatorPolicy:
      "Exactly two LF between semantic paragraphs; soft wraps insert no source LF. Every actual Unicode code point appears once and stays in paragraph/source order.",
    glyphs,
    rows,
    expectedFonts: [
      ...new Set(["Menlo-Bold", finder.expectedFont, alignment.expectedFont]),
    ],
    geometry: {
      version,
      dimension: n,
      unit: pitch,
      origin,
      counters: corners,
      alignment: alignmentCenter,
    },
    options: {
      version,
      ecc,
      mask,
      advance,
      bodySize,
      bodyGray,
      shadow,
      bodyCenterFromTop,
      finder,
      alignment,
    },
    nativeStyleContract:
      "The only matrix-directed property is foreground color (black or visible gray) and a same-color native text shadow. Every source glyph is whole; no background matrix, images, graphics, clipping, pseudo-element, opacity hiding, replacement glyph, duplicate text or target module rectangle.",
    readingOrderContract:
      "Opening prose is framed by two actual selected Unicode section ornaments; the closing paragraph begins with the third. Body prose uses normal monospaced words and lines. A real named marker appears after the closing paragraph opening clause, then text wraps around its full ink envelope. Owner readability is untested and is a source rejection condition.",
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
    allowReadWithoutStrictGate: true,
    unverified: [
      "Actual scaled native glyph geometry and full nonoverlap",
      "Every-record strict first-selected finder conjunction",
      "Native adaptive grayscale neighborhood coupling",
      "Portable text/styled clipboard/native-app fidelity",
      "Phone/physical print and owner readability",
    ],
  };
  return { html, spec };
}

export async function freezeArticle(optionsPath, output) {
  assert(
    output?.startsWith(
      "docs/research/prose-qr/integrated-2026-10-10/mechanism/",
    ),
  );
  const raw = await readFile(optionsPath),
    options = JSON.parse(raw),
    built = layoutArticle(options);
  await mkdir(output);
  await writeFile(output + "/source.html.txt", built.html, { flag: "wx" });
  const htmlPath = output + "/source.html.txt";
  const modulePath =
    "experiments/prose-qr/integrated-2026-10-10/mechanism/article-v3.mjs";
  const sourceHashes = {
    [optionsPath]: sha(raw),
    [modulePath]: sha(await readFile(modulePath)),
    "experiments/prose-qr/integrated-2026-10-10/design/padding-solver.mjs": sha(
      await readFile(
        "experiments/prose-qr/integrated-2026-10-10/design/padding-solver.mjs",
      ),
    ),
    "vendor/qrcodegen.mjs": sha(await readFile("vendor/qrcodegen.mjs")),
  };
  const spec = {
    ...built.spec,
    htmlPath,
    dir: output,
    sourceHashes,
    frozenAtUtc: new Date().toISOString(),
  };
  await writeFile(
    output + "/source-spec.json",
    JSON.stringify(spec, null, 2) + "\n",
    { flag: "wx" },
  );
  return spec;
}
if (
  process.argv[1] &&
  import.meta.url === new URL("file://" + process.argv[1]).href
) {
  const spec = await freezeArticle(process.argv[2], process.argv[3]);
  console.log(
    JSON.stringify({
      htmlPath: spec.htmlPath,
      htmlSha256: spec.htmlSha256,
      dimension: spec.geometry.dimension,
      paragraphCharacters: spec.texts.map((t) => t.length),
      glyphs: spec.glyphs.length,
    }),
  );
}

import { generate } from "../../../src/core.mjs";
import { STORY } from "../flow/layout.mjs";
import { escapeHtml } from "../layout.mjs";

// The atlas models real native glyph pixels. Only ordinary readers can establish
// recovery from the resulting native DOM capture; this solver never calls them.
export function composeStory(spec, atlas, finder) {
  const qr = generate(spec.payload, { ecc: spec.ecc, boost: false, stroke: 0 });
  const n = qr.modules,
    pitch = spec.pitch || 48,
    advance = Math.round(atlas.advance),
    pad = spec.quiet * pitch;
  const words = (spec.story || STORY).split(" ");
  const radius = spec.radius || 0;
  const gapMin = spec.gapMin ?? atlas.size / 5,
    gapMax = atlas.size;
  const centerX = pitch / 2 + (spec.centerX ?? -1);
  const centerY = pitch / 2 + (spec.centerY ?? -1);
  const pixels = (char, weight, x, y) =>
    atlas.glyphs[`${weight}|${char}`]?.[y]?.[x] ?? 255;
  const targetsFor = (row, a, b) =>
    Array.from({ length: b - a }, (_, i) => ({
      x: (a + i) * pitch + centerX,
      wanted: qr.matrix[row][a + i],
      col: a + i,
    }));
  let cursor = 0;
  const lines = [],
    fragments = [],
    ledger = [];
  for (let row = 0; row < n; row++) {
    let a = 0,
      b = n;
    if (row < 8) {
      a = 8;
      b = n - 8;
    } else if (row >= n - 8) a = 8;
    const left = a * pitch,
      right = b * pitch;
    const reserved =
      spec.alignment && n > 21 && row >= n - 9 && row < n - 4
        ? [
            (n - 9) * pitch - (spec.alignmentGuard || 0),
            (n - 4) * pitch + (spec.alignmentGuard || 0),
          ]
        : null;
    const targets = targetsFor(row, a, b).filter(
      (t) => !reserved || t.x < reserved[0] || t.x >= reserved[1],
    );
    const gapCost = (x0, x1) =>
      targets.filter((t) => t.x >= x0 && t.x < x1 && t.wanted).length;
    let selected = null;
    for (
      let sampleY = spec.sampleMin ?? Math.round(atlas.size * 0.4);
      sampleY <= (spec.sampleMax ?? Math.round(atlas.size * 0.8));
      sampleY++
    ) {
      const costCache = new Map();
      const wordCost = (word, start) => {
        const key = word + "|" + start;
        if (costCache.has(key)) return costCache.get(key);
        const end = start + word.length * advance;
        if (reserved && start < reserved[1] && end > reserved[0])
          return Infinity;
        let misses = 0;
        for (const t of targets) {
          if (t.x < start || t.x >= end) continue;
          const c = Math.floor((t.x - start) / advance),
            local = t.x - start - c * advance;
          let failed = false;
          const offsets =
            spec.patch ||
            Array.from({ length: radius * 2 + 1 }, (_, dy) =>
              Array.from({ length: radius * 2 + 1 }, (_, dx) => [
                dx - radius,
                dy - radius,
              ]),
            ).flat();
          for (const [dx, dy] of offsets) {
            const value = pixels(
              word[c],
              t.wanted ? 700 : 400,
              local + dx,
              sampleY + dy,
            );
            if (t.wanted ? value > spec.darkMax : value < spec.lightMin)
              failed = true;
          }
          if (failed) misses++;
        }
        costCache.set(key, misses);
        return misses;
      };
      let states = new Map([
        [left, { end: left, misses: 0, spaceCost: 0, positions: [] }],
      ]);
      for (let count = 0; count < 40; count++) {
        const word = words[(cursor + count) % words.length];
        const next = new Map();
        for (const previous of states.values()) {
          const lo = count === 0 ? 0 : gapMin,
            hi = count === 0 ? advance : gapMax;
          const gaps = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
          if (reserved && previous.end <= reserved[0])
            for (let extra = 0; extra <= advance; extra++)
              gaps.push(reserved[1] - previous.end + extra);
          for (const gap of gaps) {
            const start = previous.end + gap,
              end = start + word.length * advance;
            if (end > right) continue;
            const misses =
              previous.misses +
              gapCost(previous.end, start) +
              wordCost(word, start);
            if (!Number.isFinite(misses)) continue;
            const spaceCost =
              previous.spaceCost +
              (count === 0 ? gap : Math.abs(gap - advance));
            const existing = next.get(end);
            if (
              !existing ||
              misses < existing.misses ||
              (misses === existing.misses && spaceCost < existing.spaceCost)
            )
              next.set(end, {
                end,
                misses,
                spaceCost,
                positions: [...previous.positions, { word, start, gap }],
              });
          }
        }
        if (!next.size) break;
        for (const state of next.values()) {
          const misses = state.misses + gapCost(state.end, right);
          const score =
            misses * 1000000 + state.spaceCost * 2 + (right - state.end) * 0.1;
          if (!selected || score < selected.score)
            selected = { ...state, misses, score, sampleY };
        }
        states = next;
      }
    }
    if (!selected) throw Error("No whole-word layout fits");
    const text = selected.positions.map((p) => p.word).join(" ");
    lines.push(text);
    cursor += selected.positions.length;
    const top = row * pitch + centerY - selected.sampleY;
    let markup = "";
    for (let wi = 0; wi < selected.positions.length; wi++) {
      const pos = selected.positions[wi];
      let inner = "";
      for (let ci = 0; ci < pos.word.length; ci++) {
        const x = pos.start + ci * advance;
        const t = targets.find((t) => t.x >= x && t.x < x + advance);
        const dark = t
          ? t.wanted
          : qr.matrix[row][
              Math.min(n - 1, Math.floor((x + advance / 2) / pitch))
            ];
        const shade = dark ? 0 : spec.gray;
        inner += `<span style="font-weight:${dark ? 700 : 400};color:rgb(${shade},${shade},${shade});-webkit-text-stroke:${dark ? (atlas.stroke ?? 0.7) : 0}px currentColor;paint-order:stroke fill">${escapeHtml(pos.word[ci])}</span>`;
      }
      if (wi < selected.positions.length - 1) inner += " ";
      markup += `<span class="word" style="position:absolute;left:${pos.start - left}px;top:0;white-space:pre">${inner}</span>`;
    }
    fragments.push(
      `<span class="line" style="position:absolute;display:block;left:${left}px;top:${top}px;height:${atlas.lineHeight}px;line-height:${atlas.lineHeight}px;white-space:pre">${markup}</span>`,
    );
    ledger.push({
      row,
      left,
      right,
      top,
      sampleY: selected.sampleY,
      misses: selected.misses,
      positions: selected.positions,
      targets,
      reserved,
    });
  }
  const glyphs = [];
  const [bx, by, bw, bh] = finder.inkBounds;
  const scale = (7 * pitch) / Math.max(bw, bh);
  for (const [cx, cy] of [
    [3.5, 3.5],
    [n - 3.5, 3.5],
    [3.5, n - 3.5],
  ]) {
    if (finder.parts) {
      for (const [i, part] of finder.parts.entries()) {
        const target = (i === 0 ? 7 : 3) * pitch;
        const [px, py, pw, ph] = part.inkBounds;
        const stroke = i === 0 ? spec.cornerStroke : 0;
        const sw = pw + stroke;
        const sh = ph + stroke;
        const s = target / Math.max(sw, sh);
        const x = pad + cx * pitch - (px - part.origin[0] + pw / 2) * s;
        const y =
          pad +
          cy * pitch -
          (py - part.origin[1] + ph / 2) * s +
          (i === 0 ? 2 : 1);
        glyphs.push(
          `<span class="ornament" style="position:absolute;left:${x}px;top:${y}px;font:400 ${part.size * s}px/1 '${part.font}';color:black;-webkit-text-stroke:${stroke * s}px currentColor;paint-order:stroke fill">${part.symbol}</span>`,
        );
      }
      continue;
    }
    const x = pad + cx * pitch - (bx - finder.origin[0] + bw / 2) * scale;
    const y = pad + cy * pitch - (by - finder.origin[1] + bh / 2) * scale + 2;
    glyphs.push(
      `<span class="ornament" style="position:absolute;left:${x}px;top:${y}px;font:400 ${finder.size * scale}px/1 '${finder.font}';color:black;-webkit-text-stroke:${finder.stroke * scale}px currentColor;paint-order:stroke fill">${finder.symbol}</span>`,
    );
  }
  if (spec.alignment && n > 21) {
    if (!finder.parts)
      throw Error("Native alignment requires explicit corner parts");
    const cx = n - 6.5,
      cy = n - 6.5;
    for (const [i, part] of finder.parts.entries()) {
      const target = (i === 0 ? 5 : 1) * pitch;
      const [px, py, pw, ph] = part.inkBounds;
      const stroke = i === 0 ? 24.25 : 0;
      const s = target / Math.max(pw + stroke, ph + stroke);
      const x = pad + cx * pitch - (px - part.origin[0] + pw / 2) * s;
      const y =
        pad +
        cy * pitch -
        (py - part.origin[1] + ph / 2) * s +
        (i === 0 ? 2 : 1);
      glyphs.push(
        `<span class="ornament alignment" style="position:absolute;left:${x}px;top:${y}px;font:400 ${part.size * s}px/1 '${part.font}';color:black;-webkit-text-stroke:${stroke * s}px currentColor;paint-order:stroke fill">${part.symbol}</span>`,
      );
    }
  }
  const markup = `<article id="artifact" style="position:relative;box-sizing:content-box;width:${n * pitch}px;height:${n * pitch}px;padding:${pad}px;background:white;color:black"><pre id="text-body" style="position:relative;margin:0;padding:0;width:${n * pitch}px;height:${n * pitch}px;font:400 ${atlas.size}px/${atlas.lineHeight}px 'Courier New',monospace;font-kerning:none;font-variant-ligatures:none">${fragments.join("\n")}</pre>${glyphs.join("")}</article>`;
  const minLineSeparation = Math.min(
    ...ledger.slice(1).map((r, i) => r.top - ledger[i].top),
  );
  const maxGlyphHeight = Math.max(
    ...Object.values(atlas.glyphs).map((p) => {
      const ys = p
        .map((r, y) => (r.some((v) => v < 254) ? y : -1))
        .filter((y) => y >= 0);
      return ys.length ? Math.max(...ys) - Math.min(...ys) + 1 : 0;
    }),
  );
  return {
    spec,
    markup,
    lines,
    plainText: lines.join("\n"),
    matrix: qr.matrix,
    modules: n,
    unit: pitch,
    side: (n + 2 * spec.quiet) * pitch,
    constructionLedger: ledger,
    structural: {
      fontSize: atlas.size,
      lineHeightEm: pitch / atlas.size,
      maxOpticalHeightToLineHeight: maxGlyphHeight / minLineSeparation,
      maxGlyphHeight,
      minLineSeparation,
      emptyLines: 0,
      wordGaps: [gapMin, gapMax],
      roundedAdvance: advance,
      measuredAdvance: atlas.advance,
      modeledMisses: ledger.reduce((s, r) => s + r.misses, 0),
      centerOffsets: [centerX - pitch / 2, centerY - pitch / 2],
      ornaments: spec.alignment && n > 21 ? 4 : 3,
      ornamentCharacters:
        (finder.parts ? 6 : 3) + (spec.alignment && n > 21 ? 2 : 0),
      hiddenModules: false,
      selection: "Real spaces between words and newlines between lines",
    },
  };
}

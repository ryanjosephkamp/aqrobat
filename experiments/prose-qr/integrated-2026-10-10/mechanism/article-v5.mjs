import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { layoutArticle as previousLayout, texts } from "./article-v4.mjs";
export { texts };
const sha = (b) => createHash("sha256").update(b).digest("hex");
const esc = (s) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
export function layoutArticle(options) {
  const { spec: previous } = previousLayout(options),
    spec = structuredClone(previous),
    { advance, bodyCenterFromTop, shadow, bodyGray } = spec.options,
    { origin, unit, dimension: n } = spec.geometry,
    margin = 2 + 3 * shadow,
    receipts = [];
  for (const row of spec.rows) {
    if (!row.text.trim()) continue;
    const gs = spec.glyphs
      .filter(
        (g) =>
          g.role === "body" &&
          g.p === row.p &&
          g.line === row.line &&
          g.x >= row.x0 &&
          g.x < row.x1,
      )
      .sort((a, b) => a.index - b.index);
    assert.equal(
      gs.map((g) => g.ch).join(""),
      row.text,
      "Row ownership must preserve actual words",
    );
    let last = gs.length - 1;
    while (last >= 0 && !gs[last].ch.trim()) last--;
    if (last < 0) continue;
    let first = 0;
    while (first <= last && !gs[first].ch.trim()) first++;
    const spaces = gs.slice(first, last).filter((g) => g.ch === " ").length;
    const natural = (last - first + 1) * advance,
      available = row.x1 - row.x0 - 2 * margin;
    const extra = Math.max(0, available - natural),
      wordExtra = spaces ? Math.min(advance, extra / spaces) : 0;
    const width = natural + wordExtra * spaces;
    const start = row.x1 - margin - width - first * advance;
    let seen = 0;
    for (let i = 0; i < gs.length; i++) {
      gs[i].x = start + i * advance + seen * wordExtra;
      if (i >= first && i < last && gs[i].ch === " ") seen++;
    }
    receipts.push({
      p: row.p,
      line: row.line,
      startIndex: gs[0].index,
      endIndex: gs.at(-1).index,
      normalAdvance: advance,
      wordSpaceAdvance: advance + wordExtra,
      maximumNativeWordSpaceAdvance: 2 * advance,
      justification:
        "Full visible source words remain unchanged; actual inter-word spaces expand by at most one native advance. Short segments align right without stretching letters.",
      startX: gs[0].x,
      endOfLastNonspace: gs[last].x + advance,
    });
  }
  for (const g of spec.glyphs) {
    if (g.role !== "body") continue;
    const x = Math.floor((g.x + advance / 2 - origin) / unit),
      y = Math.floor((g.y + bodyCenterFromTop - origin) / unit),
      target =
        x >= 0 && y >= 0 && x < n && y < n ? spec.target.matrix[y][x] : 1;
    g.module = { x, y, target };
    g.gray = target ? 0 : bodyGray;
  }
  for (let p = 0; p < 3; p++)
    assert.equal(
      spec.glyphs
        .filter((g) => g.p === p)
        .map((g) => g.ch)
        .join(""),
      texts[p],
    );
  const fonts = [...new Set(spec.glyphs.map((g) => g.font))],
    ps = texts
      .map(
        (t, p) =>
          `<p id="p${p}" class="prose">${spec.glyphs
            .filter((g) => g.p === p)
            .map((g) => {
              const c = `rgb(${g.gray},${g.gray},${g.gray})`;
              return `<span id="g-${g.p}-${g.index}" data-index="${g.index}" data-role="${g.role}" data-font="${g.font}" style="left:${g.x}px;top:${g.y}px;font-family:'${g.font}';font-size:${g.size}px;line-height:${g.role === "body" ? 1 : 1.2};color:${c};text-shadow:0 0 ${g.shadow}px ${c}">${esc(g.ch)}</span>`;
            })
            .join("")}</p>`,
      )
      .join("");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>One page, two readings — native justified prose revision5</title><style>${fonts.map((f) => `@font-face{font-family:'${f}';src:local('${f}')}`).join("")}html,body{margin:0;background:white}#artifact{position:relative;width:${spec.width}px;height:${spec.height}px;background:white}p{margin:0}span{position:absolute;white-space:pre;font-kerning:none;font-variant-ligatures:none;letter-spacing:0}</style></head><body><article id="artifact">${ps}</article></body></html>`;
  return {
    html,
    spec: {
      ...spec,
      htmlSha256: sha(html),
      sourceRevision: "continuous-native-prose-v5",
      justification: receipts,
      amends:
        "Preserved article-v4 support-02 left12necessarybounds inconclusive. This pure typesetting revision keeps the exact v4prose and normal native letter advance, justifies actual source spaces by at most one advance, and right-aligns short line segments. It does not create text tiles, pixels, duplicated text, clipping or a patterned background. Native full-source measurement remains required.",
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
      "experiments/prose-qr/integrated-2026-10-10/mechanism/article-v5.mjs",
      "experiments/prose-qr/integrated-2026-10-10/mechanism/article-v4.mjs",
      "experiments/prose-qr/integrated-2026-10-10/mechanism/article-v3.mjs",
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
      paragraphCharacters: s.texts.map((t) => t.length),
      glyphs: s.glyphs.length,
      sourceRevision: s.sourceRevision,
    }),
  );
}

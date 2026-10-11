import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import assert from "node:assert/strict";
const root = resolve("docs/research/prose-qr/portable-story-2026-10-11");
const out = resolve(root, "native-document-01");
await mkdir(out);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const save = (n, v) =>
  writeFile(
    resolve(out, n),
    typeof v === "string" || Buffer.isBuffer(v)
      ? v
      : JSON.stringify(v, null, 2) + "\n",
    { flag: "wx" },
  );
const parent = resolve(root, "batch-03/body-12-24-2");
const layout = JSON.parse(await readFile(parent + "-layout.json")),
  metrics = JSON.parse(await readFile(parent + "-metrics.json"));
const s = layout.spec,
  leading = s.pitch / s.linesPerModule,
  field = layout.structural.field;
assert.equal(field, 600);
assert.equal(s.font, "Impact");
const esc = (t) => {
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
};
const wordWidth = (w) =>
  [...w].reduce((n, c) => n + metrics.glyphs[c].advance, 0);
const rows = [];
for (const [li, line] of layout.plainText.split("\n").entries()) {
  const words = line.split(" "),
    gap =
      (field - words.reduce((n, w) => n + wordWidth(w), 0)) /
      (words.length - 1);
  let x = 0;
  const runs = [];
  for (const [wi, word] of words.entries()) {
    let dx = 0;
    for (const c of word) {
      const a = metrics.glyphs[c].advance,
        col = Math.min(
          layout.modules - 1,
          Math.floor((x + dx + a / 2) / s.pitch),
        ),
        dark = layout.matrix[Math.floor(li / s.linesPerModule)][col];
      runs.push({ text: c, color: dark ? 0 : s.gray, weight: 400, x: x + dx });
      dx += a;
    }
    if (wi < words.length - 1)
      runs.push({ text: " ", color: 0, weight: 400, x: x + dx });
    x += wordWidth(word) + gap;
  }
  rows.push(runs);
}
const body = rows
  .map(
    (r) =>
      r.map((c) => `\\cf${c.color === 0 ? 1 : 2} ${esc(c.text)}`).join("") +
      "\\line\n",
  )
  .join("");
const rtf = `{\\rtf1\\ansi\\ansicpg1252\\deff0\\uc1{\\fonttbl{\\f0\\fnil Impact;}}{\\colortbl;\\red0\\green0\\blue0;\\red${s.gray}\\green${s.gray}\\blue${s.gray};}\\paperw12240\\paperh15840\\margl1620\\margr1620\\margt3420\\margb3240\\viewkind4\\pard\\qj\\sl-180\\slmult0\\fi0\\li0\\ri0\\sa0\\sb0\\f0\\fs18\\kerning0\\expndtw0\n${body}\\par}`;
await writeFile(resolve(root, "examples/page-impact.rtf"), rtf, { flag: "wx" });
await save(
  "source.mjs.txt",
  await readFile(new URL("document.mjs", import.meta.url)),
);
await save(
  "native-source.swift.txt.gz",
  gzipSync(await readFile(new URL("document.swift", import.meta.url))),
);
await save("manifest.json", {
  at: new Date().toISOString(),
  sourceHtmlArchiveSha256: sha(await readFile(parent + ".html.gz")),
  sourceTextSha256: sha(layout.plainText),
  rtfSha256: sha(rtf),
  font: "Impact",
  points: 9,
  lineHeightPoints: 9,
  bodyWidthPoints: 450,
  paperPoints: [612, 792],
  nativeCandidates: 2,
  immediateRepeats: 2,
  decoderCalls: 0,
  surfaces: [
    "AppKit RTF rendering at native96dpi",
    "PDFKit rendering of the actual selectable PDF at native96dpi",
  ],
  bounds:
    "All glyphs must fit the native text container; PDF must have one US Letter page and preserve the complete word sequence. No clipboard or receiving application is exercised.",
});
await save("expected.txt", layout.plainText);
console.log(
  JSON.stringify({
    rtf: resolve(root, "examples/page-impact.rtf"),
    nativeSurfaces: 2,
  }),
);

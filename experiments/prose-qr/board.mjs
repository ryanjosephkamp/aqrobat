import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { format } from "prettier";
import { buildLayout, documentHtml, SCALES } from "./layout.mjs";
const out = resolve("docs/research/prose-qr/pilot-02");
const rows = (await readFile(resolve(out, "results.jsonl"), "utf8"))
  .trim()
  .split("\n")
  .map((s) => JSON.parse(s));
const cases = [...new Map(rows.map((r) => [r.id, r])).values()];
const analysis = JSON.parse(
  await readFile(resolve(out, "final-analysis.json"), "utf8"),
);
const metrics = JSON.parse(
  await readFile(resolve(out, "metrics.json"), "utf8"),
);
const border = JSON.parse(
  await readFile(resolve(out, "border-metrics.json"), "utf8"),
);
const diag = JSON.parse(
  await readFile(resolve(out, "diagnostic-results.json"), "utf8"),
);
const ids = [
  "strict-021",
  "strict-022",
  "styled-020",
  "styled-056",
  "strict-url-1",
  "styled-url-1",
];
const selected = [];
for (const id of ids) {
  const r = cases.find((r) => r.id === id);
  if (!r) throw Error("Missing case " + id);
  const label = `${id} · ${r.spec.track === "strict" ? "Uniform text" : "Typography-assisted"} · ${r.spec.font}${r.spec.payload.startsWith("https") ? " · URL" : ""}`;
  const full =
    r.spec.track === "strict"
      ? r.spec.light === "words"
      : r.spec.lightRatio > 0;
  const c = {
    id,
    label,
    payload: r.spec.payload,
    plainText: r.layout.plainText,
    opticalRatio: analysis.readingMetrics.find((m) => m.id === id)
      .maximumOpticalInkHeightToLineHeight,
    description: `${r.spec.length}-letter words; dark palette ${r.layout.darkWords.join(", ")}. ${full ? "Light regions also contain real words." : "Light regions are blank; the QR shape is conspicuous."} This is a structural word layout, not a grammatical paragraph.`,
    frames: {},
    diagnostics: [],
  };
  for (const size of SCALES) {
    const s = r.scales.find((s) => s.size === size);
    const layout = buildLayout(r.spec, metrics, size);
    c.frames[size] = {
      png: (await readFile(resolve(out, s.path))).toString("base64"),
      htmlGzip: gzipSync(
        await format(documentHtml(layout.markup), { parser: "html" }),
        { mtime: 0 },
      ).toString("base64"),
      minimumBorder: border.find((b) => b.id === id && b.size === size)
        .minimumClearMargin,
    };
  }
  for (const d of diag.filter((d) => d.candidateId === id))
    c.diagnostics.push({
      label:
        d.processing.downsample > 1 ? "blur + downsample" : "blur + threshold",
      png: (await readFile(resolve(out, d.path))).toString("base64"),
      jsQR: d.decoders.jsQR.exact,
      zxing: d.decoders.zxing.exact,
    });
  selected.push(c);
}
const controls = [
  {
    payload: "AQROBAT-TEST",
    size: 320,
    png: (
      await readFile(resolve(out, "raw/control-positive-320.png"))
    ).toString("base64"),
    exact: true,
  },
];
try {
  const urlControls = JSON.parse(
    await readFile(resolve(out, "url-controls.json"), "utf8"),
  );
  const c = urlControls.find((c) => c.size === 320);
  controls.push({
    payload: c.payload,
    size: c.size,
    png: (await readFile(resolve(out, c.path))).toString("base64"),
    exact: c.decoders.jsQR.exact && c.decoders.zxing.exact,
  });
} catch {}
const data = {
  schema: "aqrobat-prose-review-board-v1",
  caseCount: analysis.caseCount,
  rawRasterCount: analysis.rawRasterCount,
  cases: selected,
  controls,
};
const template = await readFile(
  new URL("review-template.html", import.meta.url),
  "utf8",
);
const html = await format(
  template.replace(
    "__PILOT_DATA__",
    JSON.stringify(data).replaceAll("<", "\\u003c"),
  ),
  { parser: "html" },
);
const path = resolve(out, "../index.html");
await writeFile(path, html);
let size = 0;
async function walk(p) {
  for (const e of await readdir(p, { withFileTypes: true })) {
    const q = resolve(p, e.name);
    if (e.isDirectory()) await walk(q);
    else size += (await stat(q)).size;
  }
}
await walk(resolve(out, ".."));
if (size >= 50 * 1024 * 1024) throw Error("Evidence cap exceeded");
console.log(
  JSON.stringify({
    board: path,
    boardBytes: Buffer.byteLength(html),
    totalEvidenceBytes: size,
    selected: ids,
  }),
);

import { readFile, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { format } from "prettier";
const root = "docs/research/prose-qr/",
  session = root + "session-2026-10-09/",
  sha = (b) => createHash("sha256").update(b).digest("hex"),
  files = [];
const sourceNames = [
  "finder-runs",
  "finder-density",
  "finder-justify",
  "finder-density-size",
  "finder-reader-symbol",
  "prose-payload",
  "finder-page",
  "finder-font-page",
  "finder-word-constraint",
  "finder-source-translate",
  "finder-locator-aids",
  "finder-text-rhythm",
  "styled-gray-finders",
  "finder-dense-rows",
  "styled-gray-dense",
  "finder-combined-translate",
  "styled-gray-uppercase",
  "zbar-replay",
  "finder-pitch-alignment",
  "whole-word-payload",
  "finder-source-context",
  "finder-context-lexicon",
  "finder-native-enlargement",
];
const caps = [
  4, 6, 8, 8, 2, 8, 10, 10, 6, 8, 10, 6, 6, 6, 6, 2.5, 4, 8, 8, 8, 8, 8, 8,
].map((n) => n * 1e6);
async function walk(p) {
  for (const e of await readdir(p, { withFileTypes: true })) {
    const q = p + "/" + e.name;
    if (e.isDirectory()) await walk(q);
    else {
      const b = await readFile(q);
      files.push({ path: q, bytes: b.length, sha256: sha(b) });
    }
  }
}
const scopes = sourceNames.map((s, i) => ({
  phase: i + 9,
  paths: [
    root + `phase-${String(i + 9).padStart(2, "0")}`,
    "experiments/prose-qr/" + s,
  ],
  cap: caps[i],
}));
for (const s of scopes) for (const p of s.paths) await walk(p);
files.sort((a, b) => a.path.localeCompare(b.path));
const pngs = files.filter((f) => f.path.endsWith(".png")),
  pairs = {},
  sourceRefs = [];
function visit(v, source) {
  if (!v || typeof v !== "object") return;
  if (v.pngSha256 && v.rgbaSha256) {
    const a = (pairs[v.pngSha256] ??= []);
    a.push({ rgbaSha256: v.rgbaSha256, source });
  }
  if (v.sources && !Array.isArray(v.sources))
    for (const [path, expected] of Object.entries(v.sources))
      if (typeof expected === "string" && /^[a-f0-9]{64}$/.test(expected))
        sourceRefs.push({ path, expected, manifest: source });
  for (const x of Object.values(v))
    if (x && typeof x === "object") visit(x, source);
}
for (const f of files) {
  if (f.path.endsWith(".json"))
    visit(JSON.parse(await readFile(f.path, "utf8")), f.path);
  else if (f.path.endsWith(".jsonl"))
    for (const [i, line] of (await readFile(f.path, "utf8"))
      .trim()
      .split("\n")
      .entries())
      if (line) visit(JSON.parse(line), f.path + ":" + (i + 1));
}
const result = {
  at: new Date().toISOString(),
  scopes,
  files,
  plannedPNGFiles: pngs.length,
  pngs,
  recordedRGBAByPNG: pairs,
  sourceRefs,
  verifierSources: Object.fromEntries(
    await Promise.all(
      ["prepare.mjs", "verify.mjs", "verify-pixels.py"].map(async (n) => {
        const p = "experiments/prose-qr/session-2026-10-09/" + n;
        return [p, sha(await readFile(p))];
      }),
    ),
  ),
  planSha256: sha(await readFile(session + "VERIFICATION-PLAN.md")),
};
await writeFile(
  session + "verification-inputs.json",
  await format(JSON.stringify(result), { parser: "json" }),
  { flag: "wx" },
);
console.log(
  JSON.stringify({
    files: files.length,
    pngs: pngs.length,
    sourceRefs: sourceRefs.length,
  }),
);

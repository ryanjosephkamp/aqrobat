import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const studioBase = "experiments/prose-qr/paste-prose-2026-10-11/";
const studioPaths = [
  "vendor/qrcodegen.mjs",
  "src/core.mjs",
  "experiments/prose-qr/portable-story-2026-10-11/generator.mjs",
  studioBase + "corpus.mjs",
  studioBase + "compact.mjs",
  studioBase + "docx.mjs",
  studioBase + "page-fit.mjs",
  studioBase + "page-app.mjs",
];
const studioStrip = (s) =>
  s
    .replace(/^import[^;]*;\s*/gm, "")
    .replace(/^export default qrcodegen;\s*/gm, "")
    .replace(/^export (?=(?:async\s+function|function|const)\b)/gm, "");
const studioSources = [];
let studioCode = "";
for (const path of studioPaths) {
  const b = await readFile(path);
  studioSources.push({
    path,
    sha256: createHash("sha256").update(b).digest("hex"),
  });
  studioCode += studioStrip(b.toString()) + "\n";
}
if (/^\s*(?:import|export)\b/m.test(studioCode))
  throw new Error("Unexpected module declaration");
const studioTemplate = await readFile(
    studioBase + "page-template.html",
    "utf8",
  ),
  studioHtml = studioTemplate.replace(
    "/* BUNDLE */",
    studioCode.replace(/<\/script/gi, "<\\/script"),
  );
const studioOut =
  "docs/research/prose-qr/paste-prose-2026-10-11/page-studio.html";
await writeFile(studioOut, studioHtml);
await writeFile(
  "docs/research/prose-qr/paste-prose-2026-10-11/page-studio-build.json",
  JSON.stringify(
    {
      at: new Date().toISOString(),
      sources: studioSources,
      output: studioOut,
      sha256: createHash("sha256").update(studioHtml).digest("hex"),
      networkDependencies: 0,
      fontEmbedding: false,
      pinnedEncoderUnchanged: true,
    },
    null,
    2,
  ) + "\n",
);
console.log(studioOut);

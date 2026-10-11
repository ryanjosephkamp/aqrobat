import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
const base = "experiments/prose-qr/portable-story-2026-10-11/";
const paths = [
  "vendor/qrcodegen.mjs",
  "src/core.mjs",
  base + "generator.mjs",
  base + "workbench-app.mjs",
];
const strip = (s) =>
  s
    .replace(/^import[^;]*;\s*/gm, "")
    .replace(/^export default qrcodegen;\s*/gm, "")
    .replace(/^export (?=(?:async\s+function|function|const)\b)/gm, "");
const sources = [];
let code = "";
for (const path of paths) {
  const b = await readFile(path);
  sources.push({ path, sha256: createHash("sha256").update(b).digest("hex") });
  code += strip(b.toString()) + "\n";
}
if (/^\s*(?:import|export)\b/m.test(code))
  throw new Error("Unexpected module declaration");
const template = await readFile(base + "workbench-template.html", "utf8");
const html = template.replace(
  "/* BUNDLE */",
  code.replace(/<\/script/gi, "<\\/script"),
);
const out = resolve(
  "docs/research/prose-qr/portable-story-2026-10-11/workbench.html",
);
await writeFile(out, html);
await writeFile(
  resolve(
    "docs/research/prose-qr/portable-story-2026-10-11/workbench-build.json",
  ),
  JSON.stringify(
    {
      at: new Date().toISOString(),
      sources,
      sha256: createHash("sha256").update(html).digest("hex"),
      output: out,
      networkDependencies: 0,
      pinnedEncoderUnchanged: true,
    },
    null,
    2,
  ) + "\n",
);
console.log(out);

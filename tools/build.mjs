import {
  readFile,
  writeFile,
  mkdir,
  cp,
  rm,
  readdir,
  utimes,
} from "node:fs/promises";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

const root = resolve(new URL("..", import.meta.url).pathname);
const dist = resolve(root, "dist"),
  ext = resolve(dist, "extension");
await mkdir(dist, { recursive: true });
// Only the generated directory owned by this build is replaced.
await rm(ext, { recursive: true, force: true });
await mkdir(ext);
for (const path of [
  "index.html",
  "web",
  "src",
  "vendor",
  "LICENSE",
  "NOTICE.md",
])
  await cp(resolve(root, path), resolve(ext, path), { recursive: true });
for (const name of [
  "manifest.json",
  "worker.mjs",
  "too-long.html",
  "popup.html",
  "popup.css",
  "popup.mjs",
  "practice.html",
  "practice.mjs",
])
  await cp(resolve(root, "extension", name), resolve(ext, name));
await mkdir(resolve(ext, "extension"));
await cp(
  resolve(root, "extension/insertion.mjs"),
  resolve(ext, "extension/insertion.mjs"),
);
await writeFile(
  resolve(ext, "index.html"),
  (await readFile(resolve(ext, "index.html"), "utf8"))
    .replaceAll(
      'href="downloads/',
      'href="https://ryanjosephkamp.github.io/aqrobat/downloads/',
    )
    .replaceAll(
      'href="research/',
      'href="https://ryanjosephkamp.github.io/aqrobat/research/',
    ),
);
let html = await readFile(resolve(root, "index.html"), "utf8");
const css = await readFile(resolve(root, "web/style.css"), "utf8");
let code = "";
const stripModule = (source) =>
  source
    .replace(/^import[^;]*;\s*/gm, "")
    .replace(/^export default qrcodegen;\s*/gm, "")
    .replace(/^export (?=(?:async\s+function|function|const)\b)/gm, "")
    .replace(/[ \t]+$/gm, "");
// Wraps a module in a function so only its exports reach the bundle.
function scoped(source) {
  const names = [
    ...source.matchAll(/^export (?:async\s+)?(?:function|const)\s+(\w+)/gm),
  ].map((m) => m[1]);
  const body = source
    .replace(/^import[^;]*;\s*/gm, "")
    .replace(/^export (?=(?:async\s+function|function|const)\b)/gm, "");
  return `const { ${names.join(", ")} } = (() => {\n${body}\nreturn { ${names.join(", ")} };\n})();\n`;
}
let insertionCode = "";
for (const path of [
  "vendor/qrcodegen.mjs",
  "src/core.mjs",
  "src/render.mjs",
  "src/text.mjs",
  "src/library.mjs",
  "src/spacing.mjs",
  "src/portable.mjs",
  "src/destinations.mjs",
  "extension/insertion.mjs",
])
  insertionCode +=
    stripModule(await readFile(resolve(root, path), "utf8")) + "\n";
await writeFile(
  resolve(ext, "insertion.js"),
  `(() => {\n${insertionCode}\nglobalThis.__aqrobatOpenInsertion = openInsertion;\n})();\n`,
);
execFileSync(process.execPath, ["--check", resolve(ext, "insertion.js")]);
for (const path of [
  "vendor/qrcodegen.mjs",
  "src/core.mjs",
  "src/render.mjs",
  "src/text.mjs",
  "src/library.mjs",
  "src/portable.mjs",
  "src/destinations.mjs",
  "web/appearance.mjs",
  "web/emoji-data.mjs",
  "web/emoji-picker.mjs",
  "web/app.mjs",
]) {
  let source = await readFile(resolve(root, path), "utf8");
  // The picker keeps its private names to itself, as a module would.
  if (path === "web/emoji-picker.mjs") source = scoped(source);
  source = stripModule(source);
  code += source + "\n";
}
// The page loads the emoji list when it is first needed; the offline page
// carries it inline.
if (!code.includes('import("./emoji-data.mjs")'))
  throw new Error("The emoji picker no longer loads its list as expected.");
code = code.replace(
  'import("./emoji-data.mjs")',
  "Promise.resolve({ EMOJI_CATEGORIES })",
);
if (/^\s*(?:import|export)\b/m.test(code))
  throw new Error("Unexpected module declaration in offline bundle.");
// The offline page carries its logo and icons inline.
for (const [, path] of html.matchAll(/"(web\/brand\/[\w-]+\.png)"/g))
  html = html.replaceAll(
    `"${path}"`,
    `"data:image/png;base64,${(await readFile(resolve(root, path))).toString("base64")}"`,
  );
html = html
  .replace(
    /<link rel="stylesheet" href="web\/style.css"\s*\/?\s*>/,
    `<style>${css}</style>`,
  )
  .replace(
    '<script type="module" src="web/app.mjs"></script>',
    `<script type="module">${code.replace(/<\/script/gi, "<\\/script")}</script>`,
  )
  .replaceAll(
    'href="downloads/',
    'href="https://ryanjosephkamp.github.io/aqrobat/downloads/',
  )
  .replaceAll(
    'href="research/',
    'href="https://ryanjosephkamp.github.io/aqrobat/research/',
  );
if (html.includes('href="web/') || html.includes('src="web/'))
  throw new Error("Offline bundle still references local assets.");
await writeFile(resolve(dist, "aqrobat-offline.html"), html);
const practiceCode = stripModule(
  await readFile(resolve(root, "extension/practice.mjs"), "utf8"),
);
const practiceHtml = (
  await readFile(resolve(root, "extension/practice.html"), "utf8")
).replace(
  '<script type="module" src="practice.mjs"></script>',
  `<script type="module">${(insertionCode + practiceCode).replace(/<\/script/gi, "<\\/script")}</script>`,
);
await writeFile(resolve(dist, "aqrobat-insertion-practice.html"), practiceHtml);
await writeFile(resolve(dist, "offline-check.mjs"), code);
execFileSync(process.execPath, ["--check", resolve(dist, "offline-check.mjs")]);
await rm(resolve(dist, "offline-check.mjs"));
const archive = resolve(dist, "aqrobat-extension.zip");
await rm(archive, { force: true });
// zip is a build-time utility, not a package/runtime dependency.
const entries = [];
async function collect(dir, prefix = "") {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const name = prefix + entry.name;
    if (entry.isDirectory())
      await collect(resolve(dir, entry.name), name + "/");
    else {
      entries.push(name);
      const date = new Date("2000-01-01T00:00:00Z");
      await utimes(resolve(dir, entry.name), date, date);
    }
  }
}
await collect(ext);
entries.sort();
execFileSync("zip", ["-q", "-X", archive, ...entries], {
  cwd: ext,
  env: { ...process.env, TZ: "UTC" },
});
await mkdir(resolve(root, "downloads"), { recursive: true });
for (const name of [
  "aqrobat-extension.zip",
  "aqrobat-offline.html",
  "aqrobat-insertion-practice.html",
])
  await cp(resolve(dist, name), resolve(root, "downloads", name));
console.log(
  "Built offline HTML and unpacked extension ZIP. No publishing performed.",
);

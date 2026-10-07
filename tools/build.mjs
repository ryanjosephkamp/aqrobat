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
import { chromium } from "playwright";
import { existsSync } from "node:fs";
import { ICON_COLORS } from "../web/appearance.mjs";

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
for (const name of ["manifest.json", "worker.mjs", "too-long.html"])
  await cp(resolve(root, "extension", name), resolve(ext, name));
const executablePath =
  process.env.CHROME_PATH ||
  (existsSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
    ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    : undefined);
const browser = await chromium.launch({ headless: true, executablePath });
try {
  const page = await browser.newPage();
  await mkdir(resolve(ext, "icons"));
  for (const color of ICON_COLORS)
    for (const size of [16, 32, 48, 128]) {
      const url = await page.evaluate(
        ({ size, color }) => {
          const canvas = document.createElement("canvas");
          canvas.width = canvas.height = size;
          const c = canvas.getContext("2d");
          c.fillStyle = color.background;
          c.fillRect(0, 0, size, size);
          c.fillStyle = color.ink;
          c.font = `700 ${size * 0.82}px monospace`;
          c.textAlign = "center";
          c.textBaseline = "middle";
          c.fillText("#", size / 2, size / 2);
          return canvas.toDataURL("image/png");
        },
        { size, color },
      );
      await writeFile(
        resolve(ext, `icons/${color.id}-${size}.png`),
        Buffer.from(url.split(",")[1], "base64"),
      );
      if (color.id === "violet" && size !== 32)
        await cp(
          resolve(ext, `icons/${color.id}-${size}.png`),
          resolve(ext, `icon${size}.png`),
        );
    }
} finally {
  await browser.close();
}
let html = await readFile(resolve(root, "index.html"), "utf8");
const css = await readFile(resolve(root, "web/style.css"), "utf8");
let code = "";
for (const path of [
  "vendor/qrcodegen.mjs",
  "src/core.mjs",
  "src/render.mjs",
  "web/appearance.mjs",
  "web/app.mjs",
]) {
  let source = await readFile(resolve(root, path), "utf8");
  source = source
    .replace(/^import[^;]*;\s*/gm, "")
    .replace(/^export default qrcodegen;\s*/gm, "")
    .replace(/^export (?=(?:function|const)\b)/gm, "")
    .replace(/[ \t]+$/gm, "");
  code += source + "\n";
}
if (/^\s*(?:import|export)\b/m.test(code))
  throw new Error("Unexpected module declaration in offline bundle.");
html = html
  .replace(/\s*<link rel="icon"[^>]+>/, "")
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
  );
if (html.includes('href="web/') || html.includes('src="web/'))
  throw new Error("Offline bundle still references local assets.");
await writeFile(resolve(dist, "aqrobat-offline.html"), html);
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
for (const name of ["aqrobat-extension.zip", "aqrobat-offline.html"])
  await cp(resolve(dist, name), resolve(root, "downloads", name));
console.log(
  "Built offline HTML and unpacked extension ZIP. No publishing performed.",
);

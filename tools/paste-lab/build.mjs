// Bundles each editor page with esbuild into dist/<entry>.{js,css,html}.
import { build } from "esbuild";
import { mkdir, writeFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
export const ENTRIES = [
  "textarea.js",
  "contenteditable.js",
  "prosemirror.js",
  "tiptap.js",
  "quill.js",
  "lexical.js",
  "ckeditor.js",
  "slate.jsx",
];

async function newest(dir) {
  let t = 0;
  for (const f of await readdir(dir))
    t = Math.max(t, (await stat(join(dir, f))).mtimeMs);
  return t;
}

export async function buildPages({ force = false } = {}) {
  const dist = join(here, "dist");
  await mkdir(dist, { recursive: true });
  const pages = join(here, "pages");
  const marker = join(dist, ".built");
  if (!force && existsSync(marker)) {
    const built = (await stat(marker)).mtimeMs;
    if (
      built > (await newest(pages)) &&
      built > (await stat(join(here, "package.json"))).mtimeMs
    )
      return false;
  }
  await build({
    entryPoints: ENTRIES.map((e) => join(pages, e)),
    outdir: dist,
    bundle: true,
    format: "esm",
    splitting: false,
    minify: true,
    target: "chrome120",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
    loader: { ".js": "jsx" },
    logLevel: "warning",
    legalComments: "none",
  });
  for (const e of ENTRIES) {
    const name = e.replace(/\.jsx?$/, "");
    const css = existsSync(join(dist, `${name}.css`))
      ? `<link rel="stylesheet" href="${name}.css" />`
      : "";
    await writeFile(
      join(dist, `${name}.html`),
      `<!doctype html><html lang="en"><head><meta charset="utf-8" /><title>paste-lab ${name}</title>${css}</head><body><div id="host"></div><script type="module" src="${name}.js"></script></body></html>\n`,
    );
  }
  await writeFile(marker, new Date().toISOString());
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await buildPages({ force: true });
  console.log("Built pages into", join(here, "dist"));
}

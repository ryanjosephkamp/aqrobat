import { chromium } from "playwright";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { STORY } from "../flow/layout.mjs";
import { escapeHtml } from "../layout.mjs";
const config = process.argv[2]
  ? JSON.parse(await readFile(process.argv[2], "utf8"))
  : {};
const root = resolve(
  "docs/research/prose-qr/styled-story-2026-10-11/" + (config.id || "atlas-01"),
);
const size = config.size || 20;
const lineHeight = size * 1.2;
const cell = size * 1.6;
const stroke = config.stroke ?? 0.7;
await mkdir(root);
const alphabet = [...new Set(STORY)].sort();
const specs = [];
for (const weight of [400, 700])
  for (const char of alphabet)
    specs.push({
      char,
      weight,
      stroke: weight === 700 ? stroke : 0,
      index: specs.length,
    });
const html = `<!doctype html><html><body style="margin:0"><article id="artifact" style="position:relative;width:${20 * cell}px;height:${Math.ceil(specs.length / 20) * cell}px;background:white">${specs.map((s) => `<span id="g-${s.index}" style="position:absolute;left:${(s.index % 20) * cell}px;top:${Math.floor(s.index / 20) * cell}px;font:${s.weight} ${size}px/${lineHeight}px 'Courier New',monospace;color:black;-webkit-text-stroke:${s.stroke}px currentColor;paint-order:stroke fill">${escapeHtml(s.char)}</span>`).join("")}</article></body></html>`;
const source = await readFile(new URL("atlas.mjs", import.meta.url));
const sha = (b) => createHash("sha256").update(b).digest("hex");
await writeFile(resolve(root, "source.mjs.txt"), source, { flag: "wx" });
await writeFile(
  resolve(root, "manifest.json"),
  JSON.stringify(
    {
      at: new Date().toISOString(),
      specs,
      sourceSha256: sha(source),
      font: "Courier New",
      size,
      lineHeight,
      stroke,
      cell,
      readerCalls: 0,
    },
    null,
    2,
  ),
  { flag: "wx" },
);
await writeFile(resolve(root, "atlas.html.txt"), html, { flag: "wx" });
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
try {
  const page = await browser.newPage({
    viewport: { width: Math.max(800, 20 * cell), height: 800 },
    deviceScaleFactor: 1,
  });
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  const doc = await cdp.send("DOM.getDocument");
  const fonts = [];
  for (const s of [
    specs.find((s) => s.char === "M" && s.weight === 400),
    specs.find((s) => s.char === "M" && s.weight === 700),
  ]) {
    const node = await cdp.send("DOM.querySelector", {
      nodeId: doc.root.nodeId,
      selector: `#g-${s.index}`,
    });
    fonts.push({
      weight: s.weight,
      fonts: (
        await cdp.send("CSS.getPlatformFontsForNode", { nodeId: node.nodeId })
      ).fonts,
    });
  }
  const png = await page.locator("#artifact").screenshot();
  await writeFile(resolve(root, "atlas.png"), png, { flag: "wx" });
  const repeat = await page.locator("#artifact").screenshot();
  await writeFile(resolve(root, "repeat.png"), repeat, { flag: "wx" });
  if (!png.equals(repeat)) throw Error("Atlas repeat mismatch");
  const code =
    "import cv2,sys,json\na=cv2.imread(sys.argv[1],0);out=[];c=int(sys.argv[3])\nfor i in range(int(sys.argv[2])):\n x=i%20*c;y=i//20*c;out.append(a[y:y+c,x:x+c].tolist())\nprint(json.dumps(out))";
  const raw = spawnSync(
    "python3",
    [
      "-B",
      "-c",
      code,
      resolve(root, "atlas.png"),
      String(specs.length),
      String(cell),
    ],
    { encoding: "utf8", maxBuffer: 4000000 },
  );
  await writeFile(resolve(root, "extract.stdout.txt"), raw.stdout, {
    flag: "wx",
  });
  await writeFile(resolve(root, "extract.stderr.txt"), raw.stderr, {
    flag: "wx",
  });
  if (raw.status !== 0) throw Error("Atlas extraction failed");
  const pixels = JSON.parse(raw.stdout);
  const glyphs = {};
  specs.forEach((s, i) => {
    glyphs[`${s.weight}|${s.char}`] = pixels[i];
  });
  await writeFile(
    resolve(root, "glyphs.json"),
    JSON.stringify(
      {
        font: "Courier New",
        size,
        lineHeight,
        stroke,
        advance: (12.001953125 * size) / 20,
        specs,
        glyphs,
        fonts,
        pngSha256: sha(png),
        repeatExact: true,
        browser: browser.version(),
      },
      null,
      2,
    ),
    { flag: "wx" },
  );
  console.log(
    JSON.stringify({
      glyphs: specs.length,
      fonts,
      pngSha256: sha(png),
      repeatExact: true,
    }),
  );
} finally {
  await browser.close();
}

import { chromium } from "playwright";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const root = resolve(
  "docs/research/prose-qr/portable-story-2026-10-11/font-probe-01",
);
await mkdir(root);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const save = (n, v) =>
  writeFile(
    resolve(root, n),
    typeof v === "string" || Buffer.isBuffer(v)
      ? v
      : JSON.stringify(v, null, 2) + "\n",
    { flag: "wx" },
  );
const fonts = [
  "Impact",
  "Arial Black",
  "Avenir Next Condensed",
  "DIN Condensed",
  "Helvetica Neue",
  "Georgia",
  "Arial",
  "Menlo",
  "Courier New",
  "Avenir Next",
  "PT Sans Narrow",
  "Helvetica",
];
const specs = fonts.flatMap((font) =>
  [400, 900].map((weight) => ({ font, weight, size: 16 })),
);
const sample =
  "Morning light crossed the quiet room. ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 2026.";
await save(
  "source.mjs.txt",
  await readFile(new URL("font-probe.mjs", import.meta.url)),
);
await save("manifest.json", {
  at: new Date().toISOString(),
  specs,
  sample,
  nativeResourceCaptures: 1,
  immediateRepeats: 1,
  decoderCalls: 0,
});
const html = `<!doctype html><html><body style="margin:0"><article id="sheet" style="width:1280px;height:${specs.length * 32}px;background:white">${specs.map((s, i) => `<div style="height:32px;line-height:32px"><span style="display:inline-block;width:260px;font:12px Arial">${s.font} ${s.weight}</span><span id="f${i}" style="font:${s.weight} ${s.size}px/24px '${s.font}';font-kerning:none;font-variant-ligatures:none">${sample}</span></div>`).join("")}</article></body></html>`;
await save("resource.html.txt", html);
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
try {
  const page = await browser.newPage({
    viewport: { width: 1400, height: 1000 },
    deviceScaleFactor: 1,
  });
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  const doc = await cdp.send("DOM.getDocument");
  const rows = [];
  for (const [i, s] of specs.entries()) {
    const node = await cdp.send("DOM.querySelector", {
      nodeId: doc.root.nodeId,
      selector: `#f${i}`,
    });
    const faces = (
      await cdp.send("CSS.getPlatformFontsForNode", { nodeId: node.nodeId })
    ).fonts;
    const metrics = await page.evaluate(
      ({ s, sample }) => {
        const c = document.createElement("canvas").getContext("2d");
        c.fontKerning = "none";
        c.font = `${s.weight} ${s.size}px '${s.font}'`;
        const m = c.measureText(sample);
        const glyphs = [...new Set(sample)].map((char) => {
          const a = c.measureText(char);
          return {
            char,
            ascent: a.actualBoundingBoxAscent,
            descent: a.actualBoundingBoxDescent,
            width: a.width,
          };
        });
        return {
          sampleWidth: m.width,
          envelope:
            Math.max(...glyphs.map((g) => g.ascent)) +
            Math.max(...glyphs.map((g) => g.descent)),
          glyphs,
        };
      },
      { s, sample },
    );
    rows.push({ ...s, faces, metrics });
  }
  const png = await page.locator("#sheet").screenshot();
  await save("resource.png", png);
  const repeat = await page.locator("#sheet").screenshot();
  await save("repeat.png", repeat);
  assert(png.equals(repeat));
  await save("results.json", {
    at: new Date().toISOString(),
    browser: browser.version(),
    pngSha256: sha(png),
    repeatExact: true,
    rows,
  });
  console.log(
    JSON.stringify(
      rows.map((r) => ({
        font: r.font,
        weight: r.weight,
        faces: r.faces.map((f) => ({
          family: f.familyName,
          postScript: f.postScriptName,
        })),
        envelope: r.metrics.envelope,
      })),
    ),
  );
} finally {
  await browser.close();
}

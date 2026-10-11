import { chromium } from "playwright";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import assert from "node:assert/strict";
const root = resolve("docs/research/prose-qr/portable-story-2026-10-11"),
  out = resolve(root, "high-dpi-01");
await mkdir(out);
const sha = (b) => createHash("sha256").update(b).digest("hex"),
  save = (n, v) =>
    writeFile(
      resolve(out, n),
      typeof v === "string" || Buffer.isBuffer(v)
        ? v
        : JSON.stringify(v, null, 2) + "\n",
      { flag: "wx" },
    );
const inputs = [
  {
    id: "impact-2x",
    html: "examples/page-impact-mixed.html",
    scale: 2,
    payload: "https://example.com/",
  },
  {
    id: "impact-3x",
    html: "examples/page-impact-mixed.html",
    scale: 3,
    payload: "https://example.com/",
  },
  {
    id: "black-2x",
    html: "examples/black-weight-mixed.html",
    scale: 2,
    payload: "https://example.com/",
  },
  {
    id: "control-2x",
    htmlArchive: "batch-07/control-1.html.gz",
    scale: 2,
    payload: "https://example.com/",
    control: true,
  },
];
await save("manifest.json", {
  at: new Date().toISOString(),
  hypothesis:
    "The page-compatible9pt physical layout may behave differently when rendered natively on high-DPI devices. Capture unchanged selectable HTML at deviceScaleFactor2 and3, and the actual Letter PDF at native192dpi and300dpi. No external resampling, blur, cropping or geometry supplied to readers.",
  browserInputs: inputs,
  pdf: "examples/page-impact-letter.pdf",
  pdfSha256: sha(
    await readFile(resolve(root, "examples/page-impact-letter.pdf")),
  ),
  pdfDpi: [192, 300],
  plannedNativeCandidates: 5,
  plannedControls: 1,
  plannedImmediateRepeats: 6,
  inputTransforms:
    "none; native device pixels and direct PDFKit page rendering at requested resolution",
});
await save(
  "source.mjs.txt.gz",
  gzipSync(await readFile(new URL("high-dpi.mjs", import.meta.url))),
);
await save(
  "native-source.swift.txt.gz",
  gzipSync(await readFile(new URL("high-dpi.swift", import.meta.url))),
);
const browser = await chromium.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  }),
  rows = [];
try {
  for (const item of inputs) {
    assert(Date.now() < Date.parse("2026-10-11T19:25:49Z"));
    const context = await browser.newContext({
        viewport: { width: 1400, height: 1400 },
        deviceScaleFactor: item.scale,
      }),
      page = await context.newPage(),
      requests = [];
    page.on("request", (r) => {
      if (/^https?:/.test(r.url())) requests.push(r.url());
    });
    let html;
    if (item.html) html = await readFile(resolve(root, item.html), "utf8");
    else {
      const { gunzipSync } = await import("node:zlib");
      html = gunzipSync(
        await readFile(resolve(root, item.htmlArchive)),
      ).toString();
    }
    await save(item.id + ".html.gz", gzipSync(html));
    await page.setContent(html);
    await page.evaluate(() => document.fonts.ready);
    const one = await page.locator("#artifact").screenshot(),
      two = await page.locator("#artifact").screenshot();
    await save(item.id + ".png", one);
    await save(item.id + "-repeat.png", two);
    assert(one.equals(two));
    assert.deepEqual(requests, []);
    const row = {
      ...item,
      sourceSha256: sha(html),
      pngSha256: sha(one),
      repeatExact: true,
      width: one.readUInt32BE(16),
      height: one.readUInt32BE(20),
      nativeDeviceScale: item.scale,
    };
    rows.push(row);
    await save(item.id + "-capture.json", row);
    await context.close();
    console.log(JSON.stringify(row));
  }
  await save("browser-summary.json", {
    at: new Date().toISOString(),
    browser: browser.version(),
    rows,
    browserClosedInFinally: true,
  });
} finally {
  await browser.close();
}

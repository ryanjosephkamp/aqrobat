import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { format } from "prettier";
import assert from "node:assert/strict";
import { root, sha } from "./capture.mjs";
const rows = JSON.parse(
  await readFile(resolve(root, "display-01/results.json"), "utf8"),
);
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const replays = [],
  views = [];
try {
  const page = await browser.newPage({
    viewport: { width: 800, height: 800 },
    deviceScaleFactor: 1,
  });
  for (const r of rows) {
    const path = resolve(root, "display-01", r.id + ".html");
    await page.goto(pathToFileURL(path).href);
    await page.locator("img").evaluate((e) => e.decode());
    const png = await page.locator("#artifact").screenshot();
    const formattedHash = sha(png);
    await page.setContent(await readFile(path + ".executed.txt", "utf8"));
    await page.locator("img").evaluate((e) => e.decode());
    const originalReplay = await page.locator("#artifact").screenshot();
    replays.push({
      id: r.id,
      capturedPngSha256: r.pngSha256,
      formattedReplaySha256: formattedHash,
      originalHTMLReplaySha256: sha(originalReplay),
      formattingPreservesReplay: formattedHash === sha(originalReplay),
      originalCaptureReproduced: formattedHash === r.pngSha256,
      originalExecutedHTMLSha256: sha(await readFile(path + ".executed.txt")),
      formattedHTMLSha256: sha(await readFile(path)),
    });
  }
  await page.goto(pathToFileURL(resolve(root, "index.html")).href);
  for (const [id, width, height] of [
    ["desktop", 1000, 900],
    ["phone-width", 390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(async () => {
      scrollTo(0, 0);
      await new Promise((r) =>
        requestAnimationFrame(() => requestAnimationFrame(r)),
      );
    });
    const png = await page.screenshot();
    const path = `reading-top-${id}.png`;
    await writeFile(resolve(root, path), png, { flag: "wx" });
    views.push({
      path,
      width,
      height,
      pngSha256: sha(png),
      pageOverflow: await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    });
  }
} finally {
  await browser.close();
}
await writeFile(
  resolve(root, "replay-checks.json"),
  await format(
    JSON.stringify({
      testedAt: new Date().toISOString(),
      sourceScriptSha256: sha(await readFile(new URL(import.meta.url))),
      replays,
      views,
      classification:
        "Presentation replay hashes recorded with the original 800-pixel viewport. Original executed HTML snapshots preserved. No new QR-decoder attempts; screenshots are browser reading views, not physical phone observations.",
    }),
    { parser: "json" },
  ),
  { flag: "wx" },
);
console.log(
  JSON.stringify({
    replays: replays.length,
    allHashesMatch: replays.every((r) => r.originalCaptureReproduced),
    formattingPreservesAll: replays.every((r) => r.formattingPreservesReplay),
    views,
  }),
);

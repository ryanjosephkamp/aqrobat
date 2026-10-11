import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { format } from "prettier";
import { chromium } from "playwright";
import assert from "node:assert/strict";
const root = "docs/research/prose-qr/session-2026-10-10-c/",
  out = root + "report-check-01/",
  sha = (b) => createHash("sha256").update(b).digest("hex");
await mkdir(out);
const source = await readFile(root + "index.html", "utf8"),
  results = [],
  errors = [],
  requests = [];
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
try {
  for (const width of [390, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => {
      if (/^https?:/.test(r.url())) requests.push(r.url());
    });
    await page.setContent(source);
    await page.evaluate(() => document.fonts.ready);
    const metrics = await page.evaluate(() => ({
      viewport: innerWidth,
      scroll: document.documentElement.scrollWidth,
      images: [...document.images].every(
        (i) => i.complete && i.naturalWidth > 0,
      ),
      title: document.title,
      prompt: document.querySelector("#prompt").value,
    }));
    assert(metrics.scroll <= width + 1, "Root horizontal overflow");
    assert(metrics.images);
    assert(
      metrics.prompt.includes(
        "Continue prose QR research only in /Users/noir/Documents/aqrobat",
      ),
    );
    await page.evaluate(() =>
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async () => {
            throw new Error("Deliberately denied for fallback test");
          },
        },
      }),
    );
    await page.locator("#copy").click();
    assert.match(await page.locator("#copy-status").innerText(), /selected/);
    const selected = await page
      .locator("#prompt")
      .evaluate((e) => e.selectionEnd - e.selectionStart);
    assert.equal(selected, metrics.prompt.length);
    await page.screenshot({ path: out + width + ".png" });
    results.push({
      width,
      rootScrollWidth: metrics.scroll,
      imagesLoaded: metrics.images,
      promptCharacters: metrics.prompt.length,
      deniedClipboardFallbackSelected: true,
    });
    await page.close();
  }
  assert.equal(errors.length, 0);
  assert.equal(requests.length, 0);
  await writeFile(
    out + "receipt.json",
    await format(
      JSON.stringify({
        at: new Date().toISOString(),
        passed: true,
        results,
        errors,
        requests,
        nativeClipboard: "untested; headless denial fallback only",
        sources: {
          [root + "index.html"]: sha(Buffer.from(source)),
          "experiments/prose-qr/session-2026-10-10-c/check-report.mjs": sha(
            await readFile(
              "experiments/prose-qr/session-2026-10-10-c/check-report.mjs",
            ),
          ),
        },
      }),
      { parser: "json" },
    ),
    { flag: "wx" },
  );
  console.log(
    JSON.stringify({
      passed: true,
      widths: [390, 1280],
      errors: 0,
      externalRequests: 0,
    }),
  );
} catch (e) {
  await writeFile(
    out + "error.json",
    await format(
      JSON.stringify({
        at: new Date().toISOString(),
        error: e.stack,
        results,
        errors,
        requests,
      }),
      { parser: "json" },
    ),
    { flag: "wx" },
  );
  throw e;
} finally {
  await browser.close();
}

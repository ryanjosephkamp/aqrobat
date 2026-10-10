import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const root = "docs/research/prose-qr/astra-2026-10-10";
const html = await readFile(root + "/index.html");
const server = createServer((req, res) => {
  if (req.url !== "/" && req.url !== "/index.html") {
    res.writeHead(404);
    res.end();
    return;
  }
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const url = `http://127.0.0.1:${server.address().port}/`;
let browser;
const watchdog = setTimeout(() => browser?.close(), 90000);
const result = {
  at: new Date().toISOString(),
  reportSha256: createHash("sha256").update(html).digest("hex"),
  viewports: [],
  scope:
    "Report-only QA. No experiment native rendering or QR reader calls; fresh task-owned Chromium profile; clipboard failure simulated without changing host clipboard.",
  clipboardSuccessPath: "not exercised",
  externalAssetsRequested: [],
};
try {
  browser = await chromium.launch({
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
  for (const size of [
    { width: 320, height: 740 },
    { width: 390, height: 844 },
    { width: 1280, height: 900 },
  ]) {
    const context = await browser.newContext({
      viewport: size,
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => {
      if (!r.url().startsWith(url) && !r.url().startsWith("data:"))
        result.externalAssetsRequested.push(r.url());
    });
    await page.addInitScript(() =>
      Object.defineProperty(navigator, "clipboard", {
        value: {
          writeText: async () => {
            throw new Error("QA simulated unavailable clipboard");
          },
        },
        configurable: true,
      }),
    );
    await page.goto(url, { waitUntil: "networkidle" });
    await Promise.race([
      page.evaluate(async () => {
        for (const image of document.images) image.loading = "eager";
        await Promise.all([...document.images].map((image) => image.decode()));
      }),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Embedded image decode timeout after 15s")),
          15000,
        ),
      ),
    ]);
    const measured = await page.evaluate(() => ({
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      images: [...document.images].map((i) => ({
        complete: i.complete,
        w: i.naturalWidth,
        h: i.naturalHeight,
      })),
      missingAnchors: [...document.querySelectorAll('a[href^="#"]')]
        .filter((a) => a.hash && !document.querySelector(a.hash))
        .map((a) => a.hash),
      status: document.querySelector(".pill").textContent,
      overlayHidden: document
        .getElementById("source-overlay")
        .hasAttribute("hidden"),
    }));
    assert(measured.scrollWidth <= size.width, JSON.stringify(measured));
    assert.equal(measured.images.length, 19);
    assert(measured.images.every((i) => i.complete && i.w > 0 && i.h > 0));
    assert.equal(measured.missingAnchors.length, 0);
    assert(measured.overlayHidden);
    assert(measured.status.includes("UNSOLVED"));
    const downloads = await page
      .locator("a[download]")
      .evaluateAll((as) =>
        as.map((a) => ({ name: a.download, href: a.getAttribute("href") })),
      );
    assert(downloads.length >= 34);
    assert(downloads.every((d) => d.href.startsWith("data:")));
    const original = downloads.find((d) => d.name === "context-04-native.html");
    assert(original);
    assert.deepEqual(
      Buffer.from(original.href.split(",")[1], "base64"),
      await readFile(root + "/context-04/continuous-article/native.html.txt"),
    );
    const png = downloads.find((d) => d.name === "context-04-native.png");
    assert.deepEqual(
      Buffer.from(png.href.split(",")[1], "base64"),
      await readFile(root + "/context-04/continuous-article/native.png"),
    );
    await page.locator("#overlay-toggle").check();
    assert.equal(
      await page.locator("#source-overlay").getAttribute("hidden"),
      null,
    );
    await page.locator("#overlay-toggle").uncheck();
    assert.notEqual(
      await page.locator("#source-overlay").getAttribute("hidden"),
      null,
    );
    await page.locator('[data-copy="continue-text"]').click();
    assert(
      (await page.locator("#continue-text-status").textContent()).includes(
        "Clipboard unavailable",
      ),
    );
    const selection = await page.locator("#continue-text").evaluate((t) => ({
      start: t.selectionStart,
      end: t.selectionEnd,
      length: t.value.length,
    }));
    assert.equal(selection.start, 0);
    assert.equal(selection.end, selection.length);
    assert.equal(errors.length, 0);
    await page.evaluate(() => window.scrollTo(0, 0));
    if (size.width !== 320)
      await page.screenshot({
        path: root + `/checks/report-v2-${size.width}.png`,
        fullPage: false,
      });
    result.viewports.push({
      viewport: size,
      documentWidth: measured.scrollWidth,
      decodedEmbeddedImages: measured.images.length,
      dataDownloadLinks: downloads.length,
      originalHtmlAndPngDownloadBytesMatch: true,
      overlayToggleWorks: true,
      clipboardFallbackSelectsEntirePrompt: true,
      pageErrors: errors,
    });
    await context.close();
  }
  assert.equal(result.externalAssetsRequested.length, 0);
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    javaScriptEnabled: false,
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "load" });
  assert(await page.locator("#next").isVisible());
  assert.equal(await page.locator("img").count(), 19);
  result.noJavaScriptContentPresent = true;
  await context.close();
  result.passed = true;
} catch (e) {
  result.passed = false;
  result.error = { message: e.message, stack: e.stack };
  throw e;
} finally {
  clearTimeout(watchdog);
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
  await writeFile(
    root + "/report-qa-02.json",
    JSON.stringify(result, null, 2) + "\n",
  );
}
console.log(JSON.stringify(result));

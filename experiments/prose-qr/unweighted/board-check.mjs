import { chromium } from "playwright";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { format } from "prettier";
import { createServer } from "node:http";
import { sha } from "./capture.mjs";

const root = resolve("docs/research/prose-qr/phase-03");
const html = await readFile(resolve(root, "index.html"));
const server = createServer((request, response) => {
  response.writeHead(200, { "Content-Type": "text/html;charset=utf-8" });
  response.end(html);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const localURL = "http://127.0.0.1:" + server.address().port;
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const errors = [],
  requests = [],
  checks = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1100, height: 900 },
    acceptDownloads: true,
  });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (/^https?:/.test(r.url()) && !r.url().startsWith(localURL))
      requests.push(r.url());
  });
  await page.route(/^https?:/, (r) =>
    r.request().url().startsWith(localURL) ? r.continue() : r.abort(),
  );
  await page.goto(localURL);
  const data = await page
    .locator("#data")
    .evaluate((e) => JSON.parse(e.textContent));
  for (const c of data) {
    await page.selectOption("#choice", c.id);
    assert.equal(await page.locator("#plain").inputValue(), c.plainText);
    const style = await page.locator("#reading").evaluate((e) => ({
      weight: getComputedStyle(e).fontWeight,
      color: getComputedStyle(e).color,
    }));
    assert.deepEqual(style, { weight: "400", color: "rgb(0, 0, 0)" });
    for (const [button, expected] of [
      ["save-text", c.plainText],
      ["save-html", c.html],
    ]) {
      // Chrome throttles rapid automated downloads; test actual user-paced clicks.
      await new Promise((r) => setTimeout(r, 500));
      const promise = page.waitForEvent("download", { timeout: 3000 });
      await page.locator("#" + button).click();
      const download = await promise;
      const bytes = await readFile(await download.path());
      assert.equal(bytes.toString("utf8"), expected);
      await download.delete();
    }
    await new Promise((r) => setTimeout(r, 500));
    const recipePromise = page.waitForEvent("download", { timeout: 3000 });
    await page.locator("#save-recipe").click();
    const recipeDownload = await recipePromise;
    const recipe = JSON.parse(
      await readFile(await recipeDownload.path(), "utf8"),
    );
    assert.deepEqual(recipe.spec, c.recipe);
    assert.equal(recipe.sourceTXTSha256, sha(c.plainText));
    assert.equal(recipe.sourceHTMLSha256, sha(c.html));
    await recipeDownload.delete();
    await page.locator("#native-details").evaluate((e) => {
      e.open = true;
    });
    await page.locator("#native-holder iframe").waitFor();
    const frame = page.frameLocator("#native-holder iframe");
    await frame.locator("#text-body").waitFor();
    if (c.proof) {
      assert.equal(
        await frame.locator("#text-body").textContent(),
        c.plainText,
      );
      assert.equal(await frame.locator("#text-body span").count(), 0);
    } else {
      assert.equal(
        (await frame.locator(".line").allTextContents()).join("\n"),
        c.plainText,
      );
    }
    const weight = await frame
      .locator("#text-body")
      .evaluate((e) => getComputedStyle(e).fontWeight);
    assert.equal(weight, "400");
    await page.locator("#native-details").evaluate((e) => {
      e.open = false;
    });
    checks.push({
      id: c.id,
      exactTXTDownload: true,
      exactHTMLDownload: true,
      recipe: true,
      selectableNativeText: true,
      uniformWeight: 400,
    });
  }
  await page.selectOption("#choice", "refine-001");
  await page.screenshot({ path: resolve(root, "board-desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  const layout = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    width: innerWidth,
  }));
  assert(layout.scrollWidth <= layout.width, "Phone width overflow");
  await page.screenshot({ path: resolve(root, "board-phone-width.png") });
  // Exercise the non-clipboard fallback; no owner clipboard is touched.
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async () => {
          throw new Error("test unavailable");
        },
      },
      configurable: true,
    }),
  );
  await page.locator("#copy-text").click();
  const selection = await page.locator("#plain").evaluate((e) => ({
    start: e.selectionStart,
    end: e.selectionEnd,
    length: e.value.length,
  }));
  assert.equal(selection.start, 0);
  assert.equal(selection.end, selection.length);
  assert(await page.locator("#notice").textContent());
  assert.deepEqual(errors, []);
  assert.deepEqual(requests, []);
  await writeFile(
    resolve(root, "board-checks.json"),
    await format(
      JSON.stringify({
        testedAt: new Date().toISOString(),
        checks,
        phoneViewport: layout,
        clipboardFallback: true,
        pageErrors: errors,
        automaticExternalRequests: requests,
        classification:
          "Task-owned headless browser checks; not physical phone, native clipboard, email or print evidence",
      }),
      { parser: "json" },
    ),
    { flag: "wx" },
  );
  console.log(
    JSON.stringify({
      cases: checks.length,
      phoneOverflow: false,
      errors,
      requests,
    }),
  );
} finally {
  if (errors.length) console.log(JSON.stringify({ errors }));
  await browser.close();
  await new Promise((r) => server.close(r));
}

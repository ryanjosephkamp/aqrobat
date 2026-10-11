import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { format } from "prettier";
const root = "docs/research/prose-qr/sol-three-hour-plan-2026-10-10/";
const out = root + "check-01/";
await mkdir(out);
const source = await readFile(root + "index.html", "utf8");
const prompt = await readFile(root + "RUN-PROMPT.md", "utf8");
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const results = [],
  errors = [],
  requests = [];
try {
  for (const width of [390, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => {
      if (/^https?:/.test(r.url())) requests.push(r.url());
    });
    await page.setContent(source);
    const scroll = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    assert(scroll <= width + 1, "Horizontal overflow");
    assert.equal(await page.locator(".idea").count(), 40);
    assert.equal(await page.locator("#prompt").inputValue(), prompt);
    await page.screenshot({ path: out + width + ".png" });
    await page.locator("#priority").check();
    assert.equal(await page.locator(".idea:visible").count(), 9);
    await page.locator("#priority").uncheck();
    await page.locator("#search").fill("ligature");
    assert.equal(await page.locator(".idea:visible").count(), 1);
    await page.locator("#expand").click();
    assert.equal(await page.locator(".idea[open]:visible").count(), 1);
    await page.locator("#search").fill("unfindable-string-xyz");
    assert.equal(await page.locator(".idea:visible").count(), 0);
    await page.locator("#search").fill("");
    await page.evaluate(() =>
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async () => {
            throw new Error("Deliberate test denial");
          },
        },
      }),
    );
    await page.locator("#copy-top").click();
    assert.match(await page.locator("#notice").innerText(), /selected/);
    assert.equal(
      await page
        .locator("#prompt")
        .evaluate((e) => e.selectionEnd - e.selectionStart),
      prompt.length,
    );
    await page.evaluate(() =>
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (text) => {
            window.testClipboard = text;
          },
        },
      }),
    );
    await page.locator("#copy").click();
    assert.equal(await page.evaluate(() => window.testClipboard), prompt);
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.locator("#download").click(),
    ]);
    assert.equal(download.suggestedFilename(), "aqrobat-sol-three-hour-run.md");
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    assert.equal(Buffer.concat(chunks).toString(), prompt);
    results.push({
      width,
      scroll,
      ideaCount: 40,
      priorityCount: 9,
      filters: true,
      expand: true,
      promptExact: true,
      deniedClipboardFallback: true,
      mockedClipboardTransfer: true,
      downloadExact: true,
    });
    await page.close();
  }
  assert.equal(errors.length, 0);
  assert.equal(requests.length, 0);
} finally {
  await browser.close();
}
const sha = (b) => createHash("sha256").update(b).digest("hex");
await writeFile(
  out + "receipt.json",
  await format(
    JSON.stringify({
      at: new Date().toISOString(),
      passed: true,
      results,
      errors,
      externalRequests: requests,
      nativeClipboard:
        "Untested; mocked success and deliberate-denial fallback only",
      newResearchCaptures: 0,
      sources: {
        [root + "index.html"]: sha(Buffer.from(source)),
        [root + "RUN-PROMPT.md"]: sha(Buffer.from(prompt)),
        [root + "check.mjs"]: sha(await readFile(root + "check.mjs")),
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
    ideaCount: 40,
    promptExact: true,
    noExternalRequests: true,
  }),
);

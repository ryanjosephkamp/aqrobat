import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, dirname } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { format } from "prettier";
const root = "docs/bootstrap/astra-2026-10-10/",
  out = root + "check-01/";
await mkdir(out);
const html = await readFile(root + "index.html", "utf8"),
  prompt = await readFile(root + "START-PROMPT.txt", "utf8"),
  full = await readFile(root + "RUN-PROMPT.md", "utf8");
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
    await page.setContent(html);
    assert.equal(await page.locator("#prompt").inputValue(), prompt);
    assert.equal(await page.locator("#full").inputValue(), full);
    const scroll = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    assert(scroll <= width + 1);
    for (const href of await page
      .locator("a")
      .evaluateAll((a) => a.map((x) => x.getAttribute("href")))) {
      if (href && !/^https?:|#/.test(href)) await access(resolve(root, href));
    }
    await page.screenshot({ path: out + width + ".png" });
    await page.evaluate(() =>
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async () => {
            throw new Error("Intentional denial");
          },
        },
      }),
    );
    await page.locator("#copy-start").click();
    assert.equal(
      await page
        .locator("#prompt")
        .evaluate((e) => e.selectionEnd - e.selectionStart),
      prompt.length,
    );
    await page.locator("#copy-folder").click();
    assert.equal(
      await page.evaluate(() => window.getSelection().toString()),
      "/Users/noir/Documents/aqrobat",
    );
    await page.locator("summary").click();
    await page.locator("#copy-full").click();
    assert.equal(
      await page
        .locator("#full")
        .evaluate((e) => e.selectionEnd - e.selectionStart),
      full.length,
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
    await page.locator("#copy-start").click();
    assert.equal(await page.evaluate(() => window.testClipboard), prompt);
    results.push({
      width,
      scroll,
      promptExact: true,
      fullPromptExact: true,
      localLinksExist: true,
      deniedClipboardFallback: true,
      mockedClipboardSuccess: true,
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
      nativeClipboard: "untested; mocked success and denial fallback only",
      newResearchRenders: 0,
      sources: {
        [root + "index.html"]: sha(Buffer.from(html)),
        [root + "START-PROMPT.txt"]: sha(Buffer.from(prompt)),
        [root + "RUN-PROMPT.md"]: sha(Buffer.from(full)),
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
    promptsExact: true,
    noExternalRequests: true,
  }),
);

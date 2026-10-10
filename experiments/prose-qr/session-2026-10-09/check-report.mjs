import { chromium } from "playwright";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import assert from "node:assert/strict";
import { format } from "prettier";
const root = "docs/research/prose-qr/session-2026-10-09/",
  out = root + "report-check-01/",
  sha = (b) => createHash("sha256").update(b).digest("hex");
await mkdir(out);
const checkpoint = await readFile(root + "CHECKPOINT.md", "utf8"),
  prompt = checkpoint.split("## Continuation prompt\n\n")[1],
  errors = [],
  requests = [],
  screenshots = [];
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
  });
  page.on("pageerror", (e) => errors.push(e.stack));
  page.on("request", (r) => {
    if (!/^(file:|data:|blob:)/.test(r.url())) requests.push(r.url());
  });
  await page.goto(pathToFileURL(resolve(root + "index.html")).href);
  assert.equal(await page.locator("#prompt").inputValue(), prompt);
  assert.equal(
    await page.locator("table").first().locator("tbody tr").count(),
    7,
  );
  for (const [name, width, height] of [
    ["mobile", 390, 844],
    ["desktop", 1280, 900],
  ]) {
    await page.setViewportSize({ width, height });
    assert(
      await page.evaluate(() => document.body.scrollWidth <= innerWidth),
      "Body horizontal overflow",
    );
    const png = await page.screenshot();
    await writeFile(out + name + ".png", png, { flag: "wx" });
    screenshots.push({ name, width, height, pngSha256: sha(png) });
  }
  await page
    .getByText("Read the native-letter excerpt", { exact: true })
    .click();
  assert(await page.evaluate(() => document.body.scrollWidth <= innerWidth));
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("Simulated clipboard denial");
        },
      },
    }),
  );
  await page.locator("#copy").click();
  assert.match(
    await page.locator("#copy-status").textContent(),
    /Clipboard unavailable/,
  );
  assert(
    await page
      .locator("#prompt")
      .evaluate(
        (e) => e.selectionStart === 0 && e.selectionEnd === e.value.length,
      ),
  );
  const downloads = [];
  for (const [selector, name, expected] of [
    ["#checkpoint", "checkpoint.md.txt", Buffer.from(checkpoint)],
    [
      '[data-source="html"]',
      "research.html.txt",
      gunzipSync(
        await readFile("docs/research/prose-qr/phase-14/run-01/native.html.gz"),
      ),
    ],
    [
      '[data-source="txt"]',
      "research.txt",
      await readFile("docs/research/prose-qr/phase-14/run-01/native.txt"),
    ],
  ]) {
    const wait = page.waitForEvent("download");
    await page.locator(selector).click();
    const download = await wait;
    const path = await download.path(),
      actual = await readFile(path);
    assert.equal(sha(actual), sha(expected));
    await writeFile(out + name, actual, { flag: "wx" });
    downloads.push({ name, sha256: sha(actual), exact: true });
  }
  assert.equal(errors.length, 0);
  assert.equal(requests.length, 0);
  await writeFile(
    out + "receipt.json",
    await format(
      JSON.stringify({
        at: new Date().toISOString(),
        screenshots,
        downloads,
        promptExact: true,
        clipboardDeniedFallback: true,
        nativeClipboard: "untested",
        bodyOverflow: false,
        errors,
        externalRequests: requests,
        sources: Object.fromEntries(
          await Promise.all(
            [
              root + "index.html",
              root + "CHECKPOINT.md",
              root + "REPORT-CHECK-PLAN.md",
              fileURLToPath(import.meta.url),
            ].map(async (p) => [p, sha(await readFile(p))]),
          ),
        ),
      }),
      { parser: "json" },
    ),
    { flag: "wx" },
  );
  console.log(
    JSON.stringify({
      checked: true,
      screenshots: screenshots.length,
      downloads: downloads.length,
      errors,
      requests,
    }),
  );
} catch (e) {
  await writeFile(
    out + "error.json",
    await format(JSON.stringify({ error: e.stack }), { parser: "json" }),
    { flag: "wx" },
  );
  throw e;
} finally {
  await browser.close();
}

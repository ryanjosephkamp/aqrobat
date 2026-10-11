import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { format } from "prettier";
import assert from "node:assert/strict";
const root = resolve("docs/research/prose-qr/phase-05"),
  sha = (b) => createHash("sha256").update(b).digest("hex"),
  errors = [],
  requests = [];
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
let record;
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (/^https?:/.test(r.url())) requests.push(r.url());
  });
  await page.goto(pathToFileURL(resolve(root, "index.html")).href);
  const checkpoint = await readFile(resolve(root, "CHECKPOINT.md"), "utf8");
  assert.equal(await page.locator("#checkpoint").inputValue(), checkpoint);
  const width = await page.evaluate(() => ({
    viewport: innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  assert(width.document <= width.viewport);
  assert(
    (await page.locator("#candidateStats").textContent()).startsWith(
      "58 alternating runs",
    ),
  );
  await page.locator("#axis").selectOption("vertical");
  assert(
    (await page.locator("#candidateStats").textContent()).startsWith(
      "47 alternating runs",
    ),
  );
  await page.locator("#corner").selectOption("topRight");
  await page.locator("#axis").selectOption("horizontal");
  assert(
    (await page.locator("#candidateStats").textContent()).startsWith(
      "60 alternating runs",
    ),
  );
  await page.locator("#corner").selectOption("topLeft");
  const pending = page.waitForEvent("download");
  await page.locator("#download").click();
  const download = await pending;
  await download.saveAs(resolve(root, "checkpoint-export.txt"));
  assert.equal(
    await readFile(resolve(root, "checkpoint-export.txt"), "utf8"),
    checkpoint,
  );
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: () => Promise.reject(Error("Simulated blocked clipboard")),
      },
      configurable: true,
    }),
  );
  await page.locator("#copy").click();
  const prompt = checkpoint
    .slice(checkpoint.indexOf("> Continue"))
    .replace(/^> ?/gm, "");
  assert.equal(await page.locator("#checkpoint").inputValue(), prompt);
  assert(await page.locator("#checkpoint").isVisible());
  await page.evaluate(() => (document.querySelector("details").open = false));
  const screenshot = await page.screenshot();
  await writeFile(resolve(root, "handback-390.png"), screenshot, {
    flag: "wx",
  });
  assert.deepEqual(errors, []);
  assert.deepEqual(requests, []);
  record = {
    at: new Date().toISOString(),
    sourceSha256: sha(await readFile(new URL(import.meta.url))),
    htmlSha256: sha(await readFile(resolve(root, "index.html"))),
    checkpointSha256: sha(checkpoint),
    downloadSha256: sha(await readFile(resolve(root, "checkpoint-export.txt"))),
    screenshotSha256: sha(screenshot),
    width,
    errors,
    automaticExternalRequests: requests,
    traceSwitches: "Passed exact retained run-count checks",
    clipboardFallback:
      "Simulated rejection passed, selected correct prompt; no native clipboard claim",
    download: "Exact checkpoint UTF-8 bytes",
    classification:
      "Task-owned headless Chrome handback check; no physical phone, native app or QR acceptance test",
  };
} finally {
  await browser.close();
}
await writeFile(
  resolve(root, "handback-checks.json"),
  await format(JSON.stringify(record), { parser: "json" }),
  { flag: "wx" },
);
console.log(JSON.stringify(record));

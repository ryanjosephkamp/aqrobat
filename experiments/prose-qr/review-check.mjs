import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { format } from "prettier";

const root = resolve("docs/research/prose-qr");
const digest = (v) => createHash("sha256").update(v).digest("hex");
const html = await readFile(resolve(root, "index.html"));
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const report = {
  schema: "aqrobat-prose-review-check-v1",
  checkedAt: new Date().toISOString(),
  boardSha256: digest(html),
  browser: browser.version(),
  checks: [],
  evidenceClass:
    "Synthetic software UI checks only, not phone/print/readability acceptance",
  phone: "not tested",
  physicalPrint: "not tested",
};
const errors = [],
  external = [];
async function downloadBytes(download) {
  const stream = await download.createReadStream();
  const parts = [];
  for await (const part of stream) parts.push(part);
  return Buffer.concat(parts);
}
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (/^https?:/.test(r.url())) external.push(r.url());
  });
  await page.goto(pathToFileURL(resolve(root, "index.html")).href);
  await page.locator("#raw-img").evaluate((img) => img.decode());
  assert.equal(await page.locator("#case option").count(), 6);
  assert.equal(await page.locator("#control-images img").count(), 2);
  for (const id of ["camera", "dedicated", "paper"])
    assert.equal(await page.locator("#" + id).inputValue(), "Not tested");
  assert.equal(await page.locator("#reading").inputValue(), "Not reviewed");
  report.checks.push(
    "Offline file loads six cases and two controls; all manual outcomes start untested.",
  );

  const pngEvent = page.waitForEvent("download");
  await page.locator("#png").click();
  const png = await downloadBytes(await pngEvent);
  const expectedPng = await readFile(
    resolve(root, "pilot-02/raw/strict-021-320.png"),
  );
  assert.deepEqual(png, expectedPng);
  report.originalPngSha256 = digest(png);
  report.checks.push(
    "Downloaded original PNG is byte-identical to the retained raw screenshot.",
  );

  const htmlEvent = page.waitForEvent("download");
  await page.locator("#html").click();
  const replay = (await downloadBytes(await htmlEvent)).toString("utf8");
  assert.match(replay, /<pre/);
  assert.doesNotMatch(replay, /<svg|<img|<canvas|<script/);
  await page.locator("#mode").selectOption("live");
  await page.waitForFunction(() =>
    document.getElementById("live-frame").srcdoc.includes("<pre"),
  );
  const frame = page.frameLocator("#live-frame");
  assert((await frame.locator("pre").textContent()).length > 1000);
  assert.match(
    await page.locator("#caption").textContent(),
    /No software scan result is assigned/,
  );
  await page.locator("#case").selectOption("styled-056");
  await frame.locator("span").first().waitFor({ state: "attached" });
  assert((await frame.locator("span").count()) > 100);
  report.checks.push(
    "Gzip replay expansion, HTML download, strict preformatted text and assisted selectable spans work without image/QR underlays.",
  );

  await page.locator("#case").selectOption("strict-021");
  await page.locator("#mode").selectOption("raw");
  await page.locator("#camera").selectOption("No scan");
  await page.locator("#reading").selectOption("Some words hard to read");
  const notes = 'Synthetic check: café 👻 — <img src=x onerror="alert(1)">';
  await page.locator("#conditions").fill(notes);
  const exportEvent = page.waitForEvent("download");
  await page.locator("#export").click();
  const exported = JSON.parse(
    (await downloadBytes(await exportEvent)).toString("utf8"),
  );
  assert.equal(exported.observations["strict-021|320|raw"].conditions, notes);
  await page.reload();
  assert.equal(await page.locator("#conditions").inputValue(), notes);
  await page.locator("#mode").selectOption("live");
  assert.equal(await page.locator("#conditions").inputValue(), "");
  assert.equal(await page.locator("#camera").inputValue(), "Not tested");
  await page.locator("#mode").selectOption("raw");
  assert.equal(await page.locator("#conditions").inputValue(), notes);
  const before = await page.evaluate(() =>
    localStorage.getItem("aqrobat-prose-review-pilot-01"),
  );
  const invalid = structuredClone(exported);
  invalid.observations["strict-021|320|raw|extra"] =
    invalid.observations["strict-021|320|raw"];
  await page.locator("#import").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(invalid)),
  });
  await page.waitForFunction(() =>
    document
      .getElementById("io-status")
      .textContent.includes("Nothing changed"),
  );
  assert.equal(
    await page.evaluate(() =>
      localStorage.getItem("aqrobat-prose-review-pilot-01"),
    ),
    before,
  );
  const fresh = await context.newPage();
  await fresh.goto(pathToFileURL(resolve(root, "index.html")).href);
  await fresh.evaluate(() =>
    localStorage.removeItem("aqrobat-prose-review-pilot-01"),
  );
  await fresh.reload();
  await fresh.locator("#import").setInputFiles({
    name: "notes.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(exported)),
  });
  await fresh.waitForFunction(() =>
    document
      .getElementById("io-status")
      .textContent.startsWith("Imported valid"),
  );
  assert.equal(await fresh.locator("#conditions").inputValue(), notes);
  assert.equal(await fresh.locator("img[src=x]").count(), 0);
  report.checks.push(
    "Synthetic UTF-8 notes survive export/import and reload, remain separate by raw/live view, reject malformed keys atomically, and never become executable HTML.",
  );
  await fresh.close();

  await page.locator("#case").selectOption("strict-021");
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("Synthetic clipboard denial");
        },
      },
    }),
  );
  const plainEvent = page.waitForEvent("download");
  await page.locator("#text").click();
  const plain = (await downloadBytes(await plainEvent)).toString("utf8");
  const dataPlain = await page.evaluate(
    () =>
      JSON.parse(document.getElementById("pilot-data").textContent).cases[0]
        .plainText,
  );
  assert.equal(plain, dataPlain);
  await page.locator("#copy-reply").click();
  assert(
    await page
      .locator("#reply")
      .evaluate((t) => t.selectionEnd === t.value.length),
  );
  report.checks.push(
    "Clipboard-denied plain-word download preserves every character; reply selection fallback works. Native clipboard destination fidelity is not tested.",
  );

  await page.evaluate(() =>
    localStorage.removeItem("aqrobat-prose-review-pilot-01"),
  );
  await page.reload();
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: resolve(root, "review-desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#scale").selectOption("960");
  await page.locator("#raw-img").evaluate((img) => img.decode());
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  const rawWidth = await page
    .locator("#raw-img")
    .evaluate((img) => img.getBoundingClientRect().width);
  assert(rawWidth <= 390);
  await page.locator("#mode").selectOption("live");
  await page.waitForFunction(() =>
    document.getElementById("live-frame").srcdoc.includes("<pre"),
  );
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  await page.locator("#mode").selectOption("raw");
  await page.locator("#case-title").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: resolve(root, "review-mobile.png"),
    fullPage: false,
  });
  report.checks.push(
    "390px layout has no document overflow in original-image or wide selectable-text modes; captions distinguish source/display size.",
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  report.errors = errors;
  report.externalRequests = external;
  report.status = "passed";
} finally {
  await browser.close();
}
await writeFile(
  resolve(root, "review-verification.json"),
  await format(JSON.stringify(report), { parser: "json" }),
);
console.log(JSON.stringify(report));

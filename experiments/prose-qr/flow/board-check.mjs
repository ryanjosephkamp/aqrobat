import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import assert from "node:assert/strict";
import { format } from "prettier";
const root = resolve("docs/research/prose-qr/phase-02");
const board = resolve(root, "index.html");
const sha = (b) => createHash("sha256").update(b).digest("hex");
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const checks = [],
  errors = [],
  requests = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 950 },
    acceptDownloads: true,
  });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (/^https?:/i.test(r.url())) requests.push(r.url());
  });
  await page.goto(pathToFileURL(board).href);
  await page.waitForFunction(
    () => !document.getElementById("save-html").disabled,
  );
  for (const [id, batch] of [
    ["band-023", "batch-02"],
    ["flow-011", "batch-01"],
    ["rect-1", "rectangles"],
    ["word-1", "word-style"],
  ]) {
    const l = JSON.parse(
      await readFile(resolve(root, batch, `${id}-layout.json`), "utf8"),
    );
    await page.selectOption("#choice", id);
    await page.waitForFunction(
      (id) =>
        document.getElementById("choice").value === id &&
        !document.getElementById("save-html").disabled &&
        document.getElementById("case-note").textContent.length > 0,
      id,
    );
    const reading = await page.locator("#reading").textContent();
    assert(reading.length >= 420);
    assert.equal(
      reading.trim().replace(/\s+/g, " "),
      l.plainText.replace(/\s+/g, " ").slice(0, reading.trim().length),
    );
    const metrics = await page.locator("#reading").evaluate((e) => ({
      size: parseFloat(getComputedStyle(e).fontSize),
      line: parseFloat(getComputedStyle(e).lineHeight),
      spanCount: e.querySelectorAll("span").length,
    }));
    assert.equal(metrics.size, 20);
    assert(metrics.line >= 24);
    assert(metrics.spanCount > 300);
    const htmlDownload = page.waitForEvent("download");
    await page.click("#save-html");
    const d = await htmlDownload;
    const bytes = await readFile(await d.path());
    const expected = gunzipSync(
      await readFile(resolve(root, batch, `${id}.html.gz`)),
    );
    assert.equal(sha(bytes), sha(expected));
    assert.equal(d.suggestedFilename(), `${id}-exact.html`);
    const textDownload = page.waitForEvent("download");
    await page.click("#save-text");
    const txt = await textDownload;
    assert.equal(await readFile(await txt.path(), "utf8"), l.plainText);
    checks.push({
      id,
      selectableCharacters: metrics.spanCount,
      typeSize: metrics.size,
      HTMLDownloadSha256: sha(bytes),
      TXTDownloadExact: true,
    });
  }
  await page.selectOption("#choice", "band-023");
  await page.waitForFunction(
    () => !document.getElementById("save-html").disabled,
  );
  await page.screenshot({ path: resolve(root, "board-desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: resolve(root, "board-phone-layout.png") });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.locator("#native-details summary").click();
  const frame = page.frameLocator("#native-holder iframe");
  await frame.locator("#text-body").waitFor();
  const source = JSON.parse(
    await readFile(resolve(root, "batch-02/band-023-layout.json"), "utf8"),
  );
  assert.equal(
    (await frame.locator(".line").allTextContents()).join("\n"),
    source.plainText,
  );
  assert.equal(
    await frame
      .locator("#text-body")
      .evaluate((e) => getComputedStyle(e).fontSize),
    "20px",
  );
  await page.waitForFunction(
    () => document.getElementById("native-holder").scrollLeft > 300,
  );
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  const view = await page.locator("#native-holder").evaluate((e) => ({
    scrollLeft: e.scrollLeft,
    scrollTop: e.scrollTop,
    viewportWidth: e.clientWidth,
    fullWidth: e.scrollWidth,
  }));
  assert.equal(errors.length, 0);
  assert.equal(requests.length, 0);
  const bytes = await readFile(board);
  await writeFile(
    resolve(root, "board-checks.json"),
    await format(
      JSON.stringify({
        testedAt: new Date().toISOString(),
        boardSha256: sha(bytes),
        checks,
        nativeSourceTextExact: true,
        nativeViewport: view,
        phoneWidthLayout: 390,
        pageErrors: errors,
        automaticExternalRequests: requests,
        classification:
          "Synthetic browser/offline file checks and agent visual inspection. Reflowed excerpt is not assigned native decoder results. No physical phone scan or human acceptance.",
      }),
      { parser: "json" },
    ),
    { flag: "wx" },
  );
  console.log(
    JSON.stringify({
      status: "passed",
      downloadCases: checks.length,
      nativeSourceTextExact: true,
      phoneWidthLayout: 390,
      errors: errors.length,
      externalRequests: requests.length,
    }),
  );
} finally {
  await browser.close();
}

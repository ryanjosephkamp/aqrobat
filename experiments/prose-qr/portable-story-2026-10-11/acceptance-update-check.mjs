import { chromium } from "playwright";
import assert from "node:assert/strict";
import { readFile, writeFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const root = resolve("docs/research/prose-qr/portable-story-2026-10-11");
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const original = await readFile(resolve(root, "index.html"));
const latest = await readFile(resolve(root, "index-latest.html"));
const extract = (html, tag) =>
  [
    ...html
      .toString()
      .matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "g")),
  ].map((m) => m[1]);
assert.deepEqual(extract(latest, "style"), extract(original, "style"));
assert.deepEqual(extract(latest, "script"), extract(original, "script"));
const acceptance = JSON.parse(
  await readFile(resolve(root, "OWNER-VARIANTS-ACCEPTANCE.json")),
);
assert.equal(acceptance.ownerStatement, "yes. both can scan both.");
for (const row of acceptance.observations) {
  assert.equal(sha(await readFile(row.path)), row.sha256);
}
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const network = [],
  errors = [],
  rows = [];
try {
  for (const width of [1280, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
    });
    const page = await context.newPage();
    page.on("request", (r) => {
      if (/^https?:/.test(r.url())) network.push(r.url());
    });
    page.on("pageerror", (e) => errors.push(e.message));
    const url = pathToFileURL(resolve(root, "index-latest.html")).href;
    await page.goto(url);
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator("#phone tbody tr").count(), 8);
    assert.match(
      await page.locator("#phone").innerText(),
      /Fourteen positive app\/surface cells and one negative cell/,
    );
    assert.match(
      await page.locator(".notice.good").first().innerText(),
      /yes\. both can scan both\./,
    );
    assert.equal(await page.locator("#ledger-body tr").count(), 138);
    await page.locator("#result-filter").selectOption("unused");
    assert.equal(await page.locator("#ledger-body tr").count(), 25);
    await page.locator("#result-filter").selectOption("control");
    assert.equal(await page.locator("#ledger-body tr").count(), 8);
    const geometry = await page.evaluate(() => ({
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    assert(geometry.scrollWidth <= width);
    const pending = [],
      broken = [];
    for (const href of await page
      .locator("a[href]")
      .evaluateAll((es) => es.map((e) => e.getAttribute("href")))) {
      if (!href || href.startsWith("#") || /^(https?:|data:|blob:)/.test(href))
        continue;
      try {
        await stat(fileURLToPath(new URL(href, url)));
      } catch {
        (["backup-final.json", "acceptance-update-seal.json"].includes(href)
          ? pending
          : broken
        ).push(href);
      }
    }
    assert.deepEqual(broken, []);
    rows.push({
      width,
      geometry,
      phoneRows: 8,
      ledgerRows: 138,
      pending,
      broken,
    });
    await context.close();
  }
  assert.deepEqual(network, []);
  assert.deepEqual(errors, []);
  const receipt = {
    at: new Date().toISOString(),
    purpose:
      "Append-only owner acceptance and guide verification; no new QR experiments.",
    sourceSha256: sha(await readFile(new URL(import.meta.url))),
    originalGuideSha256: sha(original),
    latestGuideSha256: sha(latest),
    browser: browser.version(),
    rows,
    network,
    errors,
    sameStylesAndScripts: true,
    ownerAcceptedFileHashesExact: true,
    imageCaptures: 0,
    readerCalls: 0,
    browserClosedInFinally: true,
  };
  await writeFile(
    resolve(root, "acceptance-update-check.json"),
    JSON.stringify(receipt, null, 2) + "\n",
    { flag: "wx" },
  );
  console.log(JSON.stringify(receipt));
} finally {
  await browser.close();
}

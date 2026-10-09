import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { gunzipSync } from "node:zlib";
import { format } from "prettier";
import assert from "node:assert/strict";
import { root, sha } from "./capture.mjs";
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const errors = [],
  requests = [];
let checks;
try {
  const page = await browser.newPage({
    viewport: { width: 1000, height: 900 },
    deviceScaleFactor: 1,
  });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (/^https?:/.test(r.url())) requests.push(r.url());
  });
  await page.goto(pathToFileURL(resolve(root, "index.html")).href);
  assert.equal(await page.title(), "Aqrobat · Prose QR research checkpoint");
  await page.locator("details").first().locator("summary").click();
  await page.locator("img").evaluate((e) => e.decode());
  const expected = [
    await readFile(resolve(root, "justified-01/raw/justified-1.png")),
    gunzipSync(
      await readFile(resolve(root, "justified-01/justified-1.html.gz")),
    ),
    await readFile(resolve(root, "CHECKPOINT.md")),
  ];
  const links = await page
    .locator("a[download]")
    .evaluateAll((es) =>
      es.map((e) => ({ name: e.download, href: e.getAttribute("href") })),
    );
  assert.equal(links.length, 3);
  const exports = links.map((x, i) => {
    const b = Buffer.from(x.href.split(",")[1], "base64");
    assert.equal(sha(b), sha(expected[i]));
    return { name: x.name, bytes: b.length, sha256: sha(b), exact: true };
  });
  await page.locator("details").first().locator("summary").click();
  const desktop = await page.screenshot();
  await writeFile(resolve(root, "reading-desktop.png"), desktop, {
    flag: "wx",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  const mobile = await page.screenshot();
  await writeFile(resolve(root, "reading-phone-width.png"), mobile, {
    flag: "wx",
  });
  await page.locator("details").nth(1).locator("summary").click();
  assert(
    (await page.locator("pre").textContent()).includes(
      "verification-final.json and custody.json",
    ),
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(requests, []);
  checks = {
    testedAt: new Date().toISOString(),
    sourceScriptSha256: sha(await readFile(new URL(import.meta.url))),
    htmlSha256: sha(await readFile(resolve(root, "index.html"))),
    exports,
    desktop: { width: 1000, height: 900, pngSha256: sha(desktop) },
    phoneWidth: {
      width: 390,
      height: 844,
      pngSha256: sha(mobile),
      pageOverflow: false,
    },
    pageErrors: errors,
    automaticExternalRequests: requests,
    limits:
      "Headless browser file reading/export-byte checks, not physical phone scan or native clipboard. Data URI bytes verified; operating-system download UI not exercised.",
  };
} finally {
  await browser.close();
}
await writeFile(
  resolve(root, "board-checks.json"),
  await format(JSON.stringify(checks), { parser: "json" }),
  { flag: "wx" },
);
console.log(JSON.stringify(checks));

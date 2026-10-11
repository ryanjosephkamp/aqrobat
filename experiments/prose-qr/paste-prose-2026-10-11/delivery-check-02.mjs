import { chromium } from "playwright";
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";

const base = resolve("docs/research/prose-qr/paste-prose-2026-10-11");
const out = resolve(base, "delivery-check-02");
const plan = {
  purpose:
    "Control-only delivery check after experiments stopped; no new prose or scanner input.",
  candidateCaptures: 0,
  readerCalls: 0,
  resourceCaptures: 1,
  screenshot:
    "One 1440x1100 guide viewport, presentation only; never used as a scanner input.",
  checks: [
    "Current studio acceptance copy and unchanged default native-tested DOCX download",
    "Guide shows all frozen cases, both failure and recovery filters, and all three owner-accepted cases",
    "All guide/studio local links and guide images resolve; expected closure metadata can be pending",
    "Guide and studio contain mobile horizontal overflow within their intended containers",
    "No external network requests or page script errors",
  ],
};
await mkdir(out);
const save = (name, data) =>
  writeFile(
    resolve(out, name),
    typeof data === "string" || Buffer.isBuffer(data)
      ? data
      : JSON.stringify(data, null, 2) + "\n",
    { flag: "wx" },
  );
const sha = (data) => createHash("sha256").update(data).digest("hex");
const paths = [
  "experiments/prose-qr/paste-prose-2026-10-11/delivery-check-02.mjs",
  "docs/research/prose-qr/paste-prose-2026-10-11/page-studio.html",
  "docs/research/prose-qr/paste-prose-2026-10-11/index.html",
  "docs/research/prose-qr/paste-prose-2026-10-11/LEDGER.json",
];
const sources = [];
for (const [i, path] of paths.entries()) {
  const data = await readFile(path);
  await save(`source-${i}.txt.gz`, gzipSync(data));
  sources.push({ path, bytes: data.length, sha256: sha(data) });
}
await save("PLAN.json", { at: new Date().toISOString(), ...plan, sources });
const ledger = JSON.parse(await readFile(resolve(base, "LEDGER.json")));
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const checks = [],
  errors = [],
  network = [],
  missing = [];
let captured = false;
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1,
    acceptDownloads: true,
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (/^https?:/.test(r.url())) network.push(r.url());
  });
  await page.goto(pathToFileURL(resolve(base, "page-studio.html")).href);
  assert.match(
    await page.locator(".accepted").innerText(),
    /both Samsung apps/,
  );
  assert.match(await page.locator(".accepted").innerText(), /extremely easily/);
  assert.match(
    await page.locator("#details").innerText(),
    /1114 words · 1 complete copy/,
  );
  const pending = page.waitForEvent("download");
  await page.locator("[data-save=docx]").click();
  const download = await pending;
  const docx = await readFile(await download.path());
  assert(docx.equals(await readFile(resolve(base, "word-08/input.docx"))));
  checks.push({
    check: plan.checks[0],
    pass: true,
    docxSha256: sha(docx),
    newProseGenerated: false,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  const studioWidth = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  assert(
    studioWidth.scroll <= studioWidth.client + 1,
    JSON.stringify(studioWidth),
  );
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto(pathToFileURL(resolve(base, "index.html")).href);
  assert.equal(
    await page.locator("#case-rows tr").count(),
    ledger.candidateCaptures,
  );
  await page.locator("#recovery").selectOption("vision");
  assert.equal(
    await page.locator("#case-rows tr").count(),
    ledger.candidateReaderSuccess.vision.exact,
  );
  await page.locator("#recovery").selectOption("none");
  assert.equal(await page.locator("#case-rows tr").count(), 30);
  await page.locator("#recovery").selectOption("phone");
  assert.equal(await page.locator("#case-rows tr").count(), 3);
  await page.locator("#recovery").selectOption("all");
  await page.locator("#search").fill("word-09");
  assert.equal(await page.locator("#case-rows tr").count(), 1);
  await page.locator("#search").fill("");
  for (const lane of [
    "browser prose",
    "native Word PDF",
    "studio native preview",
  ]) {
    await page.locator("#lane").selectOption(lane);
    assert.equal(
      await page.locator("#case-rows tr").count(),
      ledger.cases.filter((c) => c.lane === lane).length,
    );
  }
  await page.locator("#lane").selectOption("all");
  checks.push({
    check: plan.checks[1],
    pass: true,
    all: 51,
    recovery: 21,
    noRecovery: 30,
    ownerAcceptedCases: 3,
  });
  const images = await page.locator("img").evaluateAll((images) =>
    images.map((i) => ({
      path: i.getAttribute("src"),
      complete: i.complete,
      width: i.naturalWidth,
      height: i.naturalHeight,
    })),
  );
  assert(
    images.every((i) => i.complete && i.width === 816 && i.height === 1056),
  );
  const guideLinks = await page
    .locator("a[href],img[src]")
    .evaluateAll((nodes) => nodes.map((n) => n.href || n.src));
  for (const url of new Set(guideLinks)) {
    if (!url.startsWith("file:")) continue;
    const u = new URL(url);
    u.hash = "";
    try {
      await access(fileURLToPath(u));
    } catch {
      missing.push(fileURLToPath(u));
    }
  }
  assert.deepEqual(missing, []);
  checks.push({
    check: plan.checks[2],
    pass: true,
    localReferencesChecked: new Set(guideLinks).size,
    images,
    closureReceiptStatus:
      "Backup receipt is pending; MANIFEST is provisional until this delivery check closes. Final static verification follows closure.",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  const guideWidth = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  assert(
    guideWidth.scroll <= guideWidth.client + 1,
    JSON.stringify(guideWidth),
  );
  checks.push({ check: plan.checks[3], pass: true, studioWidth, guideWidth });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.screenshot({ path: resolve(out, "guide.png"), fullPage: false });
  captured = true;
  assert.deepEqual(errors, []);
  assert.deepEqual(network, []);
  checks.push({ check: plan.checks[4], pass: true });
  await save("results.json", {
    at: new Date().toISOString(),
    browser: browser.version(),
    checks,
    errors,
    network,
    missing,
    candidateCaptures: 0,
    readerCalls: 0,
    resourceCaptures: 1,
    capturePurpose: plan.screenshot,
  });
  console.log(
    JSON.stringify({
      checks: checks.length,
      passed: true,
      resourceCaptures: 1,
      candidateCaptures: 0,
      readerCalls: 0,
    }),
  );
} catch (e) {
  await save("STOP.json", {
    at: new Date().toISOString(),
    error: e.stack || String(e),
    checks,
    errors,
    network,
    missing,
    resourceCaptures: captured ? 1 : 0,
    candidateCaptures: 0,
    readerCalls: 0,
  });
  throw e;
} finally {
  await browser.close();
}

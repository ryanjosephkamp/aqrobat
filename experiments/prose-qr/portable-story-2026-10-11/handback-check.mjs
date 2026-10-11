import { chromium } from "playwright";
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
const root = resolve("docs/research/prose-qr/portable-story-2026-10-11");
const out = resolve(root, process.argv[2] || "visual-check-04");
await mkdir(out);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const save = (n, v) =>
  writeFile(
    resolve(out, n),
    typeof v === "string" || Buffer.isBuffer(v)
      ? v
      : JSON.stringify(v, null, 2) + "\n",
    { flag: "wx" },
  );
const cases = [
  { id: "guide-desktop", file: "index.html", width: 1280, height: 1000 },
  { id: "guide-mobile", file: "index.html", width: 390, height: 844 },
  { id: "tool-desktop", file: "workbench.html", width: 1280, height: 1000 },
  {
    id: "tool-mobile",
    file: "workbench.html",
    width: 390,
    height: 844,
    capture: false,
  },
];
const source = await readFile(new URL(import.meta.url));
await save("source.mjs.txt.gz", gzipSync(source));
const sources = [];
for (const n of ["index.html", "workbench.html"]) {
  const b = await readFile(resolve(root, n));
  await save(n + ".txt.gz", gzipSync(b));
  sources.push({ path: n, sha256: sha(b) });
}
await save("manifest.json", {
  at: new Date().toISOString(),
  sourceSha256: sha(source),
  sources,
  cases,
  purpose:
    "Delivery UI/resource screenshots only. No QR candidates or reader calls.",
  newResourceCaptureSlots: 3,
  immediateRepeats: 3,
  ordinaryReaderCalls: 0,
  resourceCapturesBeforeThisCheck: 6,
  totalResourceCaptureSlots: 9,
  plannedResourceSlotsAcrossRun: 12,
  priorLinkGate:
    "Visual02 stopped before captures because the companion final-workbench receipt had not finished writing. It now exists. The same three unexecuted resource allocations carry forward; no decoder calls or candidate captures.",
  priorUiFailure:
    "First guide resource repeat differed before files were saved; no QR reader calls. Its abort and exact source archive are retained. Three later planned resources were unused. This prospective UI-only check settles scroll and retains screenshots before asserting repeats.",
  pendingReceiptLinks: ["delivery-seal.json", "backup-final.json"],
});
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const rows = [],
  network = [],
  errors = [];
try {
  for (const item of cases) {
    const context = await browser.newContext({
      viewport: { width: item.width, height: item.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push({ id: item.id, error: e.message }));
    page.on("request", (r) => {
      if (/^https?:/.test(r.url())) network.push(r.url());
    });
    const url = pathToFileURL(resolve(root, item.file)).href;
    await page.goto(url);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(async () => {
      await Promise.all([...document.images].map((i) => i.decode()));
      await new Promise((done) =>
        requestAnimationFrame(() => requestAnimationFrame(done)),
      );
    });
    let pngSha = null,
      repeatExact = null;
    if (item.capture !== false) {
      const one = await page.screenshot({
        fullPage: true,
        animations: "disabled",
      });
      const two = await page.screenshot({
        fullPage: true,
        animations: "disabled",
      });
      await save(item.id + ".png", one);
      await save(item.id + "-repeat.png", two);
      assert(one.equals(two), "UI screenshot immediate repeat changed");
      pngSha = sha(one);
      repeatExact = true;
    }
    if (item.file === "index.html") {
      assert.equal(await page.locator("#ledger-body tr").count(), 138);
      await page.locator("#result-filter").selectOption("unused");
      assert.equal(await page.locator("#ledger-body tr").count(), 25);
      await page.locator("#result-filter").selectOption("control");
      assert.equal(await page.locator("#ledger-body tr").count(), 8);
      await page.locator("#search").fill("No matching case");
      assert.equal(await page.locator("#ledger-body tr").count(), 0);
      await page.locator("#search").fill("");
      await page.locator("#result-filter").selectOption("all");
    } else {
      assert.match(
        await page.locator("#status").innerText(),
        /Generated locally/,
      );
      assert(await page.locator("#open-text").isEnabled());
      await page.frameLocator("#preview").locator("#text-body").waitFor();
    }
    const geometry = await page.evaluate(() => ({
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    }));
    assert(
      geometry.scrollWidth <= geometry.width,
      "Unexpected outer page overflow",
    );
    const broken = [];
    const pending = [];
    for (const href of await page
      .locator("a[href]")
      .evaluateAll((es) => es.map((e) => e.getAttribute("href")))) {
      if (
        !href ||
        href.startsWith("#") ||
        /^(?:https?:|data:|blob:)/.test(href)
      )
        continue;
      const path = fileURLToPath(new URL(href, url));
      try {
        await stat(path);
      } catch {
        if (["delivery-seal.json", "backup-final.json"].includes(href))
          pending.push(href);
        else broken.push(href);
      }
    }
    assert.deepEqual(broken, []);
    rows.push({
      ...item,
      geometry,
      sha256: pngSha,
      repeatExact,
      broken,
      pending,
    });
    await context.close();
  }
  assert.deepEqual(network, []);
  assert.deepEqual(errors, []);
  await save("summary.json", {
    at: new Date().toISOString(),
    browser: browser.version(),
    rows,
    network,
    errors,
    candidateCaptures: 0,
    resourceCaptureSlots: 3,
    readerCalls: 0,
    browserClosedInFinally: true,
  });
  console.log(
    JSON.stringify({
      surfaces: rows.length,
      exactRepeats: rows.filter((r) => r.repeatExact).length,
      network,
      errors,
    }),
  );
} catch (e) {
  await save("abort.json", {
    at: new Date().toISOString(),
    error: e.stack,
    rows,
    network,
    errors,
  });
  throw e;
} finally {
  await browser.close();
}

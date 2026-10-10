import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import jsQR from "jsqr";
import { createHash } from "node:crypto";
import { generate } from "../src/core.mjs";

const executablePath =
  process.env.CHROME_PATH ||
  (existsSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
    ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    : undefined);
const server = spawn(process.execPath, ["tools/serve.mjs"], {
  env: { ...process.env, PORT: "0" },
  stdio: ["ignore", "pipe", "pipe"],
});
const url = await new Promise((resolve, reject) => {
  const timer = setTimeout(
    () => reject(new Error("Local server timeout")),
    15_000,
  );
  server.once("error", reject);
  server.once("exit", (code) =>
    reject(new Error(`Local server exited ${code}`)),
  );
  server.stdout.on("data", (data) => {
    const match = data.toString().match(/http:\/\/127\.0\.0\.1:\d+/);
    if (match) {
      clearTimeout(timer);
      resolve(match[0]);
    }
  });
});
let browser;
const report = {
  matrixEvidence: "separate unit decoder tests",
  nativePhone: "not run",
  physicalPrint: "not run",
  checks: [],
  rawCharacterDecodes: [],
};
try {
  browser = await chromium.launch({ headless: true, executablePath });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
  });
  const page = await context.newPage(),
    errors = [],
    requests = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => requests.push(r.url()));
  await page.goto(url);
  await page.waitForFunction(
    () => document.getElementById("preview").width === 656,
  );
  assert.equal(await page.locator("#error").textContent(), "");
  for (const width of [200, 329, 701, 1536]) {
    await page.locator("#width").fill(String(width));
    assert.equal(
      await page.locator("#preview").getAttribute("width"),
      String(width),
    );
  }
  await page.locator("#width").fill("656");
  const hostile = "<img src=x onerror=alert(1)> / 東京";
  await page.locator("#payload").fill(hostile);
  assert.equal(await page.locator("#error").textContent(), "");
  assert.equal(await page.locator("#make img").count(), 0);
  await page.locator("#payload").fill("https://example.com");
  for (const glyph of [
    "#",
    "@",
    "M",
    ".",
    "█",
    "⚫️",
    "🙂",
    "👨‍👩‍👧‍👦",
    "🤣☄️",
    "abc123,.//';",
    "🤣.☄️1:a",
  ]) {
    await page.locator("#glyph").fill(glyph);
    const image = await page.locator("#preview").evaluate(async (canvas) => {
      const pixels = canvas
        .getContext("2d")
        .getImageData(0, 0, canvas.width, canvas.height).data;
      const data = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.readAsDataURL(new Blob([pixels.buffer]));
      });
      return { width: canvas.width, height: canvas.height, data };
    });
    const pixels = Buffer.from(image.data, "base64");
    const result = jsQR(
      new Uint8ClampedArray(
        pixels.buffer,
        pixels.byteOffset,
        pixels.byteLength,
      ),
      image.width,
      image.height,
    );
    report.rawCharacterDecodes.push({
      glyph,
      payload: "https://example.com",
      size: 656,
      density: "4x2",
      font: "Menlo",
      stroke: 0.1,
      ecc: "M",
      decoder: "jsQR 1.4.0",
      recipe: generate("https://example.com", { glyph }).recipe,
      rgbaSha256: createHash("sha256").update(pixels).digest("hex"),
      result:
        result?.data === "https://example.com"
          ? "exact payload recovered"
          : "not recovered",
    });
  }
  await page.locator("#preset").selectOption("#");
  await page.locator("#glyph").fill("\u200b");
  assert.match(await page.locator("#error").textContent(), /one visible/);
  assert(await page.locator("#png").isDisabled());
  await page.locator("#glyph").fill("🤣.☄️1:a🤣");
  assert.match(await page.locator("#palette-info").textContent(), /6 unique/);
  const artwork = await page.locator("#preview").evaluate((c) => c.toDataURL());
  await page.locator(".appearance summary").click();
  assert.equal(await page.locator("#theme").inputValue(), "violet");
  for (const theme of ["ocean", "ember", "garden", "midnight", "violet"]) {
    await page.locator("#theme").selectOption(theme);
    assert.equal(await page.locator("html").getAttribute("data-theme"), theme);
    assert.equal(
      await page.locator("#preview").evaluate((c) => c.toDataURL()),
      artwork,
    );
  }
  for (const color of ["blue", "coral", "green", "gold", "violet"]) {
    await page.locator("#icon-color").selectOption(color);
    assert.equal(
      await page.locator("#preview").evaluate((c) => c.toDataURL()),
      artwork,
    );
  }
  await page.locator("#theme").selectOption("midnight");
  await page.locator("#icon-color").selectOption("coral");
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("aqrobat-appearance-v1")).icon ===
      "coral",
  );
  await page.locator("#recipe").click();
  await page.reload();
  await page.waitForFunction(
    () => document.documentElement.dataset.theme === "midnight",
  );
  assert.equal(await page.locator("#icon-color").inputValue(), "coral");
  assert.deepEqual(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("aqrobat-appearance-v1")),
    ),
    { theme: "midnight", icon: "coral" },
  );
  assert.equal(await page.locator("footer .social a").count(), 5);
  assert.equal(
    await page.locator('footer a[title="LinkedIn"]').getAttribute("href"),
    "https://www.linkedin.com/in/ryanjosephkamp/",
  );
  assert.equal(
    await page.locator('footer a[title="X"]').getAttribute("href"),
    "https://x.com/ryanjosephkamp",
  );
  await page.locator(".appearance summary").click();
  await page.locator("#theme").selectOption("violet");
  await page.locator("#glyph").fill("🤣.☄️1:a🤣");
  report.checks.push(
    "mixed palettes, theme/icon selection and appearance-only persistence; themes do not alter QR pixels; personal footer links",
  );
  for (const [id, name] of [
    ["png", "aqrobat.png"],
    ["svg", "aqrobat.svg"],
    ["txt", "aqrobat.txt"],
    ["recipe", "aqrobat-recipe.json"],
    ["html", "aqrobat-print.html"],
  ]) {
    const event = page.waitForEvent("download");
    await page.locator(`#${id}`).click();
    const download = await event;
    assert.equal(download.suggestedFilename(), name);
    const data = await readFile(await download.path());
    assert(data.length > 100);
    if (id === "recipe") {
      const recipe = JSON.parse(data);
      assert.equal(recipe.payload, "https://example.com");
      assert.equal(recipe.schema, "aqrobat-recipe-v2");
      assert.equal(recipe.options.glyph, "🤣.☄️1:a🤣");
      await page.locator("#import-recipe").setInputFiles({
        name: "recipe.json",
        mimeType: "application/json",
        buffer: data,
      });
      await page.waitForFunction(() =>
        document
          .getElementById("status")
          .textContent.includes("Recipe loaded locally"),
      );
      assert.match(
        await page.locator("#status").textContent(),
        /loaded locally/,
      );
    }
    if (id === "html") {
      await mkdir("test-results", { recursive: true });
      await download.saveAs("test-results/print-sheet.html");
      const sheet = await context.newPage();
      await sheet.goto(
        pathToFileURL(resolve("test-results/print-sheet.html")).href,
      );
      assert.equal(await sheet.locator("img").count(), 1);
      assert.equal(
        await sheet.locator("pre").textContent(),
        await page.locator("#raw").inputValue(),
      );
      assert(
        await sheet
          .locator("img")
          .evaluate((e) => e.complete && e.naturalWidth === 656),
      );
      await sheet.close();
    }
  }
  report.checks.push(
    "continuous size, validation, hostile input, and five exports/recipe import",
  );
  // Deny clipboard deliberately: manual selection remains a useful fallback.
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: () => Promise.reject(new Error("test denied")) },
    }),
  );
  await page.locator("#copy").click();
  assert.match(await page.locator("#status").textContent(), /selected below/);
  await page.locator("#compare").click();
  assert.equal(await page.locator("#grid .test-card").count(), 12);
  const select = page.locator(".test-card select").first();
  await select.selectOption("pass");
  assert.match(await page.locator("#status").textContent(), /Name the phone/);
  await page
    .locator("#scanner")
    .fill("AUTOMATED UI FIXTURE — not a phone result");
  await select.selectOption("conditional");
  const event = page.waitForEvent("download");
  await page.locator("#export-results").click();
  const d = await event;
  const data = await readFile(await d.path());
  assert.equal(JSON.parse(data).records.length, 1);
  await page.locator("#import-results").setInputFiles({
    name: "results.json",
    mimeType: "application/json",
    buffer: data,
  });
  await page.waitForFunction(() =>
    document.getElementById("status").textContent.includes("1 total"),
  );
  assert.match(await page.locator("#status").textContent(), /1 total/);
  const bad = JSON.parse(data);
  bad.records[0].outcome = "pass";
  await page.locator("#import-results").setInputFiles({
    name: "conflict.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(bad)),
  });
  await page.waitForFunction(() =>
    document.getElementById("status").textContent.includes("Conflicting"),
  );
  assert.match(await page.locator("#status").textContent(), /Conflicting/);
  report.checks.push(
    "clipboard fallback; bounded grid; recorded/exported/imported synthetic observation; atomic conflicting import rejection",
  );
  await page.emulateMedia({ media: "print" });
  assert.equal(
    await page.locator("header").evaluate((e) => getComputedStyle(e).display),
    "none",
  );
  assert(
    Math.abs(
      (await page
        .locator(".test-card canvas")
        .first()
        .evaluate((e) => e.getBoundingClientRect().width)) -
        (65 * 96) / 25.4,
    ) < 1,
  );
  await page.emulateMedia({ media: "screen" });
  await mkdir("test-results", { recursive: true });
  await page.locator("#recipe").click();
  await page.reload();
  await page.waitForFunction(
    () => document.getElementById("preview").width === 656,
  );
  await page.screenshot({ path: "test-results/desktop.png" });
  for (const width of [320, 390, 760]) {
    await page.setViewportSize({ width, height: 844 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/mobile.png" });
  await page.locator("footer").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/footer-mobile.png" });
  report.checks.push(
    "desktop/mobile layout and 65 mm print CSS; no physical print test",
  );
  const offline = await context.newPage();
  await offline.goto(
    new URL("../downloads/aqrobat-offline.html", import.meta.url).href,
  );
  await offline.waitForFunction(
    () => document.getElementById("preview").width === 656,
  );
  assert.equal(await offline.locator("#error").textContent(), "");
  await offline.locator("#glyph").fill("🇺🇸💩👻🛸");
  assert.equal(await offline.locator("#error").textContent(), "");
  await offline.locator(".appearance summary").click();
  await offline.locator("#theme").selectOption("midnight");
  assert.equal(
    await offline.locator("html").getAttribute("data-theme"),
    "midnight",
  );
  report.checks.push("self-contained offline file works from file://");
  assert.deepEqual(errors, []);
  assert(requests.every((r) => r.startsWith(url)));
  report.checks.push(
    "no page errors or third-party requests in source-page checks",
  );
  report.browser = browser.version();
  await writeFile(
    "test-results/browser.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  if (browser) await browser.close();
  server.kill("SIGTERM");
}

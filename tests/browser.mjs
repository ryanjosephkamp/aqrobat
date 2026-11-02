import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import jsQR from "jsqr";
import { createHash } from "node:crypto";
import { generate, parsePalette } from "../src/core.mjs";
import { wideGlyph, DARK_TILES } from "../src/portable.mjs";
import { readBarcodes, prepareZXingModule } from "zxing-wasm/reader";

await prepareZXingModule({
  overrides: {
    wasmBinary: Uint8Array.from(
      await readFile(
        new URL(import.meta.resolve("zxing-wasm/reader/zxing_reader.wasm")),
      ),
    ).buffer,
  },
  fireImmediately: true,
});

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
const automaticCorners = (glyph) => {
  const palette = parsePalette(glyph);
  return (
    palette.every(wideGlyph) && !palette.every((g) => DARK_TILES.includes(g))
  );
};
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
  // Exports other than PNG live in the More menu.
  async function exportFrom(id) {
    if (id !== "png") await page.locator(".exports-menu summary").click();
    await page.locator(`#${id}`).click();
  }
  await page.locator("#more-settings summary").click();
  for (const [id, label, format] of [
    ["slack", "Copy for Slack", "plain"],
    ["markdown", "Copy for GitHub or Markdown", "markdown"],
    ["image", "Copy image", null],
    ["gmail", "Copy for Gmail", null],
  ]) {
    await page.locator(`#destinations [data-value="${id}"]`).click();
    assert.equal(await page.locator("#copy-label").textContent(), label);
    assert.equal(
      await page
        .locator(`#destinations [data-value="${id}"]`)
        .getAttribute("aria-checked"),
      "true",
    );
    if (format)
      assert.equal(
        await page
          .locator(`#paste-preview pre[data-format="${format}"]`)
          .count(),
        1,
      );
  }
  assert.equal(
    await page.locator("#paste-preview [data-aqrobat-layout]").count(),
    1,
  );
  report.checks.push(
    "destination choice relabels copy and switches the pasted preview format",
  );
  // Characters outside the tested ones still copy, with a note and a
  // one-tap switch to emoji squares.
  assert.equal(
    await page.locator("#paste-check").isHidden(),
    (await page.locator("#glyph").inputValue()) === "⬛",
  );
  await page.locator('#presets [aria-label="Grapes"]').click();
  assert.match(
    await page.locator("#paste-check").textContent(),
    /^Experimental\. Dark emoji with dark corners/,
  );
  // Emoji codes get ⬛ corners until a part is chosen, in the image too.
  // "Same as code" turns them off, with a warning and a one-tap way back.
  const partLabel = (part) =>
    page.locator(`#part-${part}`).getAttribute("aria-label");
  assert.equal(await partLabel("corners"), "Corner frames: ⬛. Change");
  // ZXing reads the artwork; jsQR rarely reads glyph images at full size.
  {
    const [pixels, width, height] = await page
      .locator("#preview")
      .evaluate((canvas) => [
        Array.from(
          canvas
            .getContext("2d")
            .getImageData(0, 0, canvas.width, canvas.height).data,
        ),
        canvas.width,
        canvas.height,
      ]);
    const [found] = await readBarcodes(
      { data: new Uint8ClampedArray(pixels), width, height },
      { formats: ["QRCode"], tryHarder: true, maxNumberOfSymbols: 1 },
    );
    assert.equal(found?.text, "https://example.com");
  }
  await page.locator("#part-corners").click();
  await page
    .locator("#picker-choices button", { hasText: "Same as code" })
    .click();
  assert(!(await page.locator("#picker").evaluate((d) => d.open)));
  assert.equal(
    await partLabel("corners"),
    "Corner frames: Same as code. Change",
  );
  assert.match(
    await page.locator("#paste-check").textContent(),
    /^The corners may not be found\./,
  );
  assert(await page.locator("#parts-reset").isVisible());
  await page.locator("#paste-check button").click();
  assert.equal(await partLabel("corners"), "Corner frames: ⬛. Change");
  assert(await page.locator("#parts-reset").isHidden());
  // The picker searches names and keywords and remembers recent picks.
  await page.locator("#glyph-emoji").click();
  await page.locator("#picker-search").fill("ufo");
  await page.waitForFunction(
    () => document.querySelectorAll("#picker-results .emoji-cell").length,
  );
  const ufo = await page
    .locator("#picker-results .emoji-cell")
    .evaluateAll((cells) => cells.map((c) => c.dataset.glyph));
  assert(ufo.includes("🛸") && ufo.includes("👽"));
  await page.locator("#picker-search").press("Enter");
  assert.equal(await page.locator("#glyph").inputValue(), ufo[0]);
  await page.locator("#glyph-emoji").click();
  await page.waitForFunction(
    () => !document.getElementById("picker-recent").hidden,
  );
  assert.equal(
    await page
      .locator("#picker-recent .emoji-cell")
      .first()
      .getAttribute("data-glyph"),
    ufo[0],
  );
  await page.locator("#picker-search").fill("face");
  const faces = await page
    .locator("#picker-results .emoji-cell:visible")
    .count();
  await page.locator("#picker-dark").check();
  const darkFaces = await page
    .locator("#picker-results .emoji-cell:visible")
    .count();
  assert(darkFaces > 0 && darkFaces < faces);
  await page.keyboard.press("Escape");
  assert(!(await page.locator("#picker").evaluate((d) => d.open)));
  // Any typed character can fill a part.
  await page.locator('#presets [aria-label="Hash"]').click();
  await page.locator("#part-light").click();
  await page.locator("#picker-search").fill("·");
  await page.locator("#picker-choices .typed").click();
  assert.equal(await partLabel("light"), "Light squares: ·. Change");
  assert.match(await page.locator("#raw").inputValue(), /^·+\n/u);
  await page.locator("#parts-reset").click();
  assert.equal(await partLabel("light"), "Light squares: Blank. Change");
  report.checks.push(
    "emoji codes get ⬛ corners in the image and pasted text and still decode; Same as code turns them off with a warning and a fix; the picker searches keywords, filters dark emoji, remembers recent picks, and takes typed characters for parts",
  );
  await page.locator('#presets [aria-label="Face"]').click();
  assert.match(
    await page.locator("#paste-check").textContent(),
    /^Likely too light to scan\./,
  );
  await page.locator("#paste-check button").click();
  assert.equal(await page.locator("#glyph").inputValue(), "⬛");
  assert(await page.locator("#paste-check").isHidden());
  await page.locator('#squares [aria-label="Blue squares"]').click();
  await page.locator('#destinations [data-value="image"]').click();
  await page.locator("#tab-pasted").click();
  assert.equal(await page.locator("#paste-preview img").count(), 1);
  await page.locator('#destinations [data-value="gmail"]').click();
  await page.locator('#presets [aria-label="Hash"]').click();
  await page.locator("#density").selectOption("4x2");
  assert(
    await page
      .locator(".brand-mark")
      .evaluate((img) => img.complete && img.naturalWidth === 128),
  );
  report.checks.push(
    "untested characters copy with an experimental note, light emoji get a too-light warning, and Use emoji squares switches; image destination previews the PNG; rocket logo loads",
  );
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
      // The page gives emoji other than the squares ⬛ corners.
      recipe: generate("https://example.com", {
        glyph,
        ...(automaticCorners(glyph)
          ? { parts: { corners: "⬛", centers: "⬛" } }
          : {}),
      }).recipe,
      rgbaSha256: createHash("sha256").update(pixels).digest("hex"),
      result:
        result?.data === "https://example.com"
          ? "exact payload recovered"
          : "not recovered",
    });
  }
  await page.locator('#presets [data-value="#"]').click();
  assert.equal(
    await page
      .locator('#presets [data-value="#"]')
      .getAttribute("aria-pressed"),
    "true",
  );
  await page.locator("#glyph").fill("\u200b");
  assert.match(await page.locator("#error").textContent(), /one visible/);
  assert(await page.locator("#png").isDisabled());
  await page.locator("#glyph").fill("🤣.☄️1:a🤣");
  assert.match(await page.locator("#palette-info").textContent(), /6 unique/);
  const artwork = await page.locator("#preview").evaluate((c) => c.toDataURL());
  await page.locator(".appearance summary").click();
  assert.equal(await page.locator("#theme").inputValue(), "system");
  for (const theme of ["light", "dark", "system"]) {
    await page.locator("#theme").selectOption(theme);
    assert.equal(await page.locator("html").getAttribute("data-theme"), theme);
    assert.equal(
      await page.locator("#preview").evaluate((c) => c.toDataURL()),
      artwork,
    );
  }
  await page.locator("#theme").selectOption("dark");
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("aqrobat-appearance-v1"))?.theme ===
      "dark",
  );
  await exportFrom("recipe");
  await page.reload();
  await page.waitForFunction(
    () => document.documentElement.dataset.theme === "dark",
  );
  assert.deepEqual(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("aqrobat-appearance-v1")),
    ),
    { theme: "dark" },
  );
  assert.equal(await page.locator("footer .social a").count(), 5);
  assert.equal(
    await page.locator('footer a[title="LinkedIn"]').getAttribute("href"),
    "https://www.linkedin.com/in/rjk1999",
  );
  assert.equal(
    await page.locator('footer a[title="X"]').getAttribute("href"),
    "https://x.com/ryanjosephkamp",
  );
  await page.locator(".appearance summary").click();
  await page.locator("#theme").selectOption("system");
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
    await exportFrom(id);
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
      // The sheet prints the monospace text, the same as the TXT export.
      assert.equal(
        await sheet.locator("pre").textContent(),
        await page.evaluate(async () => {
          const { plainText } = await import("/src/text.mjs");
          const { generate } = await import("/src/core.mjs");
          const $ = (id) => document.getElementById(id);
          const [repeatX, repeatY] = $("density").value.split("x").map(Number);
          return plainText(
            generate($("payload").value, {
              glyph: $("glyph").value,
              repeatX,
              repeatY,
              ecc: $("ecc").value,
              boost: $("boost").checked,
              width: Number($("width").value),
              font: $("font").value,
            }),
          ).text;
        }),
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
  await page.locator("#copy-destination").click();
  assert.match(await page.locator("#status").textContent(), /selected below/);
  assert.equal(
    await page
      .locator("#raw")
      .evaluate((el) => el.value.slice(el.selectionStart, el.selectionEnd)),
    await page.locator("#raw").inputValue(),
  );
  await page.locator("#compare").click();
  assert.equal(await page.locator("#grid .test-card").count(), 12);
  assert.equal(await page.locator("#paste-grid .test-card").count(), 6);
  assert.equal(
    await page
      .locator('#paste-grid .test-card[data-output="tiles"] pre')
      .count(),
    3,
  );
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
    document.getElementById("status").textContent.includes("1 result in total"),
  );
  assert.match(
    await page.locator("#status").textContent(),
    /1 result in total/,
  );
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
  await exportFrom("recipe");
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
  // One column: the preview follows the link field, and the copy bar takes
  // over the main action while the settings below are in view.
  const top = (selector) =>
    page.evaluate((s) => document.querySelector(s).offsetTop, selector);
  assert(
    (await top("#payload")) < (await top(".preview-card")) &&
      (await top(".preview-card")) < (await top("#presets")),
  );
  const dock = page.locator("#dock");
  assert.equal(await dock.getAttribute("data-show"), "false");
  await page.locator("#destinations").scrollIntoViewIfNeeded();
  await page.waitForFunction(
    () => document.getElementById("dock").dataset.show === "true",
  );
  assert.equal(await page.locator("#dock-title").textContent(), "Gmail");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.locator("#dock-copy").click();
  await page.waitForFunction(
    () => document.getElementById("dock-copy-label").textContent === "Copied",
  );
  await page.locator("#dock-peek").click();
  await page.waitForFunction(
    () => document.getElementById("dock").dataset.show === "false",
  );
  report.checks.push("phone layout order and copy bar");
  // Android refuses clipboard writes near 1 MB while Chrome reports success,
  // so a large formatted copy there keeps only its plain text.
  {
    const android = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent:
        "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
    });
    await android.grantPermissions(["clipboard-read", "clipboard-write"]);
    const phone = await android.newPage();
    await phone.goto(url);
    await phone.locator("#more-settings summary").click();
    await phone.locator('#destinations [data-value="gmail"]').click();
    await phone.locator("#copy-destination").click();
    await phone.waitForFunction(() =>
      document.getElementById("status").textContent.startsWith("Copied"),
    );
    assert.match(
      await phone.locator("#status").textContent(),
      /^Copied for Gmail as plain text/,
    );
    const clip = await phone.evaluate(async () => {
      const [item] = await navigator.clipboard.read();
      return {
        types: item.types,
        text: await (await item.getType("text/plain")).text(),
      };
    });
    assert.deepEqual(clip.types, ["text/plain"]);
    assert.equal(clip.text, await phone.locator("#raw").inputValue());
    await android.close();
  }
  report.checks.push("large formatted copies keep plain text on Android");
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
  // The offline file carries the emoji list inline.
  await offline.locator("#glyph-emoji").click();
  await offline.locator("#picker-search").fill("grapes");
  await offline.waitForFunction(
    () => document.querySelectorAll("#picker-results .emoji-cell").length,
  );
  await offline.locator("#picker-results .emoji-cell").first().click();
  assert.equal(await offline.locator("#glyph").inputValue(), "🍇");
  await offline.locator(".appearance summary").click();
  await offline.locator("#theme").selectOption("dark");
  assert.equal(
    await offline.locator("html").getAttribute("data-theme"),
    "dark",
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
// zxing-wasm keeps handles open; exit explicitly.
process.exit(0);

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import jsQR from "jsqr";

const out = resolve("test-results/text-layout");
await mkdir(out, { recursive: true });
const server = spawn(process.execPath, ["tools/serve.mjs"], {
  env: { ...process.env, PORT: "0" },
  stdio: ["ignore", "pipe", "pipe"],
});
const url = await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.stdout.on("data", (d) => {
    const m = String(d).match(/http:\/\/127\.0\.0\.1:\d+/);
    if (m) resolve(m[0]);
  });
});
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME_PATH ||
    (existsSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
      ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      : undefined),
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
  permissions: ["clipboard-read", "clipboard-write"],
});
const page = await context.newPage(),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const report = {
  checks: [],
  nativePhone: "not run",
  physicalPrint: "not run",
  samples: [],
};
try {
  await page.goto(url);
  await page.waitForFunction(
    () => document.getElementById("preview").width === 656,
  );
  const fixtures = [
    [
      "rocket",
      {
        schema: "aqrobat-recipe-v2",
        payload: "https://example.com",
        options: {
          glyph: "🚀",
          repeatX: 1,
          repeatY: 1,
          ecc: "L",
          boost: true,
          width: 1536,
          font: "Menlo",
          stroke: 0.1,
        },
      },
    ],
    [
      "circle",
      {
        schema: "aqrobat-recipe-v2",
        payload: "https://example.com",
        options: {
          glyph: "⚫️",
          repeatX: 1,
          repeatY: 1,
          ecc: "M",
          boost: true,
          width: 724,
          font: "Menlo",
          stroke: 0.1,
        },
      },
    ],
    [
      "hash",
      {
        schema: "aqrobat-recipe-v1",
        payload: "https://english-openlist.pages.dev/",
        options: {
          glyph: "#",
          repeatX: 1,
          repeatY: 1,
          ecc: "M",
          boost: true,
          width: 656,
          font: "Menlo",
          stroke: 0.1,
        },
      },
    ],
  ];
  for (const [name, recipe] of fixtures) {
    await page.locator("#import-recipe").setInputFiles({
      name: "recipe.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(recipe)),
    });
    await page.waitForFunction(() =>
      document.getElementById("status").textContent.includes("Recipe loaded"),
    );
    const geometry = await page.locator("#raw").evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      rows: el.rows,
      text: el.value,
    }));
    assert(geometry.scrollHeight <= geometry.clientHeight + 1);
    assert(geometry.scrollWidth <= geometry.clientWidth + 1);
    const before = await page
      .locator("#preview")
      .evaluate((c) => c.toDataURL());
    await page.locator("#filename").fill(name);
    for (const [id, suffix] of [
      ["txt", ".txt"],
      ["rtf", ".rtf"],
      ["text-html", "-text.html"],
    ]) {
      const event = page.waitForEvent("download");
      await page.locator(`#${id}`).click();
      const d = await event;
      assert.equal(d.suggestedFilename(), name + suffix);
      await d.saveAs(resolve(out, name + suffix));
    }
    await page.locator("#copy-formatted").click();
    await page.waitForFunction(() =>
      document
        .getElementById("status")
        .textContent.startsWith("Formatted text copied."),
    );
    const clipboard = await page.evaluate(async () => {
      const items = await navigator.clipboard.read();
      const item = items[0];
      return {
        types: item.types,
        html: await (await item.getType("text/html")).text(),
        text: await (await item.getType("text/plain")).text(),
      };
    });
    assert.equal(clipboard.text, geometry.text);
    assert(!/<(?:img|canvas|svg)\b/i.test(clipboard.html));
    const pasted = await context.newPage();
    await pasted.goto(url);
    await pasted.evaluate(() => {
      document.body.innerHTML = '<div id="paste" contenteditable="true"></div>';
    });
    await pasted.locator("#paste").focus();
    await pasted.keyboard.press("ControlOrMeta+V");
    await pasted.waitForFunction(
      () => document.getElementById("paste").textContent.length > 100,
    );
    assert.equal(
      await pasted.locator("#paste img,#paste canvas,#paste svg").count(),
      0,
    );
    assert.equal(await pasted.locator("#paste pre,#paste table").count(), 1);
    await pasted
      .locator("#paste")
      .screenshot({ path: resolve(out, name + "-formatted.png") });
    await pasted.close();
    const raw = page.locator("#raw");
    await raw.screenshot({ path: resolve(out, name + "-plain.png") });
    assert.equal(
      await page.locator("#preview").evaluate((c) => c.toDataURL()),
      before,
    );
    const sample = {
      name,
      recipe,
      geometry: { ...geometry, text: undefined },
      imageSha256: createHash("sha256").update(before).digest("hex"),
      clipboardTypes: clipboard.types,
    };
    report.samples.push(sample);
  }
  report.checks.push(
    "three supplied recipes: complete plain-text height/width, custom filenames, TXT/RTF/text-HTML exports, HTML+plain clipboard and actual rich-editor paste, image pixels unchanged by text operations",
  );
  await page.locator("#compare-text").check();
  await page.locator("#compare").click();
  assert.equal(await page.locator("#grid .test-card canvas").count(), 12);
  assert.equal(await page.locator("#text-grid .test-card pre").count(), 12);
  await page
    .locator("#scanner")
    .fill("AUTOMATED UI FIXTURE - not a phone result");
  await page.locator("#grid .test-card select").first().selectOption("pass");
  assert.equal(
    await page.locator("#text-grid .test-card select").first().inputValue(),
    "untested",
  );
  await page
    .locator("#text-grid .test-card select")
    .first()
    .selectOption("conditional");
  const event = page.waitForEvent("download");
  await page.locator("#export-results").click();
  const data = JSON.parse(await readFile(await (await event).path()));
  assert.deepEqual(
    data.records.map((r) => r.output),
    ["image", "plain-text"],
  );
  assert(data.records[1].layout);
  await page.locator("#payload").fill("https://example.org");
  assert.match(await page.locator("#unsaved").textContent(), /Unsaved/);
  let guarded = false;
  page.once("dialog", async (d) => {
    guarded = d.type() === "beforeunload";
    await d.accept();
  });
  await page.reload();
  assert(guarded);
  await page.waitForFunction(
    () => document.getElementById("preview").width === 656,
  );
  assert.equal(await page.locator("#unsaved").textContent(), "");
  report.checks.push(
    "separate image/text observations, retained image grid, close/reload guard after unsaved edits",
  );
  for (const width of [320, 390, 760]) {
    await page.setViewportSize({ width, height: 844 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
  }
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.screenshot({ path: resolve(out, "desktop.png"), fullPage: true });
  await page.locator("#glyph").fill("🚀");
  await page.locator("#density").selectOption("1x1");
  const pixels = await page.evaluate(async () => {
    const core = await import("/src/core.mjs"),
      text = await import("/src/text.mjs");
    const results = [];
    for (const glyph of ["#", "🚀", "⚫️", "🤣.☄️1:a"]) {
      const qr = core.generate("https://example.com", {
        glyph,
        repeatX: 1,
        repeatY: 1,
      });
      const p = text.plainText(qr);
      const c = document.createElement("canvas");
      c.width = c.height = 1200;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, 1200, 1200);
      ctx.font = '700 100px Menlo,"Apple Color Emoji",monospace';
      const span = Math.max(...p.rows.map((row) => ctx.measureText(row).width));
      const fs = (1100 * 100) / span;
      ctx.font = `700 ${fs}px Menlo,"Apple Color Emoji",monospace`;
      ctx.fillStyle = "black";
      p.rows.forEach((row, i) =>
        ctx.fillText(row, 40, 40 + (i + 1) * 1.2 * fs),
      );
      const arr = Array.from(ctx.getImageData(0, 0, 1200, 1200).data);
      results.push({ glyph, arr });
    }
    return results;
  });
  report.plainTextDecodes = pixels.map(({ glyph, arr }) => ({
    glyph,
    renderer:
      "ordinary text rows; 700 Menlo, Apple Color Emoji fallback; normal 1.2 line spacing; 1200px canvas",
    decoder: "jsQR 1.4.0",
    result:
      jsQR(new Uint8ClampedArray(arr), 1200, 1200)?.data ===
      "https://example.com"
        ? "exact payload recovered"
        : "not recovered",
  }));
  assert.deepEqual(errors, []);
  report.browser = browser.version();
  await writeFile(
    resolve(out, "receipt.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
  server.kill("SIGTERM");
}

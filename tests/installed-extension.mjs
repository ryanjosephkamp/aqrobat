import { chromium } from "playwright";
import { mkdir, mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const executablePath =
  process.env.EXTENSION_CHROME_PATH || chromium.executablePath();
await mkdir("test-results", { recursive: true });
const profile = await mkdtemp(resolve("test-results/aqrobat-owned-extension-"));
const extension = await mkdtemp(
  resolve("test-results/aqrobat-owned-unpacked-"),
);
const archive = resolve("downloads/aqrobat-extension.zip");
let context;
const launch = () =>
  chromium.launchPersistentContext(profile, {
    executablePath,
    headless: true,
    args: [
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
    ],
  });
const worker = async () =>
  context.serviceWorkers()[0] || (await context.waitForEvent("serviceworker"));
try {
  execFileSync("unzip", ["-tq", archive]);
  execFileSync("unzip", ["-q", archive, "-d", extension]);
  for (const [packed, source] of [
    ["manifest.json", "extension/manifest.json"],
    ["index.html", "dist/extension/index.html"],
    ["web/app.mjs", "web/app.mjs"],
    ["popup.html", "extension/popup.html"],
    ["popup.css", "extension/popup.css"],
    ["popup.mjs", "extension/popup.mjs"],
    ["worker.mjs", "extension/worker.mjs"],
    ["extension/insertion.mjs", "extension/insertion.mjs"],
    ...["core", "text", "library", "spacing"].map((name) => [
      `src/${name}.mjs`,
      `src/${name}.mjs`,
    ]),
    ["vendor/qrcodegen.mjs", "vendor/qrcodegen.mjs"],
    ["insertion.js", "dist/extension/insertion.js"],
  ])
    assert.deepEqual(
      await readFile(resolve(extension, packed)),
      await readFile(source),
      `${packed} differs from reviewed source`,
    );
  context = await launch();
  const sw = await worker();
  const id = new URL(sw.url()).host;
  const page = await context.newPage();
  await page.goto(`chrome-extension://${id}/index.html`);
  await page.waitForFunction(
    () => document.getElementById("preview").width === 656,
  );
  await sw.evaluate(() => {
    globalThis.iconCalls = [];
    const original = chrome.action.setIcon.bind(chrome.action);
    chrome.action.setIcon = async (options) => {
      await original(options);
      globalThis.iconCalls.push(options);
    };
  });
  await page.locator(".appearance summary").click();
  await page.locator("#theme").selectOption("ocean");
  await page.locator("#icon-color").selectOption("gold");
  await page.waitForFunction(
    async () =>
      (await chrome.storage.local.get("aqrobat-appearance-v1"))[
        "aqrobat-appearance-v1"
      ]?.icon === "gold",
  );
  await sw.evaluate(async () => {
    for (
      let i = 0;
      i < 100 &&
      !globalThis.iconCalls.some((c) => c.path[16] === "icons/gold-16.png");
      i++
    )
      await new Promise((r) => setTimeout(r, 20));
  });
  assert(
    (await sw.evaluate(() => globalThis.iconCalls)).some(
      (c) => c.path[16] === "icons/gold-16.png",
    ),
  );
  await page.bringToFront();
  await page.locator("#copy-formatted").click();
  await page.waitForFunction(() =>
    document
      .getElementById("status")
      .textContent.startsWith("Formatted text copied."),
  );
  await page.locator("#density").selectOption("1x1");
  await page.locator("#recipe-name").fill("Saved hash");
  await page.locator("#save-local").click();
  await page.waitForFunction(() =>
    document.getElementById("library-status").textContent.startsWith("1 / 20"),
  );
  await page.locator("#preset").selectOption("custom");
  await page.locator("#glyph").fill("🤣.☄️1:a");
  await page
    .locator("#payload")
    .fill("https://example.com/?keep=%20two%20words");
  await page.locator("#recipe-name").fill("Saved mixed");
  await page.locator("#save-local").click();
  await page.waitForFunction(() =>
    document.getElementById("library-status").textContent.startsWith("2 / 20"),
  );
  const savedLibrary = await page.evaluate(
    async () =>
      (await chrome.storage.local.get("aqrobat-recipes-v1"))[
        "aqrobat-recipes-v1"
      ],
  );
  assert.equal(savedLibrary[1].recipe.options.glyph, "🤣.☄️1:a");
  assert.equal(
    savedLibrary[1].recipe.payload,
    "https://example.com/?keep=%20two%20words",
  );
  const tab = await context.newPage();
  await tab.goto(page.url());
  await tab.waitForFunction(
    () => document.documentElement.dataset.theme === "ocean",
  );
  assert.equal(await tab.locator("#icon-color").inputValue(), "gold");
  await context.close();
  context = await launch();
  const next = await worker();
  assert.equal(new URL(next.url()).host, id);
  const reopened = await context.newPage();
  await reopened.goto(`chrome-extension://${id}/index.html`);
  await reopened.waitForFunction(
    () => document.documentElement.dataset.theme === "ocean",
  );
  assert.equal(await reopened.locator("#icon-color").inputValue(), "gold");
  await reopened.waitForFunction(() =>
    document.getElementById("library-status").textContent.startsWith("2 / 20"),
  );
  await reopened.locator("#saved-recipes").selectOption(savedLibrary[1].id);
  await reopened.locator("#load-saved").click();
  assert.equal(
    await reopened.locator("#payload").inputValue(),
    savedLibrary[1].recipe.payload,
  );
  assert.equal(await reopened.locator("#glyph").inputValue(), "🤣.☄️1:a");
  assert.deepEqual(
    await reopened.evaluate(
      async () =>
        (await chrome.storage.local.get("aqrobat-recipes-v1"))[
          "aqrobat-recipes-v1"
        ],
    ),
    savedLibrary,
  );
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${id}/popup.html`);
  await popup.waitForFunction(
    () => document.querySelector("#recipe").options.length === 2,
  );
  await popup.locator("#recipe").selectOption(savedLibrary[1].id);
  assert(
    (await popup.locator("#payload").innerText()).includes(
      savedLibrary[1].recipe.payload,
    ),
  );
  assert.equal(await popup.locator("#insert").isEnabled(), true);
  const version = await reopened.evaluate(
    () => chrome.runtime.getManifest().version,
  );
  const report = {
    browser: await next.evaluate(() => navigator.userAgent),
    extensionVersion: version,
    archiveSha256: createHash("sha256")
      .update(await readFile(archive))
      .digest("hex"),
    checks: [
      "download ZIP CRC and critical source bytes verified; actual ZIP extracted into a fresh task-owned directory for installation",
      "installed MV3 extension page uses chrome.storage.local",
      "preference change invokes real chrome.action.setIcon successfully with gold icon paths",
      "formatted clipboard write succeeds from the installed extension page",
      "new tab and full browser restart preserve theme/icon under same unpacked ID",
      "explicit saved recipes retain exact payload and mixed palette across a full browser restart and load back into generator",
    ],
    toolbarPixels: "not visually inspected",
    userInstalledCopy: "not inspected or modified",
    profile: "fresh task-owned profile; removed after test",
  };
  await writeFile(
    "test-results/installed-extension.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  if (context) await context.close();
  await rm(profile, { recursive: true, force: true });
  await rm(extension, { recursive: true, force: true });
}

import { chromium } from "playwright";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
const executablePath =
  process.env.EXTENSION_CHROME_PATH || chromium.executablePath();
await mkdir("test-results", { recursive: true });
const profile = await mkdtemp(resolve("test-results/aqrobat-owned-extension-"));
const extension = resolve("dist/extension");
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
  const version = await reopened.evaluate(
    () => chrome.runtime.getManifest().version,
  );
  const report = {
    browser: await next.evaluate(() => navigator.userAgent),
    extensionVersion: version,
    checks: [
      "installed MV3 extension page uses chrome.storage.local",
      "preference change invokes real chrome.action.setIcon successfully with gold icon paths",
      "formatted clipboard write succeeds from the installed extension page",
      "new tab and full browser restart preserve theme/icon under same unpacked ID",
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
}

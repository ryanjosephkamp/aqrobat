import assert from "node:assert/strict";
import { chromium } from "playwright";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import { DEFAULT_RECIPE } from "./generator.mjs";

const root = resolve("docs/research/prose-qr/portable-story-2026-10-11");
const out = resolve(root, process.argv[2] || "workbench-final-check-05");
await mkdir(out);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const save = (name, value) =>
  writeFile(
    resolve(out, name),
    typeof value === "string" || Buffer.isBuffer(value)
      ? value
      : JSON.stringify(value, null, 2) + "\n",
    { flag: "wx" },
  );
const sources = [];
for (const path of [
  "experiments/prose-qr/portable-story-2026-10-11/generator.mjs",
  "experiments/prose-qr/portable-story-2026-10-11/workbench-app.mjs",
  "experiments/prose-qr/portable-story-2026-10-11/workbench-template.html",
  "experiments/prose-qr/portable-story-2026-10-11/final-workbench-check.mjs",
  "docs/research/prose-qr/portable-story-2026-10-11/workbench.html",
]) {
  const bytes = await readFile(path);
  const archive = `source-${sources.length + 1}.txt.gz`;
  await save(archive, gzipSync(bytes));
  sources.push({ path, archive, sha256: sha(bytes) });
}
await save("manifest.json", {
  at: new Date().toISOString(),
  purpose:
    "Final UI repair and raw-input retention check; compare prior exports without new image captures or decoder calls.",
  sources,
  nativeImageCaptures: 0,
  ordinaryReaderCalls: 0,
});
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const network = [],
  errors = [],
  comparisons = [],
  rejection = [];
try {
  const context = await browser.newContext({ acceptDownloads: true });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        write: async (items) => {
          globalThis.__testClipboard = {};
          for (const item of items)
            for (const type of item.types)
              globalThis.__testClipboard[type] = await (
                await item.getType(type)
              ).text();
        },
      },
    });
  });
  const page = await context.newPage();
  context.on("request", (r) => {
    if (/^https?:/.test(r.url())) network.push(r.url());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(pathToFileURL(resolve(root, "workbench.html")).href);
  await page.locator("details").evaluate((e) => {
    e.open = true;
  });
  async function imported(spec) {
    await page.locator("#import").setInputFiles({
      name: "task-owned-recipe.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({ schema: "aqrobat-prose-research-v1", recipe: spec }),
      ),
    });
    await page.waitForFunction(
      () => document.querySelector("#import").value === "",
    );
    const status = await page.locator("#status").innerText();
    assert.match(status, /Generated locally/, status);
  }
  async function download(kind) {
    // Avoid Chromium's burst-download throttle; this is a UI check only.
    await page.waitForTimeout(1100);
    const pending = page.waitForEvent("download");
    await page.locator(`[data-export="${kind}"]`).click();
    return readFile(await (await pending).path());
  }
  for (const batch of ["workbench-test-03", "workbench-test-04"]) {
    const { config } = JSON.parse(
      await readFile(resolve(root, batch, "manifest.json")),
    );
    for (const item of config.cases) {
      await imported(item.spec);
      const html = await download("html");
      const previous = gunzipSync(
        await readFile(resolve(root, batch, item.id + ".html.gz")),
      );
      assert(html.equals(previous), `HTML changed: ${item.id}`);
      const raw = await download("source");
      assert.equal(raw.toString(), item.spec.text);
      const recipe = JSON.parse(await download("recipe"));
      assert.deepEqual(recipe.recipe, item.spec);
      comparisons.push({
        batch,
        id: item.id,
        htmlSha256: sha(html),
        byteExactPriorExport: true,
        rawSourceExact: true,
      });
    }
  }
  const presets = [];
  for (const [preset, batch, id] of [
    ["black", "workbench-test-03", "black-complete"],
    ["regular", "workbench-test-04", "avenir-regular-gray96"],
  ]) {
    await imported(DEFAULT_RECIPE);
    await page.locator("#preset").selectOption(preset);
    assert(await page.locator("#open-text").isDisabled());
    await page.locator('button[type="submit"]').click();
    assert.match(
      await page.locator("#status").innerText(),
      /Generated locally/,
    );
    const html = await download("html");
    assert(
      html.equals(
        gunzipSync(await readFile(resolve(root, batch, id + ".html.gz"))),
      ),
    );
    presets.push({ preset, byteExactPriorExport: true, htmlSha256: sha(html) });
  }
  await imported(DEFAULT_RECIPE);
  const defaultHtml = await download("html");
  assert(
    defaultHtml.equals(
      await readFile(resolve(root, "examples/page-impact-mixed.html")),
    ),
  );
  const pendingPopup = context.waitForEvent("page");
  await page.locator("#open-text").click();
  const popup = await pendingPopup;
  await popup.waitForLoadState();
  await popup.locator("#text-body").waitFor();
  assert.equal(await popup.locator("img,svg,canvas").count(), 0);
  const popupText = await popup.locator("#text-body").evaluate((e) => {
    const r = document.createRange();
    r.selectNodeContents(e);
    const s = getSelection();
    s.removeAllRanges();
    s.addRange(r);
    return s.toString();
  });
  assert.equal(popupText, (await download("text")).toString());
  await popup.close();
  await page.locator("#copy").click();
  await page.waitForFunction(() =>
    Object.hasOwn(globalThis.__testClipboard || {}, "text/plain"),
  );
  const clipboard = await page.evaluate(() => globalThis.__testClipboard);
  assert.equal(clipboard["text/plain"], popupText);
  assert(!clipboard["text/html"].includes("position:absolute"));
  const punctuationSpec = {
    ...DEFAULT_RECIPE,
    text: DEFAULT_RECIPE.text + ' She said, "Don\'t lose well-formed words."',
  };
  await imported(punctuationSpec);
  assert.equal((await download("source")).toString(), punctuationSpec.text);
  assert.equal(
    JSON.parse(await download("recipe")).recipe.text,
    punctuationSpec.text,
  );
  const rawSpec = {
    ...DEFAULT_RECIPE,
    text:
      "  " +
      DEFAULT_RECIPE.text
        .replace("quiet room", "quiet\r\nroom")
        .replace("rain.", "rain.\t"),
    payload: "line one\r\nline two",
  };
  await imported(rawSpec);
  assert.equal((await download("source")).toString(), rawSpec.text);
  assert.deepEqual(JSON.parse(await download("recipe")).recipe, rawSpec);
  await page.locator('[name="text"]').fill(DEFAULT_RECIPE.text + " ");
  await page.locator('[name="payload"]').fill("edited");
  assert(await page.locator("#open-text").isDisabled());
  await page.locator('button[type="submit"]').click();
  assert.match(await page.locator("#status").innerText(), /Generated locally/);
  assert.equal(
    (await download("source")).toString(),
    DEFAULT_RECIPE.text + " ",
  );
  assert.equal(JSON.parse(await download("recipe")).recipe.payload, "edited");
  for (const [id, spec, pattern] of [
    [
      "overflow",
      { ...DEFAULT_RECIPE, text: DEFAULT_RECIPE.text.repeat(60) },
      /overflow/i,
    ],
    [
      "insufficient",
      { ...DEFAULT_RECIPE, repeat: false },
      /too little|cannot fill/i,
    ],
    ["script", { ...DEFAULT_RECIPE, text: "Hello Ελληνικά" }, /supports Latin/],
    [
      "overlap",
      { ...DEFAULT_RECIPE, fontSize: 20, field: 400 },
      /Letters need/,
    ],
    [
      "payload-overflow",
      { ...DEFAULT_RECIPE, payload: "x".repeat(1025) },
      /too long|1024/i,
    ],
  ]) {
    await page.locator("#import").setInputFiles({
      name: "rejected-recipe.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({ schema: "aqrobat-prose-research-v1", recipe: spec }),
      ),
    });
    await page.waitForFunction(
      () => document.querySelector("#import").value === "",
    );
    const message = await page.locator("#status").innerText();
    assert.match(message, pattern);
    assert(await page.locator('[data-export="html"]').isDisabled());
    assert(await page.locator("#open-text").isDisabled());
    rejection.push({ id, message, disabled: true });
  }
  assert.deepEqual(network, []);
  assert.deepEqual(errors, []);
  await save("summary.json", {
    at: new Date().toISOString(),
    browser: browser.version(),
    node: process.version,
    comparisons,
    presets,
    acceptedDefaultByteExact: true,
    fullTextPopupSelectableExact: true,
    clipboard:
      "HTML/TXT MIME export checked with task-owned JS stub; no OS clipboard writes",
    importedCRLFSourceAndPayloadExact: true,
    manualEditClearsRawOverrides: true,
    quotesApostrophesAndHyphensAccepted: true,
    staleOutputDisabled: true,
    rejection,
    network,
    errors,
    nativeImageCaptures: 0,
    ordinaryReaderCalls: 0,
    browserClosedInFinally: true,
  });
  console.log(
    JSON.stringify({
      exportsByteExact: comparisons.length,
      rejection: rejection.length,
      captures: 0,
      readerCalls: 0,
      network,
      errors,
    }),
  );
} catch (e) {
  await save("abort.json", {
    at: new Date().toISOString(),
    error: e.stack,
    comparisons,
    network,
    errors,
  });
  throw e;
} finally {
  await browser.close();
}

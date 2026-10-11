import { chromium } from "playwright";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import assert from "node:assert/strict";
import { longProse, passages } from "./corpus.mjs";
const base = resolve("docs/research/prose-qr/paste-prose-2026-10-11"),
  cfg = await readFile(
    "experiments/prose-qr/paste-prose-2026-10-11/studio-test-02.json",
  ),
  config = JSON.parse(cfg),
  out = resolve(base, config.id);
await mkdir(out);
const sha = (b) => createHash("sha256").update(b).digest("hex"),
  save = (name, data) =>
    writeFile(
      resolve(out, name),
      typeof data === "string" || Buffer.isBuffer(data)
        ? data
        : JSON.stringify(data, null, 2) + "\n",
      { flag: "wx" },
    );
const paths = [
  "experiments/prose-qr/paste-prose-2026-10-11/studio-test-02.mjs",
  "experiments/prose-qr/paste-prose-2026-10-11/page-fit.mjs",
  "experiments/prose-qr/paste-prose-2026-10-11/page-app.mjs",
  "experiments/prose-qr/paste-prose-2026-10-11/docx.mjs",
  "docs/research/prose-qr/paste-prose-2026-10-11/page-studio.html",
];
const sources = [];
for (const [i, path] of paths.entries()) {
  const b = await readFile(path);
  await save(`source-${i}.txt.gz`, gzipSync(b));
  sources.push({ path, sha256: sha(b) });
}
await save("manifest.json", {
  at: new Date().toISOString(),
  config,
  configSha256: sha(cfg),
  sources,
  clipboardLane:
    "Mocked browser ClipboardItem payload capture; no native clipboard claim",
  inputTransforms: "none",
});
const browser = await chromium.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  }),
  checks = [],
  network = [],
  errors = [];
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
    deviceScaleFactor: 1,
    acceptDownloads: true,
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        write: async (items) => {
          globalThis.__aqrobatClipboard = {};
          for (const item of items)
            for (const type of item.types)
              globalThis.__aqrobatClipboard[type] = await (
                await item.getType(type)
              ).text();
        },
      },
    });
  });
  const page = await context.newPage();
  page.on("request", (r) => {
    if (/^https?:/.test(r.url())) network.push(r.url());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(pathToFileURL(resolve(base, "page-studio.html")).href);
  const download = async (kind) => {
    const p = page.waitForEvent("download");
    await page.locator(`[data-save="${kind}"]`).click();
    const d = await p;
    return readFile(await d.path());
  };
  const generate = () => page.locator("button[type=submit]").click();
  const status = () => page.locator("#status").innerText();
  assert.match(await status(), /Generated locally/);
  assert.match(
    await page.locator("#details").innerText(),
    /1114 words · 1 complete copy/,
  );
  assert.match(await page.locator("#details").innerText(), /8pt Impact/);
  const docx = await download("docx"),
    source = await download("source"),
    text = await download("text"),
    recipe = await download("recipe");
  await save("download-letter.docx", docx);
  await save("download-source.txt", source);
  await save("download-wrapped.txt", text);
  await save("download-recipe.json", recipe);
  assert(docx.equals(await readFile(resolve(base, "word-08/input.docx"))));
  assert.equal(source.toString(), longProse);
  assert(text.equals(await readFile(resolve(base, "word-08/expected.txt"))));
  checks.push({
    check:
      "Default DOCX exactly matches native-opened input bytes; source/word order/case exact",
    pass: true,
    docxSha256: sha(docx),
  });
  await page.locator("#copy-styled").click();
  await page.waitForFunction(() => document.querySelector("#status").textContent.startsWith("Styled text copied."));
  const clipboard = await page.evaluate(() => globalThis.__aqrobatClipboard);
  await save("mock-clipboard.json", clipboard);
  assert.equal(clipboard["text/plain"], text.toString());
  assert(clipboard["text/html"].includes("font-size:8pt"));
  checks.push({
    check:
      "Mocked ClipboardItem carries compact styled HTML and exact wrapped text",
    pass: true,
    nativeClipboard: false,
  });
  const artifact = page.frameLocator("#preview").locator("#artifact");
  const png = await artifact.screenshot();
  await save("native.png", png);
  const repeat = await artifact.screenshot();
  await save("repeat.png", repeat);
  assert(png.equals(repeat));
  await save("capture.json", {
    at: new Date().toISOString(),
    id: "studio-default",
    payload: "https://example.com/",
    pngSha256: sha(png),
    repeatSha256: sha(repeat),
    repeatExact: true,
    pixels: [png.readUInt32BE(16), png.readUInt32BE(20)],
    inputTransforms: "none",
    font: "Impact",
    bodyCssPixels: 600,
    pointSize: 8,
    sourceWords: 1114,
    completeCopies: 1,
  });
  await page.screenshot({
    path: resolve(out, "studio-ui.png"),
    fullPage: true,
  });
  await page.locator("[name=text]").fill("");
  assert.equal(await page.locator("[data-save=docx]").isEnabled(), false);
  await generate();
  assert.match(await status(), /nonempty/);
  checks.push({
    check: "Stale export disabled and empty source rejected",
    pass: true,
  });
  for (const [value, label] of [
    ["A sentence with 🙂.", "emoji"],
    ["Cafe\u0301 is written with a combining accent.", "combining mark"],
  ]) {
    await page.locator("[name=text]").fill(value);
    await generate();
    assert.match(await status(), /supports Latin/);
    assert.equal(await page.locator("[data-save=docx]").isEnabled(), false);
    checks.push({ check: "Unsupported " + label + " rejected", pass: true });
  }
  await page.locator("[name=text]").fill(passages[0].text);
  await page.locator("[name=repeat]").uncheck();
  await generate();
  assert.equal(await page.locator("[data-save=docx]").isEnabled(), false);
  await page.locator("[name=repeat]").check();
  await generate();
  assert.match(await status(), /Generated locally/);
  assert.match(await page.locator("#details").innerText(), /complete copies/);
  checks.push({
    check: "Short source needs explicit complete-copy repetition",
    pass: true,
  });
  await page.locator("[name=payload]").fill("X".repeat(5000));
  await generate();
  assert.equal(await page.locator("[data-save=docx]").isEnabled(), false);
  assert.equal(
    await page.locator("[name=payload]").inputValue(),
    "X".repeat(5000),
  );
  checks.push({
    check: "Oversized payload rejected without shortening",
    pass: true,
    message: await status(),
  });
  const raw = "\t " + longProse.replaceAll("\n", "\r\n") + " \r\n";
  const imported = {
    schema: "aqrobat-page-prose-v1",
    recipe: {
      payload: "https://example.com/",
      text: raw,
      field: 600,
      pointChoice: "fit",
      repeat: false,
      gray: 180,
      paper: "Letter",
    },
  };
  await page
    .locator("#import-recipe")
    .setInputFiles({
      name: "recipe.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(imported)),
    });
  assert.match(await status(), /Generated locally/);
  const roundtrip = await download("source");
  assert.equal(roundtrip.toString(), raw);
  await save("raw-whitespace-roundtrip.txt", roundtrip);
  checks.push({
    check:
      "CRLF and surrounding source whitespace preserved through recipe restore/export",
    pass: true,
  });
  await page.locator("[name=paper]").selectOption("A4");
  await generate();
  assert.match(await status(), /Generated locally/);
  await save("download-a4.docx", await download("docx"));
  await page.locator("[name=field]").selectOption("624");
  await generate();
  assert.match(await status(), /does not fit/);
  assert.equal(await page.locator("[data-save=docx]").isEnabled(), false);
  checks.push({
    check: "A4 export generated; incompatible 6.5in A4 body rejected",
    pass: true,
  });
  assert.deepEqual(network, []);
  assert.deepEqual(errors, []);
  await save("results.json", {
    at: new Date().toISOString(),
    browser: browser.version(),
    checks,
    network,
    errors,
    clipboardLane: "mock only; native Word copy/paste evidence is separate",
    candidateCaptures: 1,
    immediateRepeats: 1,
    resourceCaptures: 1,
    readerCalls: 0,
  });
  console.log(
    JSON.stringify({
      checks: checks.length,
      allPassed: true,
      docxNativeInputByteMatch: true,
    }),
  );
} finally {
  await browser.close();
}

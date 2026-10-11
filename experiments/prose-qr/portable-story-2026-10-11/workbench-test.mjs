import { chromium } from "playwright";
import { readFile, writeFile, mkdir, appendFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { DEFAULT_RECIPE } from "./generator.mjs";
const configPath = process.argv[2],
  configBytes = await readFile(configPath),
  config = JSON.parse(configBytes);
const root = resolve("docs/research/prose-qr/portable-story-2026-10-11"),
  out = resolve(root, config.id);
await mkdir(out);
const sha = (b) => createHash("sha256").update(b).digest("hex"),
  save = (n, v) =>
    writeFile(
      resolve(out, n),
      typeof v === "string" || Buffer.isBuffer(v)
        ? v
        : JSON.stringify(v, null, 2) + "\n",
      { flag: "wx" },
    );
const paths = [
  "experiments/prose-qr/portable-story-2026-10-11/workbench-test.mjs",
  "experiments/prose-qr/portable-story-2026-10-11/generator.mjs",
  "experiments/prose-qr/portable-story-2026-10-11/workbench-app.mjs",
  "experiments/prose-qr/portable-story-2026-10-11/workbench-template.html",
  "docs/research/prose-qr/portable-story-2026-10-11/workbench.html",
  "experiments/prose-qr/styled-story-2026-10-11/reader.mjs",
  "experiments/prose-qr/styled-story-2026-10-11/opencv.py",
  "src/core.mjs",
  "vendor/qrcodegen.mjs",
];
const sources = [];
for (const [i, path] of paths.entries()) {
  const b = await readFile(path),
    archive = `source-${i + 1}.txt.gz`;
  await save(archive, gzipSync(b));
  sources.push({ path, sha256: sha(b), archive });
}
await save("manifest.json", {
  at: new Date().toISOString(),
  configPath,
  configSha256: sha(configBytes),
  config,
  sources,
  inputTransforms: "none",
  cutoff: "2026-10-11T19:25:49Z",
});
const browser = await chromium.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  }),
  rows = [],
  network = [],
  errors = [];
try {
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1400 },
    deviceScaleFactor: 1,
    acceptDownloads: true,
  });
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
  const viewPage = await context.newPage();
  page.on("request", (r) => {
    if (/^https?:/.test(r.url())) network.push(r.url());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(pathToFileURL(resolve(root, "workbench.html")).href);
  await page.locator("details").evaluate((e) => {
    e.open = true;
  });
  await save("environment.json", {
    browser: browser.version(),
    node: process.version,
    viewport: { width: 1600, height: 1400 },
    deviceScaleFactor: 1,
  });
  async function apply(spec) {
    for (const [k, v] of Object.entries(spec)) {
      const l = page.locator(`[name="${k}"]`);
      if (k === "repeat") await l.setChecked(v);
      else if (["font", "ecc"].includes(k)) await l.selectOption(String(v));
      else await l.fill(String(v));
    }
    await page.locator('button[type="submit"]').click();
  }
  async function download(kind) {
    const p = page.waitForEvent("download");
    await page.locator(`[data-export="${kind}"]`).click();
    const d = await p,
      b = await readFile(await d.path());
    return b;
  }
  const words = (s) => s.trim().split(/\s+/u);
  for (const item of config.cases) {
    assert(Date.now() < Date.parse("2026-10-11T19:25:49Z"));
    await apply(item.spec);
    assert.match(
      await page.locator("#status").innerText(),
      /Generated locally/,
    );
    const recipeBytes = await download("recipe"),
      recipe = JSON.parse(recipeBytes),
      source = await download("source"),
      text = await download("text"),
      html = await download("html"),
      rtf = await download("rtf");
    assert.deepEqual(recipe.recipe, item.spec);
    assert.equal(source.toString(), item.spec.text);
    const original = words(item.spec.text),
      actual = words(text.toString()),
      copies = recipe.summary.completeCopies;
    assert.equal(actual.length, original.length * copies);
    assert(actual.every((w, i) => w === original[i % original.length]));
    assert.equal(recipe.summary.partialCopies, 0);
    if (!item.spec.repeat) assert.equal(copies, 1);
    await save(item.id + "-recipe.json", recipeBytes);
    await save(item.id + "-source.txt", source);
    await save(item.id + ".txt", text);
    await save(item.id + ".html.gz", gzipSync(html));
    await save(item.id + ".rtf", rtf);
    await viewPage.setContent(html.toString());
    await viewPage.evaluate(() => document.fonts.ready);
    const artifact = viewPage.locator("#artifact");
    await artifact.waitFor();
    const selection = await viewPage.locator("#text-body").evaluate((e) => {
      const r = document.createRange(),
        s = getSelection();
      r.selectNodeContents(e);
      s.removeAllRanges();
      s.addRange(r);
      const t = s.toString();
      s.removeAllRanges();
      return t;
    });
    assert.equal(selection, text.toString());
    const paint = await artifact.evaluate((e) => {
      const bad = [];
      for (const n of [e, ...e.querySelectorAll("*")]) {
        const s = getComputedStyle(n);
        if (
          ["IMG", "SVG", "CANVAS"].includes(n.tagName) ||
          s.opacity !== "1" ||
          s.visibility !== "visible" ||
          s.display === "none" ||
          s.filter !== "none" ||
          s.textShadow !== "none" ||
          s.backgroundImage !== "none" ||
          !["rgba(0, 0, 0, 0)", "rgb(255, 255, 255)"].includes(
            s.backgroundColor,
          )
        )
          bad.push(n.tagName);
      }
      return { bad, elements: e.querySelectorAll("*").length };
    });
    assert.deepEqual(paint.bad, []);
    const one = await artifact.screenshot(),
      two = await artifact.screenshot();
    await save(item.id + ".png", one);
    await save(item.id + "-repeat.png", two);
    assert(one.equals(two));
    const replayExact = item.replay
      ? one.equals(await readFile(resolve(root, item.replay)))
      : null;
    if (item.replay)
      assert(replayExact, "Accepted baseline byte replay changed");
    const readings = [];
    if (!replayExact)
      for (const engine of ["zxing", "jsqr", "opencv"]) {
        const input = resolve(out, item.id + ".png"),
          args =
            engine === "opencv"
              ? [
                  "-B",
                  "experiments/prose-qr/styled-story-2026-10-11/opencv.py",
                  input,
                ]
              : [
                  "experiments/prose-qr/styled-story-2026-10-11/reader.mjs",
                  engine,
                  input,
                ];
        const raw = spawnSync(
          engine === "opencv" ? "python3" : process.execPath,
          args,
          { encoding: "utf8", timeout: 45000, maxBuffer: 12000000 },
        );
        await save(`${item.id}-${engine}.stdout.txt`, raw.stdout ?? "");
        await save(`${item.id}-${engine}.stderr.txt`, raw.stderr ?? "");
        let value = null;
        try {
          value = JSON.parse(raw.stdout);
        } catch {}
        readings.push({
          engine,
          status: raw.status,
          error: raw.error?.message ?? null,
          texts: value?.texts ?? null,
          exact: value ? value.texts.includes(item.spec.payload) : null,
        });
        assert(
          !value || value.texts.every((t) => t === item.spec.payload),
          "Wrong payload",
        );
      }
    if (item.id === "accepted-replay") {
      await page.locator("#copy").click();
      const clipboard = await page.evaluate(() => globalThis.__testClipboard);
      assert.equal(clipboard["text/plain"], text.toString());
      assert(!clipboard["text/html"].includes("position:absolute"));
      await save("clipboard-export.html.gz", gzipSync(clipboard["text/html"]));
      await save("clipboard-export.txt", clipboard["text/plain"]);
    }
    const row = {
      id: item.id,
      spec: item.spec,
      summary: recipe.summary,
      pngSha256: sha(one),
      repeatSha256: sha(two),
      repeatExact: true,
      selectionExact: true,
      sourceRawExact: true,
      wholeCopiesExact: true,
      paint,
      replay: item.replay ?? null,
      replayExact,
      readings,
    };
    rows.push(row);
    await appendFile(resolve(out, "results.jsonl"), JSON.stringify(row) + "\n");
    console.log(
      JSON.stringify({
        id: item.id,
        copies,
        words: actual.length,
        replayExact,
        readings: readings.map((r) => [r.engine, r.exact]),
      }),
    );
  }
  const rejection = [];
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
  ]) {
    await apply(spec);
    const message = await page.locator("#status").innerText();
    assert.match(message, pattern);
    assert(await page.locator('[data-export="html"]').isDisabled());
    assert.equal(await page.locator('[name="text"]').inputValue(), spec.text);
    rejection.push({
      id,
      message,
      inputPreserved: true,
      downloadDisabled: true,
    });
  }
  await apply(DEFAULT_RECIPE);
  await page.locator('[name="text"]').fill("changed");
  assert(await page.locator('[data-export="html"]').isDisabled());
  await page.locator("#import").setInputFiles({
    name: "recipe.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        schema: "aqrobat-prose-research-v1",
        recipe: DEFAULT_RECIPE,
      }),
    ),
  });
  await page.waitForFunction(() =>
    document
      .querySelector("#status")
      .textContent.startsWith("Generated locally"),
  );
  assert.equal(
    await page.locator('[name="text"]').inputValue(),
    DEFAULT_RECIPE.text,
  );
  assert.deepEqual(network, []);
  assert.deepEqual(errors, []);
  await save("summary.json", {
    at: new Date().toISOString(),
    planned: config.cases.length,
    completed: rows.length,
    rows,
    rejection,
    staleOutputDisabled: true,
    recipeImportExact: true,
    network,
    errors,
    actualPrimaryReaderCalls: rows.reduce((n, r) => n + r.readings.length, 0),
    clipboard: "Test-owned JS stub; no OS clipboard writes",
    browserClosedInFinally: true,
  });
} catch (e) {
  await save("abort.json", {
    at: new Date().toISOString(),
    error: e.stack,
    completed: rows.map((r) => r.id),
    uncompleted: config.cases
      .filter((c) => !rows.some((r) => r.id === c.id))
      .map((c) => c.id),
    network,
    errors,
  });
  throw e;
} finally {
  await browser.close();
}

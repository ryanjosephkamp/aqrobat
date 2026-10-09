import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { format } from "prettier";
import assert from "node:assert/strict";
const root = "docs/research/prose-qr/phase-07/",
  hash = (b) => createHash("sha256").update(b).digest("hex"),
  checkpoint = await readFile(root + "CHECKPOINT.md", "utf8"),
  prompt = checkpoint.split("## Resume prompt\n\n")[1].trim(),
  browser = await chromium.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  }),
  errors = [],
  external = [];
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
  });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (/^https?:/.test(r.url())) external.push(r.url());
  });
  await page.goto("file://" + resolve(root + "index.html"));
  assert.equal(await page.locator("#prompt").inputValue(), prompt);
  for (let stage = 0; stage < 3; stage++) {
    await page.selectOption("#stage", String(stage));
    const state = await page.evaluate(() => {
      return ["native", "control"].map((id, j) => {
        const q = data.entries[j].finalQuads[0].quad,
          rows = [q.top, data.entries[j].selectedJoin.line, q.bottom],
          svg = document.getElementById(id);
        return {
          labels: [...svg.querySelectorAll("text")].map((t) => t.textContent),
          expected: rows.map((r) => r.endX - r.startX + " px · y=" + r.y),
          active: [...svg.querySelectorAll("g")].findIndex(
            (g) => g.getAttribute("opacity") === "1",
          ),
        };
      });
    });
    for (const s of state) {
      assert.deepEqual(s.labels, s.expected);
      assert.equal(s.active, stage);
    }
  }
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw Error("Simulated rejection");
        },
      },
    }),
  );
  await page.click("#copy");
  assert(
    (await page.locator("#copy-status").textContent()).startsWith(
      "Prompt selected.",
    ),
  );
  assert.equal(
    await page
      .locator("#prompt")
      .evaluate((e) => e.value.slice(e.selectionStart, e.selectionEnd)),
    prompt,
  );
  const event = page.waitForEvent("download");
  await page.click("#download");
  const stream = await (await event).createReadStream(),
    chunks = [];
  for await (const c of stream) chunks.push(c);
  assert.equal(Buffer.concat(chunks).toString(), checkpoint);
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
} finally {
  await browser.close();
}
await writeFile(
  root + "browser-check.json",
  await format(
    JSON.stringify({
      at: new Date().toISOString(),
      sourceScriptSha256: hash(await readFile(new URL(import.meta.url))),
      htmlSha256: hash(await readFile(root + "index.html")),
      checkpointSha256: hash(checkpoint),
      viewport: { width: 390, height: 844 },
      diagramStages: 3,
      diagramLabelsMatchEvidence: true,
      horizontalOverflow: false,
      checkpointDownloadExact: true,
      clipboard:
        "Simulated denial selects exact prompt; native clipboard untested",
      pageErrors: errors,
      externalRequests: external,
      classification:
        "Headless HTML checks; no phone, native clipboard or scan acceptance",
    }),
    { parser: "json" },
  ),
  { flag: "wx" },
);
console.log(
  "Handback: three stages, exact download, no overflow/errors/external requests",
);

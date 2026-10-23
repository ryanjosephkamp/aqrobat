import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { format } from "prettier";
import assert from "node:assert/strict";
const root = "docs/research/prose-qr/phase-08/",
  sha = (b) => createHash("sha256").update(b).digest("hex"),
  checkpoint = await readFile(root + "CHECKPOINT.md", "utf8"),
  prompt = checkpoint.split("## Resume prompt\n\n")[1].trim();
const errors = [],
  external = [];
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
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
  for (let n = 0; n < 3; n++) {
    await page.selectOption("#case", String(n));
    const state = await page.evaluate(
      (n) => ({
        label: document.querySelector("#location").textContent,
        expected: data.placements[n],
        rows: [...document.querySelectorAll("#runs tr")].map((e) =>
          [...e.children].map((c) => c.textContent),
        ),
        runs: data.runs[n],
        control: data.runs[3],
      }),
      n,
    );
    assert(state.label.includes("Coordinate check: pass"));
    assert(state.label.includes("Full finder structure: unresolved"));
    assert(
      state.label.includes(
        `(${state.expected.corners.topLeft.x}, ${state.expected.corners.topLeft.y})`,
      ),
    );
    for (let i = 0; i < 4; i++) {
      const k = ["horizontal", "vertical", "diagonalDown", "diagonalUp"][i],
        fmt = (a) => a.map((x) => Number(x.toFixed(2))).join(" · ");
      assert.deepEqual(state.rows[i], [
        k,
        fmt(state.runs[k]),
        fmt(state.control[k]),
      ]);
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
          throw Error("Simulated clipboard rejection");
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
  for await (const b of stream) chunks.push(b);
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
      sourceScriptSha256: sha(await readFile(new URL(import.meta.url))),
      htmlSha256: sha(await readFile(root + "index.html")),
      checkpointSha256: sha(checkpoint),
      viewport: { width: 390, height: 844 },
      cases: 3,
      labelsAndRunsMatchEvidence: true,
      horizontalOverflow: false,
      promptExact: true,
      checkpointDownloadExact: true,
      clipboard: "Simulated denial fallback passes; native clipboard untested",
      errors,
      automaticExternalRequests: external,
    }),
    { parser: "json" },
  ),
  { flag: "wx" },
);
console.log("Mobile handback controls and exact checkpoint pass");

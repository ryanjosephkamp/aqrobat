import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { format } from "prettier";
import assert from "node:assert/strict";
const root = "docs/research/prose-qr/phase-06/",
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
const checks = [];
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
  for (let i = 0; i < 4; i++)
    for (const corner of ["topLeft", "topRight", "bottomLeft"])
      for (const axis of ["horizontal", "vertical"]) {
        await page.selectOption("#case", String(i));
        await page.selectOption("#corner", corner);
        await page.selectOption("#axis", axis);
        const v = await page.evaluate(() => {
          const c = data.cases[Number(document.getElementById("case").value)],
            a =
              c.corridors[document.getElementById("corner").value][
                document.getElementById("axis").value
              ];
          return {
            expectedCount: a.runs.length,
            rectCount: document.querySelectorAll("#actual rect").length,
            summary: document.getElementById("trace-summary").textContent,
            expectedList: a.runs
              .map((r) => (r.black ? "B" : "W") + r.pixels)
              .join(" / "),
            list: document.getElementById("run-list").textContent,
          };
        });
        assert.equal(v.rectCount, v.expectedCount);
        assert.equal(v.list, v.expectedList);
        assert(v.summary.startsWith(v.expectedCount + " runs"));
        checks.push({ case: i, corner, axis });
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
  const selection = await page
    .locator("#prompt")
    .evaluate((e) => e.value.slice(e.selectionStart, e.selectionEnd));
  assert.equal(selection, prompt);
  const event = page.waitForEvent("download");
  await page.click("#download");
  const download = await event,
    stream = await download.createReadStream(),
    chunks = [];
  for await (const c of stream) chunks.push(c);
  assert.equal(Buffer.concat(chunks).toString(), checkpoint);
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
} finally {
  await browser.close();
}
const audit = JSON.parse(
  await readFile(root + "rank-audit-summary-02.json", "utf8"),
);
assert.equal(
  audit.results.find((r) => r.id === "seam-01").scoredPointCount,
  1071,
);
assert.equal(
  audit.results.find((r) => r.id === "solid-finder-control").scoredPointCount,
  3,
);
await writeFile(
  root + "browser-check.json",
  await format(
    JSON.stringify({
      at: new Date().toISOString(),
      sourceScriptSha256: hash(await readFile(new URL(import.meta.url))),
      htmlSha256: hash(await readFile(root + "index.html")),
      checkpointSha256: hash(checkpoint),
      viewport: { width: 390, height: 844 },
      diagramCombinations: checks.length,
      controlsMatchRetainedData: true,
      horizontalOverflow: false,
      clipboard:
        "Simulated rejection selects exact prompt; native clipboard not tested",
      checkpointDownloadExact: true,
      externalRequests: external,
      pageErrors: errors,
      classification:
        "Headless local HTML handback checks only; not device, clipboard or scanning acceptance",
    }),
    { parser: "json" },
  ),
  { flag: "wx" },
);
console.log(
  JSON.stringify({
    diagramCombinations: checks.length,
    horizontalOverflow: false,
    downloadExact: true,
    pageErrors: errors.length,
  }),
);

import { chromium } from "playwright";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { format } from "prettier";
const out = "docs/research/prose-qr/phase-27/legibility-01/",
  input = "docs/research/prose-qr/phase-27/run-02/native.html.gz",
  sha = (b) => createHash("sha256").update(b).digest("hex");
await mkdir(out);
const bytes = await readFile(input),
  browser = await chromium.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
try {
  const page = await browser.newPage({
    viewport: { width: 2000, height: 1600 },
    deviceScaleFactor: 1,
  });
  await page.setContent(gunzipSync(bytes).toString());
  await page.evaluate(() => document.fonts.ready);
  const excerpts = [];
  for (const [name, clip] of [
    ["top", { x: 840, y: 840, width: 720, height: 168 }],
    ["bands", { x: 840, y: 1000, width: 720, height: 200 }],
  ]) {
    const png = await page.screenshot({ clip });
    await writeFile(out + name + ".png", png, { flag: "wx" });
    excerpts.push({
      name,
      clip,
      pngSha256: sha(png),
      classification: "Native source excerpt, display only",
    });
  }
  await writeFile(
    out + "receipt.json",
    await format(
      JSON.stringify({
        at: new Date().toISOString(),
        input,
        inputSha256: sha(bytes),
        sourceSha256: sha(await readFile(new URL(import.meta.url))),
        planSha256: sha(
          await readFile("docs/research/prose-qr/phase-27/PLAN.md"),
        ),
        excerpts,
        domTextSha256: sha(await page.locator("#text").textContent()),
        owner: "untested",
        agent: "pending visual inspection",
      }),
      { parser: "json" },
    ),
    { flag: "wx" },
  );
} finally {
  await browser.close();
}

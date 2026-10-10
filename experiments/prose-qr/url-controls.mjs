import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { format } from "prettier";
import { positiveControl, documentHtml, SCALES } from "./layout.mjs";
import { decode } from "./decoders.mjs";
const out = resolve("docs/research/prose-qr/pilot-02");
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const controls = [];
try {
  const page = await browser.newPage();
  for (const size of SCALES) {
    await page.setContent(
      documentHtml(positiveControl("https://example.com", size)),
    );
    const png = await page.locator("#artifact").screenshot();
    const path = `raw/control-url-${size}.png`;
    await writeFile(resolve(out, path), png, { flag: "wx" });
    const p = await page.evaluate(async (base64) => {
      const image = new Image();
      image.src = "data:image/png;base64," + base64;
      await image.decode();
      const c = document.createElement("canvas");
      c.width = image.width;
      c.height = image.height;
      const ctx = c.getContext("2d");
      ctx.drawImage(image, 0, 0);
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      let binary = "";
      for (let i = 0; i < data.length; i += 32768)
        binary += String.fromCharCode(...data.subarray(i, i + 32768));
      return { width: c.width, height: c.height, base64: btoa(binary) };
    }, png.toString("base64"));
    const data = Buffer.from(p.base64, "base64");
    controls.push({
      kind: "conventional URL control",
      payload: "https://example.com",
      size,
      path,
      pngSha256: createHash("sha256").update(png).digest("hex"),
      rgbaSha256: createHash("sha256").update(data).digest("hex"),
      decoders: await decode(
        { data, width: p.width, height: p.height },
        "https://example.com",
      ),
    });
  }
} finally {
  await browser.close();
}
await writeFile(
  resolve(out, "url-controls.json"),
  await format(JSON.stringify(controls), { parser: "json" }),
  { flag: "wx" },
);
console.log(
  JSON.stringify(
    controls.map((c) => ({
      size: c.size,
      jsQR: c.decoders.jsQR.exact,
      zxing: c.decoders.zxing.exact,
    })),
  ),
);

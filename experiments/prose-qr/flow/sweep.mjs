import { chromium } from "playwright";
import {
  readFile,
  writeFile,
  appendFile,
  mkdir,
  readdir,
  stat,
} from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { format } from "prettier";
import { build, documentHtml } from "./layout.mjs";
import { decode } from "../decoders.mjs";
const root = resolve("docs/research/prose-qr/phase-02"),
  out = resolve(root, "view-sweep");
await mkdir(out);
await mkdir(resolve(out, "raw"));
const sha = (v) => createHash("sha256").update(v).digest("hex");
const metrics = JSON.parse(
  await readFile("docs/research/prose-qr/pilot-02/metrics.json", "utf8"),
);
const rows = (await readFile(resolve(root, "batch-02/results.jsonl"), "utf8"))
  .trim()
  .split("\n")
  .map(JSON.parse);
const selected = ["band-009", "band-021", "band-023", "band-024"];
const sizes = [112, 128, 160, 192, 240, 320];
async function used() {
  let n = 0;
  async function w(p) {
    for (const e of await readdir(p, { withFileTypes: true })) {
      const q = resolve(p, e.name);
      if (e.isDirectory()) await w(q);
      else n += (await stat(q)).size;
    }
  }
  await w(root);
  return n;
}
const sources = {};
for (const name of ["layout.mjs", "sweep.mjs"])
  sources[name] = sha(await readFile(new URL(name, import.meta.url)));
await writeFile(
  resolve(out, "manifest.json"),
  await format(
    JSON.stringify({
      startedAt: new Date().toISOString(),
      selected,
      sizes,
      modes: ["DOM zoom", "DOM transform", "displayed original PNG"],
      sourceHashes: sources,
      note: "New actual browser display conditions; no blur or threshold. Tiny scan views are not legibility acceptance. Displayed PNG is distinct from selectable DOM text.",
    }),
    { parser: "json" },
  ),
);
const browser = await chromium.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  }),
  records = [];
try {
  const page = await browser.newPage({
    viewport: { width: 2400, height: 2400 },
  });
  for (const id of selected) {
    const r = rows.find((r) => r.id === id),
      l = build(r.spec, metrics);
    const original = r.raw.find((r) => r.kind === "native 20px type");
    const png = await readFile(resolve(root, "batch-02", original.path));
    assert.equal(sha(png), original.pngSha256);
    for (const mode of ["DOM zoom", "DOM transform", "displayed original PNG"])
      for (const size of sizes) {
        if (mode === "displayed original PNG")
          await page.setContent(
            documentHtml(
              `<img id="capture" src="data:image/png;base64,${png.toString("base64")}" style="display:block;width:${size}px;height:${size}px"/>`,
            ),
          );
        else {
          const ratio = size / l.side;
          await page.setContent(
            documentHtml(
              `<div id="capture" style="width:${size}px;height:${size}px;overflow:visible">${l.markup}</div>`,
            ),
          );
          await page.evaluate(
            ({ mode, ratio }) => {
              const a = document.getElementById("artifact");
              if (mode === "DOM zoom") a.style.zoom = ratio;
              else {
                a.style.transformOrigin = "top left";
                a.style.transform = `scale(${ratio})`;
                a.style.willChange = "transform";
              }
            },
            { mode, ratio },
          );
        }
        const view = await page.locator("#capture").screenshot();
        const p = await page.evaluate(async (b) => {
          const img = new Image();
          img.src = "data:image/png;base64," + b;
          await img.decode();
          const c = document.createElement("canvas");
          c.width = img.width;
          c.height = img.height;
          const ctx = c.getContext("2d");
          ctx.drawImage(img, 0, 0);
          const data = ctx.getImageData(0, 0, c.width, c.height).data;
          let s = "";
          for (let i = 0; i < data.length; i += 32768)
            s += String.fromCharCode(...data.subarray(i, i + 32768));
          return { data: btoa(s), width: c.width, height: c.height };
        }, view.toString("base64"));
        const result = await decode(
          {
            data: Buffer.from(p.data, "base64"),
            width: p.width,
            height: p.height,
          },
          r.spec.payload,
        );
        const path = `raw/${id}-${mode.replaceAll(" ", "-")}-${size}.png`;
        assert((await used()) + view.length < 29_000_000);
        await writeFile(resolve(out, path), view, { flag: "wx" });
        const entry = {
          candidate: id,
          payload: r.spec.payload,
          mode,
          size,
          visibleFontSize: (20 * size) / l.side,
          sourceNativePng: original.pngSha256,
          path,
          pngSha256: sha(view),
          rgbaSha256: sha(Buffer.from(p.data, "base64")),
          decoders: result,
        };
        await appendFile(
          resolve(out, "results.jsonl"),
          JSON.stringify(entry) + "\n",
        );
        records.push(entry);
        console.log(
          JSON.stringify({
            id,
            mode,
            size,
            exact: [result.jsQR.exact, result.zxing.exact],
          }),
        );
      }
  }
  await writeFile(
    resolve(out, "summary.json"),
    await format(
      JSON.stringify({
        finishedAt: new Date().toISOString(),
        views: records.length,
        jsQRExact: records.filter((r) => r.decoders.jsQR.exact).length,
        zxingExact: records.filter((r) => r.decoders.zxing.exact).length,
        successes: records.filter(
          (r) => r.decoders.jsQR.exact || r.decoders.zxing.exact,
        ),
        bytes: await used(),
        phone: "not tested",
        legibility:
          "Tiny-view recovery would not make the tiny text readable; native paragraph remains separate",
      }),
      { parser: "json" },
    ),
  );
} finally {
  await browser.close();
}

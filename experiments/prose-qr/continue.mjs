import { chromium } from "playwright";
import {
  readFile,
  writeFile,
  appendFile,
  readdir,
  stat,
  unlink,
} from "node:fs/promises";
import { resolve } from "node:path";
import { gzipSync, gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { format } from "prettier";
import { buildLayout, documentHtml, SCALES, FONTS } from "./layout.mjs";
import { decode, DECODER_PROVENANCE } from "./decoders.mjs";
const out = resolve(process.argv[2] || "docs/research/prose-qr/pilot-02"),
  root = resolve(out, "..");
const start = Date.parse("2026-10-09T00:12:20Z"),
  maxMs = 60 * 60 * 1000,
  cap = 50 * 1024 * 1024,
  reserve = 1024 * 1024;
const hash = (b) => createHash("sha256").update(b).digest("hex");
async function used() {
  let n = 0;
  async function walk(p) {
    for (const e of await readdir(p, { withFileTypes: true })) {
      const q = resolve(p, e.name);
      if (e.isDirectory()) await walk(q);
      else n += (await stat(q)).size;
    }
  }
  await walk(root);
  return n;
}
const before = await used();
assert(before < cap);
const archived = [];
for (const name of await readdir(out))
  if (/^(strict|styled)-[a-z0-9-]+\.html$/.test(name)) {
    const p = resolve(out, name),
      b = await readFile(p),
      gz = gzipSync(b, { mtime: 0 });
    assert.deepEqual(gunzipSync(gz), b);
    assert((await used()) + gz.length < cap);
    await writeFile(p + ".gz", gz, { flag: "wx" });
    assert.deepEqual(gunzipSync(await readFile(p + ".gz")), b);
    await unlink(p);
    archived.push({
      original: name,
      archive: name + ".gz",
      originalBytes: b.length,
      archiveBytes: gz.length,
      originalSha256: hash(b),
      archiveSha256: hash(gz),
      verified:
        "gunzip byte-for-byte equality before removing the duplicate uncompressed file",
    });
  }
await writeFile(
  resolve(out, "replay-archives.json"),
  await format(
    JSON.stringify({ beforeBytes: before, afterBytes: await used(), archived }),
    { parser: "json" },
  ),
  { flag: "wx" },
);
const entries = (await readFile(resolve(out, "results.jsonl"), "utf8"))
  .trim()
  .split("\n")
  .map((s) => JSON.parse(s));
const prior = new Map(entries.map((r) => [r.id, r]));
const specs = JSON.parse(
  await readFile(resolve(out, "specifications.json"), "utf8"),
);
const metrics = JSON.parse(
  await readFile(resolve(out, "metrics.json"), "utf8"),
);
const remaining = specs.filter((s) => !prior.get(s.id)?.complete);
const sourceSha256 = {};
for (const file of [
  "layout.mjs",
  "continue.mjs",
  "decoders.mjs",
  "vocabulary.mjs",
])
  sourceSha256[file] = hash(await readFile(new URL(file, import.meta.url)));
await writeFile(
  resolve(out, "continuation-manifest.json"),
  await format(
    JSON.stringify({
      startedAt: new Date(start).toISOString(),
      continuedAt: new Date().toISOString(),
      sourceSha256,
      remaining: remaining.map((s) => s.id),
      priorUniqueCases: prior.size,
      storageCap: cap,
      storageMeasurement:
        "actual stored lossless evidence including calibration failure and replay archives",
      noReruns:
        "Existing decoded frames are reused verbatim. Only previously untested scales/cases are attempted.",
      decoders: DECODER_PROVENANCE,
    }),
    { parser: "json" },
  ),
  { flag: "wx" },
);
let halt = null,
  done = 0;
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
try {
  const context = await browser.newContext({
    viewport: { width: 1000, height: 1040 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  async function guard(extra = 0) {
    assert(Date.now() - start < maxMs, "60-minute cap");
    assert(
      (await used()) + extra < cap - reserve,
      "50-MB evidence cap (1-MB reporting reserve)",
    );
  }
  async function save(path, data) {
    await guard(data.length);
    await writeFile(resolve(out, path), data, { flag: "wx" });
  }
  async function pixels(png) {
    return page.evaluate(async (base64) => {
      const image = new Image();
      image.src = "data:image/png;base64," + base64;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let binary = "";
      for (let i = 0; i < data.length; i += 32768)
        binary += String.fromCharCode(...data.subarray(i, i + 32768));
      return {
        width: canvas.width,
        height: canvas.height,
        base64: btoa(binary),
      };
    }, png.toString("base64"));
  }
  const queues = FONTS.flatMap((font) =>
    ["strict", "styled"].map((track) =>
      remaining.filter((s) => s.font === font && s.track === track),
    ),
  );
  const ordered = [];
  for (let i = 0; queues.some((q) => q.length > i); i++)
    for (const q of queues) if (q[i]) ordered.push(q[i]);
  for (const spec of ordered) {
    await guard();
    const old = prior.get(spec.id);
    const record = old
      ? {
          ...old,
          scales: [...old.scales],
          continuationAt: new Date().toISOString(),
          priorStopReason: old.stopReason,
        }
      : {
          id: spec.id,
          spec,
          startedAt: new Date().toISOString(),
          scales: [],
          complete: false,
        };
    delete record.stopReason;
    try {
      for (const size of SCALES) {
        if (record.scales.some((s) => s.size === size)) continue;
        await guard();
        const layout = buildLayout(spec, metrics, size);
        const html = await format(documentHtml(layout.markup), {
          parser: "html",
        });
        if (!record.layout) {
          const { markup, ...metadata } = layout;
          record.layout = metadata;
          await save(
            `${spec.id}-layout.json`,
            Buffer.from(
              await format(JSON.stringify(metadata), { parser: "json" }),
            ),
          );
          await save(`${spec.id}.html.gz`, gzipSync(html, { mtime: 0 }));
        }
        await page.setContent(html);
        await page.evaluate(() => document.fonts.ready);
        const png = await page
          .locator("#artifact")
          .screenshot({ animations: "disabled" });
        const path = `raw/${spec.id}-${size}.png`;
        await save(path, png);
        const p = await pixels(png),
          data = Buffer.from(p.base64, "base64");
        const qr = layout.qr,
          unit = size / qr.totalModules;
        let di = 0,
          li = 0,
          dn = 0,
          ln = 0;
        for (let y = 0; y < p.height; y++)
          for (let x = 0; x < p.width; x++) {
            const qx = Math.floor(x / unit) - qr.quiet,
              qy = Math.floor(y / unit) - qr.quiet;
            if (qx < 0 || qy < 0 || qx >= qr.modules || qy >= qr.modules)
              continue;
            const i = (y * p.width + x) * 4;
            const ink = 1 - (data[i] + data[i + 1] + data[i + 2]) / (3 * 255);
            if (qr.matrix[qy][qx]) {
              di += ink;
              dn++;
            } else {
              li += ink;
              ln++;
            }
          }
        record.scales.push({
          size,
          path,
          pngSha256: hash(png),
          rgbaSha256: hash(data),
          width: p.width,
          height: p.height,
          decoders: await decode(
            { data, width: p.width, height: p.height },
            spec.payload,
          ),
          density: {
            darkMeanInk: di / dn,
            lightMeanInk: li / ln,
            contrast: di / dn - li / ln,
          },
          input:
            "unchanged full DOM screenshot; four-module clear outer border",
        });
      }
      record.complete = true;
    } catch (error) {
      record.stopReason = error.message;
      halt = { reason: error.message, id: spec.id };
      throw error;
    } finally {
      await appendFile(
        resolve(out, "results.jsonl"),
        JSON.stringify(record) + "\n",
      );
      prior.set(record.id, record);
    }
    done++;
    if (done % 8 === 0)
      console.log(
        JSON.stringify({
          newCases: done,
          uniqueCases: prior.size,
          rawRecovered: [...prior.values()].filter((r) =>
            r.scales.some(
              (s) => s.decoders.jsQR.exact || s.decoders.zxing.exact,
            ),
          ).length,
          evidenceMB: Math.round(((await used()) / 1048576) * 10) / 10,
          elapsedMinutes: Math.round((Date.now() - start) / 6000) / 10,
        }),
      );
  }
} catch (error) {
  if (!halt) halt = { reason: error.message };
  console.log(JSON.stringify({ halt }));
} finally {
  await browser.close();
  await writeFile(
    resolve(out, "continuation-summary.json"),
    await format(
      JSON.stringify({
        finishedAt: new Date().toISOString(),
        elapsedSeconds: Math.round((Date.now() - start) / 1000),
        done,
        halt,
        uniqueCases: prior.size,
        completeCases: [...prior.values()].filter((r) => r.complete).length,
        storedEvidenceBytes: await used(),
      }),
      { parser: "json" },
    ),
    { flag: "wx" },
  );
  console.log(
    JSON.stringify({
      finished: true,
      done,
      halt,
      storedEvidenceBytes: await used(),
    }),
  );
}

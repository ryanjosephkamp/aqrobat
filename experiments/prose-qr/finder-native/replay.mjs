import { chromium } from "playwright";
import { readFile, writeFile, readdir } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { createHash } from "node:crypto";
import { format } from "prettier";
import assert from "node:assert/strict";
import { readBarcodes } from "zxing-wasm/reader";
import { diagnose, bundleHash } from "../glyph-geometry/diagnostic.mjs";
import { decode } from "../decoders.mjs";
import { finderMatrix } from "./layout.mjs";
const root = resolve("docs/research/prose-qr/phase-06"),
  hash = (b) => createHash("sha256").update(b).digest("hex"),
  inputs = [];
for (const e of (await readdir(root, { withFileTypes: true }))
  .filter((e) => e.isDirectory())
  .sort((a, b) => a.name.localeCompare(b.name))) {
  const base = resolve(root, e.name);
  let c;
  try {
    c = JSON.parse(await readFile(resolve(base, "controls.json"), "utf8"));
  } catch (e) {
    if (e.code === "ENOENT") continue;
    throw e;
  }
  inputs.push(
    { base, type: "full-control", record: c.fullQR },
    { base, type: "solid-control", record: c.solidFinder },
  );
  try {
    for (const s of (await readFile(resolve(base, "results.jsonl"), "utf8"))
      .trim()
      .split("\n")
      .filter(Boolean))
      inputs.push({ base, type: "native-finder", record: JSON.parse(s) });
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
}
assert.equal(inputs.filter((x) => x.type === "native-finder").length, 39);
assert.equal(inputs.length, 59);
const started = {
  at: new Date().toISOString(),
  sourceScriptSha256: hash(await readFile(new URL(import.meta.url))),
  diagnosticBundleSha256: bundleHash,
  diagnosticSourceSha256: hash(
    await readFile("experiments/prose-qr/glyph-geometry/diagnostic.mjs"),
  ),
  decoderSourceSha256: hash(
    await readFile("experiments/prose-qr/decoders.mjs"),
  ),
  nativeFinders: 39,
  fullControls: 10,
  solidControls: 10,
  classification:
    "Read-only retained PNG pixel/diagnostic replay, no rendering, new image or source mutation",
};
await writeFile(
  resolve(root, "pixel-replay-start-02.json"),
  await format(JSON.stringify(started), { parser: "json" }),
  { flag: "wx" },
);
const browser = await chromium.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  }),
  rows = [];
try {
  const page = await browser.newPage();
  for (const input of inputs) {
    const { base, type, record: r } = input,
      path = resolve(base, r.path),
      b = await readFile(path),
      result = {
        path: relative(process.cwd(), path),
        type,
        pngSha256: hash(b),
      };
    try {
      assert.equal(hash(b), r.pngSha256);
      const v = await page.evaluate(async (s) => {
          const img = new Image();
          img.src = "data:image/png;base64," + s;
          await img.decode();
          const c = document.createElement("canvas");
          c.width = img.width;
          c.height = img.height;
          const ctx = c.getContext("2d");
          ctx.drawImage(img, 0, 0);
          const data = ctx.getImageData(0, 0, c.width, c.height).data;
          let raw = "";
          for (let i = 0; i < data.length; i += 32768)
            raw += String.fromCharCode(...data.subarray(i, i + 32768));
          return { width: c.width, height: c.height, data: btoa(raw) };
        }, b.toString("base64")),
        p = {
          ...v,
          data: new Uint8ClampedArray(Buffer.from(v.data, "base64")),
        };
      assert.equal(v.width, r.width);
      assert.equal(v.height, r.height);
      assert.equal(hash(p.data), r.rgbaSha256);
      result.rgbaMatches = true;
      if (type === "full-control") {
        const d = await decode(p, "https://example.com/"),
          ordinary = await readBarcodes(p, { formats: ["QRCode"] });
        assert(
          d.jsQR.exact &&
            d.zxing.exact &&
            ordinary.some((x) => x.text === "https://example.com/"),
        );
        result.exactProfiles = 3;
      } else {
        const l =
            type === "solid-control"
              ? { unit: 24, modules: 25, quiet: 5, matrix: finderMatrix() }
              : {
                  ...JSON.parse(
                    await readFile(
                      resolve(base, r.id + "-layout.json"),
                      "utf8",
                    ),
                  ),
                  matrix: finderMatrix(),
                },
          d = diagnose(p, l),
          old = { ...r.diagnostic },
          now = { ...d };
        delete old.classification;
        delete now.classification;
        assert.deepEqual(JSON.parse(JSON.stringify(now)), old);
        result.diagnosticMatches = true;
        result.correctFinder = d.correctFinder;
      }
      result.passed = true;
    } catch (e) {
      result.passed = false;
      result.error = e.message;
    }
    rows.push(result);
  }
} finally {
  await browser.close();
  await writeFile(
    resolve(root, "pixel-replay-02.json"),
    await format(
      JSON.stringify({
        ...started,
        finishedAt: new Date().toISOString(),
        results: rows,
        passed: rows.filter((x) => x.passed).length,
        failed: rows.filter((x) => !x.passed).length,
        encodedCandidatePayloads: 0,
        phoneCandidates: 0,
      }),
      { parser: "json" },
    ),
    { flag: "wx" },
  );
}
assert.equal(rows.length, 59);
assert(rows.every((x) => x.passed));
console.log(
  JSON.stringify({
    passed: rows.length,
    nativeFinderDiagnosticReplays: 39,
    solidControlReplays: 10,
    fullQrControlProbeAttempts: 30,
  }),
);

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { format } from "prettier";
import jsQR from "jsqr";
import { readBarcodes } from "zxing-wasm/reader";
import { DECODER_PROVENANCE } from "../decoders.mjs";
import { auditSymbol } from "../finder-page/symbol-audit.mjs";
const root = "docs/research/prose-qr/phase-28/",
  out = root + "decode-01/",
  sha = (b) => createHash("sha256").update(b).digest("hex");
await mkdir(out);
const save = async (n, v) =>
  writeFile(out + n, await format(JSON.stringify(v), { parser: "json" }), {
    flag: "wx",
  });
const input = root + "run-01/native.png",
  capture = JSON.parse(await readFile(root + "run-01/capture.json")),
  spec = JSON.parse(await readFile(root + "run-01.json")).specs[0];
await save("manifest.json", {
  at: new Date().toISOString(),
  planned: 1,
  input,
  sources: Object.fromEntries(
    await Promise.all(
      [
        "experiments/prose-qr/whole-word-payload/decode.mjs",
        root + "DECODE-RESUME-PLAN.md",
        input,
        root + "run-01/capture.json",
        "experiments/prose-qr/finder-page/symbol-audit.mjs",
      ].map(async (p) => [p, sha(await readFile(p))]),
    ),
  ),
  reader: DECODER_PROVENANCE,
});
try {
  const png = await readFile(input);
  assert.equal(sha(png), capture.pngSha256);
  const bytes = execFileSync(
    "python3",
    [
      "-c",
      "import cv2,sys; i=cv2.imread(sys.argv[1]); sys.stdout.buffer.write(cv2.cvtColor(i,cv2.COLOR_BGR2RGBA).tobytes())",
      input,
    ],
    { maxBuffer: 200_000_000 },
  );
  assert.equal(bytes.length, capture.width * capture.height * 4);
  const p = {
    data: new Uint8ClampedArray(bytes),
    width: capture.width,
    height: capture.height,
  };
  await save("pixels.json", {
    path: input,
    pngSha256: sha(png),
    rgbaSha256: sha(bytes),
    width: p.width,
    height: p.height,
    priorNativeRGBAHash: null,
  });
  for (const [name, options] of [
    ["zxing-default", { formats: ["QRCode"] }],
    ["zxing-baseline", DECODER_PROVENANCE.readerOptions],
    ["zxing-errors-diagnostic", { formats: ["QRCode"], returnErrors: true }],
  ]) {
    const start = Date.now(),
      results = [];
    for (const [i, r] of (await readBarcodes(p, options)).entries()) {
      const s = r.symbol,
        rec = {
          isValid: r.isValid,
          error: r.error,
          text: r.text,
          bytes: Array.from(r.bytes ?? []),
          position: r.position,
          width: s?.width,
          height: s?.height,
          finderAudit: auditSymbol(r, {
            unit: spec.unit,
            quiet: 5,
            modules: 25,
          }),
        };
      if (s?.data?.length) {
        const f = name + `-${i}-symbol.bin`;
        await writeFile(out + f, Buffer.from(s.data), { flag: "wx" });
        rec.symbolPath = f;
        rec.symbolSha256 = sha(s.data);
        if (s.width === 25 && s.height === 25) {
          rec.wrongCells = [];
          for (let y = 0; y < 25; y++)
            for (let x = 0; x < 25; x++)
              if ((s.data[y * 25 + x] === 0) !== spec.matrix[y][x])
                rec.wrongCells.push([x, y]);
        }
      }
      results.push(rec);
    }
    const r = {
      ms: Date.now() - start,
      options,
      results,
      exact: results.some((r) => r.isValid && r.text === spec.payload),
    };
    await save(name + ".json", r);
    console.log(
      JSON.stringify({ name, exact: r.exact, found: results.length }),
    );
  }
  const start = Date.now(),
    r = jsQR(p.data, p.width, p.height, { inversionAttempts: "attemptBoth" });
  await save("jsqr.json", {
    ms: Date.now() - start,
    options: { inversionAttempts: "attemptBoth" },
    found: !!r,
    text: r?.data ?? null,
    exact: r?.data === spec.payload,
  });
  console.log(
    JSON.stringify({ name: "jsQR", exact: r?.data === spec.payload }),
  );
} catch (e) {
  await save("error.json", { error: e.stack, at: new Date().toISOString() });
  throw e;
}

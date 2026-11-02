// Decodes PNG buffers with ZXing (zxing-wasm, local WASM) and jsQR.
import { PNG } from "pngjs";
import jsQR from "jsqr";
import {
  readBarcodes,
  prepareZXingModule,
  ZXING_WASM_VERSION,
} from "zxing-wasm/reader";
import { readFile } from "node:fs/promises";

const wasm = await readFile(
  new URL(import.meta.resolve("zxing-wasm/reader/zxing_reader.wasm")),
);
await prepareZXingModule({
  overrides: { wasmBinary: Uint8Array.from(wasm).buffer },
  fireImmediately: true,
});
export const DECODERS = {
  zxingWasm: ZXING_WASM_VERSION,
  jsQR: "1.4.0",
  zxingOptions: { formats: ["QRCode"], tryHarder: true, maxNumberOfSymbols: 1 },
  jsQROptions: { inversionAttempts: "attemptBoth" },
};

const short = (s) =>
  s == null ? null : s.length > 120 ? s.slice(0, 120) + "…" : s;

export async function decodePng(buffer, expected) {
  const png = PNG.sync.read(buffer);
  const data = new Uint8ClampedArray(
    png.data.buffer,
    png.data.byteOffset,
    png.data.length,
  );
  const t0 = performance.now();
  const z = await readBarcodes(
    { data, width: png.width, height: png.height },
    DECODERS.zxingOptions,
  );
  const t1 = performance.now();
  const j = jsQR(data, png.width, png.height, DECODERS.jsQROptions);
  const t2 = performance.now();
  const zText = z[0]?.text ?? null;
  return {
    width: png.width,
    height: png.height,
    zxing: {
      pass: z.some((r) => r.text === expected),
      text: zText === expected ? undefined : short(zText),
      ms: Math.round(t1 - t0),
    },
    jsqr: {
      pass: j?.data === expected,
      text: j?.data === expected ? undefined : short(j?.data ?? null),
      ms: Math.round(t2 - t1),
    },
  };
}

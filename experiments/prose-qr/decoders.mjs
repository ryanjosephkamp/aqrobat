import jsQR from "jsqr";
import {
  readBarcodes,
  prepareZXingModule,
  ZXING_WASM_VERSION,
} from "zxing-wasm/reader";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const wasmPath = new URL(
  import.meta.resolve("zxing-wasm/reader/zxing_reader.wasm"),
);
const bytes = await readFile(wasmPath);
await prepareZXingModule({
  overrides: { wasmBinary: Uint8Array.from(bytes).buffer },
  fireImmediately: true,
});
export const DECODER_PROVENANCE = {
  jsQR: "1.4.0",
  zxingWasm: ZXING_WASM_VERSION,
  wasmBytes: bytes.length,
  wasmSha256: createHash("sha256").update(bytes).digest("hex"),
  readerOptions: {
    formats: ["QRCode"],
    tryHarder: true,
    maxNumberOfSymbols: 1,
  },
  network: "WASM loaded from installed local package, not a CDN",
};
export async function decode(pixels, expected) {
  const data = new Uint8ClampedArray(pixels.data);
  const a = jsQR(data, pixels.width, pixels.height, {
    inversionAttempts: "attemptBoth",
  });
  const b = await readBarcodes(
    { data, width: pixels.width, height: pixels.height },
    DECODER_PROVENANCE.readerOptions,
  );
  return {
    jsQR: { found: !!a, payload: a?.data ?? null, exact: a?.data === expected },
    zxing: {
      found: b.length > 0,
      payload: b[0]?.text ?? null,
      exact: b.some((r) => r.text === expected),
      results: b.map((r) => ({
        payload: r.text,
        format: r.format,
        isValid: r.isValid,
        bytes: Array.from(r.bytes || []),
      })),
    },
  };
}

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import jsQR from "jsqr";
import {
  readBarcodes,
  defaultReaderOptions,
  prepareZXingModule,
  ZXING_CPP_COMMIT,
  ZXING_WASM_VERSION,
} from "zxing-wasm/reader";

const [engine, path] = process.argv.slice(2);
const png = readFileSync(path);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const width = png.readUInt32BE(16);
const height = png.readUInt32BE(20);
const rgba = execFileSync(
  "python3",
  [
    "-B",
    "-c",
    "import cv2,sys; a=cv2.imread(sys.argv[1]); sys.stdout.buffer.write(cv2.cvtColor(a,cv2.COLOR_BGR2RGBA).tobytes())",
    path,
  ],
  { timeout: 20000, maxBuffer: 160000000 },
);
if (rgba.length !== width * height * 4) throw Error("RGBA size mismatch");
const input = { data: new Uint8ClampedArray(rgba), width, height };
const base = {
  engine,
  path,
  width,
  height,
  pngSha256: sha(png),
  rgbaSha256: sha(rgba),
  node: process.version,
  inputTransforms: "none; lossless PNG decoding to RGBA",
};
let result;
const started = Date.now();
if (engine === "jsqr") {
  const value = jsQR(input.data, width, height);
  result = {
    ...base,
    invocation: "jsQR(rgba,width,height); options argument omitted",
    version: "1.4.0",
    value,
    texts: value ? [value.data] : [],
  };
} else if (engine === "zxing" || engine === "configured-baseline") {
  const wasm = readFileSync(
    new URL(import.meta.resolve("zxing-wasm/reader/zxing_reader.wasm")),
  );
  await prepareZXingModule({
    overrides: { wasmBinary: Uint8Array.from(wasm).buffer },
    fireImmediately: true,
  });
  const configured = {
    formats: ["QRCode"],
    tryHarder: true,
    maxNumberOfSymbols: 1,
    binarizer: "GlobalHistogram",
    downscaleThreshold: 50,
    downscaleFactor: 2,
  };
  const values =
    engine === "zxing"
      ? await readBarcodes(input)
      : await readBarcodes(input, configured);
  result = {
    ...base,
    invocation:
      engine === "zxing"
        ? "readBarcodes(image); options argument omitted"
        : "historical configured baseline; excluded from ordinary acceptance",
    options: engine === "zxing" ? defaultReaderOptions : configured,
    version: ZXING_WASM_VERSION,
    ZXING_CPP_COMMIT,
    wasmSha256: sha(wasm),
    values,
    texts: values.filter((v) => v.isValid).map((v) => v.text),
  };
} else throw Error("Unknown reader");
console.log(JSON.stringify({ ...result, elapsedMs: Date.now() - started }));

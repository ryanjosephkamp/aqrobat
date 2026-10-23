import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import {
  readBarcodes,
  defaultReaderOptions,
  ZXING_CPP_COMMIT,
  ZXING_WASM_VERSION,
  ZXING_WASM_SHA256,
} from "zxing-wasm/reader";
import jsQR from "jsqr";
import { passive, passiveHash } from "./passive.mjs";
import { sha, strict } from "./common.mjs";
const [engine, path, capturePath] = process.argv.slice(2);
const png = readFileSync(path);
const width = png.readUInt32BE(16),
  height = png.readUInt32BE(20);
const rgba = execFileSync(
  "python3",
  [
    "-c",
    "import cv2,sys;a=cv2.imread(sys.argv[1]);sys.stdout.buffer.write(cv2.cvtColor(a,cv2.COLOR_BGR2RGBA).tobytes())",
    path,
  ],
  { timeout: 10000, maxBuffer: 1000000 },
);
if (width !== 396 || height !== 396 || rgba.length !== width * height * 4)
  throw Error("Unexpected capture dimensions");
const image = { data: new Uint8ClampedArray(rgba), width, height };
const base = {
  engine,
  path,
  pngSha256: sha(png),
  rgbaSha256: sha(rgba),
  width,
  height,
  nodeVersion: process.version,
  executablePath: process.execPath,
};
let value;
if (engine === "zxing") {
  const results = await readBarcodes(image);
  value = {
    ...base,
    invocation: "readBarcodes(imageData) with no options argument",
    optionsArgumentOmitted: true,
    installedDefaultOptions: defaultReaderOptions,
    ZXING_CPP_COMMIT,
    ZXING_WASM_VERSION,
    ZXING_WASM_SHA256,
    results,
    texts: results.filter((x) => x.isValid).map((x) => x.text),
  };
} else if (engine === "jsqr") {
  const result = jsQR(image.data, width, height);
  value = {
    ...base,
    invocation: "jsQR(rgba,width,height) with no options argument",
    optionsArgumentOmitted: true,
    installedDefaultOptions: { inversionAttempts: "attemptBoth" },
    result,
    texts: result ? [result.data] : [],
  };
} else if (engine === "passive") {
  const capture = JSON.parse(readFileSync(capturePath));
  const ordinary = JSON.parse(readFileSync(capture.dir + "/jsqr.raw.json.txt"));
  const result = passive(image, ordinary.result, capture.geometry);
  value = {
    ...base,
    passiveHash,
    ordinaryPngSha256: ordinary.pngSha256,
    ordinaryRgbaSha256: ordinary.rgbaSha256,
    ...result,
    scans: result.scans.map((s) => ({ ...s, strictPass: strict(s) })),
  };
} else throw Error("Unknown engine");
console.log(JSON.stringify(value));

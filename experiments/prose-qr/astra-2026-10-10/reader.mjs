import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { readBarcodes } from "zxing-wasm/reader";
import jsQR from "jsqr";
import { passive, passiveHash } from "./passive.mjs";
import { sha, strict } from "./common.mjs";
const [engine, path, capturePath] = process.argv.slice(2);
const b = readFileSync(path),
  width = b.readUInt32BE(16),
  height = b.readUInt32BE(20);
assert(width * height <= 4000000);
const data = execFileSync(
  "python3",
  [
    "-c",
    "import cv2,sys;a=cv2.imread(sys.argv[1]);sys.stdout.buffer.write(cv2.cvtColor(a,cv2.COLOR_BGR2RGBA).tobytes())",
    path,
  ],
  { maxBuffer: 16000000, timeout: 10000 },
);
assert.equal(data.length, width * height * 4);
const p = { data: new Uint8ClampedArray(data), width, height },
  base = {
    engine,
    path,
    pngSha256: sha(b),
    rgbaSha256: sha(data),
    width,
    height,
  };
let value;
if (engine === "zxing") {
  const options = { formats: ["QRCode"] },
    r = await readBarcodes(p, options);
  value = {
    ...base,
    options,
    results: r.map((x) => ({
      text: x.text,
      isValid: x.isValid,
      error: x.error,
      position: x.position,
    })),
    texts: r.filter((x) => x.isValid).map((x) => x.text),
  };
} else if (engine === "jsqr") {
  const options = { inversionAttempts: "attemptBoth" },
    r = jsQR(p.data, width, height, options);
  value = { ...base, options, result: r, texts: r ? [r.data] : [] };
} else if (engine === "passive") {
  const capture = JSON.parse(readFileSync(capturePath)),
    baseline = JSON.parse(readFileSync(capture.dir + "/jsqr.json")).result;
  const result = passive(p, baseline, capture.geometry);
  value = {
    ...base,
    passiveHash,
    ...result,
    scans: result.scans.map((s) => ({ ...s, strictPass: strict(s) })),
  };
} else throw Error("Unknown engine");
console.log(JSON.stringify(value));

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import Module from "node:module";
import { resolve, dirname } from "node:path";
const path = process.argv[2];
const sha = (b) => createHash("sha256").update(b).digest("hex");
const file = resolve("docs/research/prose-qr/phase-26/package-01/main.cjs.txt");
const mod = new Module(file);
mod.filename = file;
mod.paths = Module._nodeModulePaths(dirname(file));
mod._compile(readFileSync(file, "utf8"), file);
const png = readFileSync(path),
  width = png.readUInt32BE(16),
  height = png.readUInt32BE(20);
const rgba = execFileSync(
  "python3",
  [
    "-B",
    "-c",
    "import cv2,sys; a=cv2.imread(sys.argv[1]);sys.stdout.buffer.write(cv2.cvtColor(a,cv2.COLOR_BGR2RGBA).tobytes())",
    path,
  ],
  { maxBuffer: 160000000, timeout: 20000 },
);
const start = Date.now();
const values = (
  await mod.exports.scanImageData({
    data: new Uint8ClampedArray(rgba),
    width,
    height,
  })
).map((r) => ({
  type: r.type,
  typeName: r.typeName,
  text: r.decode(),
  rawData: Array.from(r.data ?? []),
  points: r.points,
  quality: r.quality,
  orientation: r.orientation,
}));
console.log(
  JSON.stringify({
    engine: "zbar",
    version: "0.23.90; archived @undecaf wrapper",
    path,
    width,
    height,
    pngSha256: sha(png),
    rgbaSha256: sha(rgba),
    wrapperSha256: sha(readFileSync(file)),
    wasmSha256: sha(readFileSync(resolve(dirname(file), "zbar.wasm"))),
    invocation: "scanImageData(imageData); options omitted",
    inputTransforms: "none; lossless PNG decoding to RGBA",
    values,
    texts: values.map((r) => r.text),
    elapsedMs: Date.now() - start,
  }),
);

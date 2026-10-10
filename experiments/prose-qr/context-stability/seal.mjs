import { readFile, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { gunzipSync } from "node:zlib";
import { format } from "prettier";
import assert from "node:assert/strict";

const root = "docs/research/prose-qr/phase-32",
  source = "experiments/prose-qr/context-stability";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const json = async (p, v) =>
  writeFile(p, await format(JSON.stringify(v), { parser: "json" }), {
    flag: "wx",
  });
const files = [];
async function walk(p) {
  for (const e of await readdir(p, { withFileTypes: true })) {
    const q = p + "/" + e.name;
    if (e.isDirectory()) await walk(q);
    else files.push(q);
  }
}
await walk(root);
await walk(source);
const refs = [];
for (const p of files.filter((p) => p.endsWith(".json"))) {
  const v = JSON.parse(await readFile(p));
  if (v.sources)
    for (const [q, h] of Object.entries(v.sources)) {
      const b = await readFile(q);
      assert.equal(sha(b), h, q);
      refs.push({ receipt: p, path: q, sha256: h });
    }
}
for (const run of ["run-01", "run-02"]) {
  const c = JSON.parse(await readFile(`${root}/${run}/capture.json`)),
    p = JSON.parse(await readFile(`${root}/${run}/native-pixels.json`));
  assert(c.repeatExact);
  assert.equal(c.pngSha256, c.repeatSha256);
  assert.equal(sha(await readFile(p.path)), p.pngSha256);
  assert.equal(c.pngSha256, p.pngSha256);
  const actual = JSON.parse(
    execFileSync(
      "python3",
      [
        "-c",
        "import cv2,hashlib,json,sys; im=cv2.imread(sys.argv[1]); rgba=cv2.cvtColor(im,cv2.COLOR_BGR2RGBA); print(json.dumps({'width':im.shape[1],'height':im.shape[0],'rgbaSha256':hashlib.sha256(rgba.tobytes()).hexdigest()}))",
        p.path,
      ],
      { encoding: "utf8" },
    ),
  );
  assert.equal(actual.rgbaSha256, p.rgbaSha256);
  assert.equal(actual.width, p.width);
  assert.equal(actual.height, p.height);
  const q = JSON.parse(
    gunzipSync(await readFile(`${root}/${run}/solid-stroke-probe.json.gz`)),
  );
  assert(q.structurePass);
  for (const name of ["control-jsqr.json", "control-zxing-default.json"]) {
    const q = JSON.parse(await readFile(`${root}/${run}/${name}`));
    assert(q.exact);
  }
}
assert(!(await readdir(root)).includes("run-03"));
const opencv = JSON.parse(await readFile(root + "/opencv-01/control.json"));
assert(opencv.exactControl);
const priorPath = "docs/research/prose-qr/session-2026-10-09/custody.json",
  prior = JSON.parse(await readFile(priorPath));
for (const f of prior.inventory) {
  const b = await readFile(f.path);
  assert.equal(b.length, f.bytes);
  assert.equal(sha(b), f.sha256, f.path);
}
for (const d of prior.downloads)
  assert.equal(sha(await readFile("downloads/" + d.name)), d.sha256);
const verification = {
  at: new Date().toISOString(),
  anchorHead: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  sourceRefs: refs.length,
  priorSessionFiles: prior.inventory.length,
  downloadsUnchanged: prior.downloads.length,
  PNGandRGBAReplays: 2,
  exactImmediateRepeatReceipts: 2,
  solidStrictPasses: 2,
  conventionalOrdinaryControlsExact: 5,
  strictNativePasses: 0,
  goal: "unsolved",
  phoneTests: 0,
  priorCustodySha256: sha(await readFile(priorPath)),
  sources: {
    [source + "/seal.mjs"]: sha(await readFile(source + "/seal.mjs")),
  },
};
await json(root + "/verification.json", verification);
files.push(root + "/verification.json");
const inventory = await Promise.all(
  files.sort().map(async (p) => {
    const b = await readFile(p);
    return { path: p, bytes: b.length, sha256: sha(b) };
  }),
);
const c = {
  at: new Date().toISOString(),
  anchorHead: verification.anchorHead,
  cap: 8000000,
  goal: "unsolved",
  counts: {
    plannedNative: 3,
    attempted: 2,
    completed: 2,
    exactRepeats: 2,
    unattempted: 1,
    producerErrors: 1,
    phoneTests: 0,
    newPayloads: 0,
  },
  priorCustody: { path: priorPath, sha256: verification.priorCustodySha256 },
  inventory,
};
const content = await format(JSON.stringify(c), { parser: "json" });
const total =
  inventory.reduce((n, f) => n + f.bytes, 0) + Buffer.byteLength(content);
assert(total < c.cap);
await writeFile(root + "/custody.json", content, { flag: "wx" });
console.log(
  JSON.stringify({
    sealed: true,
    files: inventory.length,
    totalLogicalBytes: total,
    cap: c.cap,
    sourceRefs: refs.length,
  }),
);

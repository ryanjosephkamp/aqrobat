import { readFile, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import { format } from "prettier";
import assert from "node:assert/strict";
import { unpackProbe } from "../context-probe-pack/probe-pack.mjs";
const sha = (b) => createHash("sha256").update(b).digest("hex"),
  json = async (p, v) =>
    writeFile(p, await format(JSON.stringify(v), { parser: "json" }), {
      flag: "wx",
    });
const scopes = {
  35: ["context-densewords", 8000000],
  36: ["context-proportional", 8000000],
  37: ["context-probe-pack", 5000000],
  38: ["context-row-period", 8000000],
  39: ["context-impact-replay", 6000000],
  40: ["context-independent-controls", 150000],
  41: ["context-word-period", 12000000],
  42: ["context-word-flat", 12000000],
  43: ["context-glyph-period", 12000000],
  44: ["context-geometry-repeat", 200000],
  45: ["context-full-payload", 12000000],
  46: ["context-other-readers", 400000],
  47: ["context-scale-diagnostic", 200000],
  48: ["context-vision-replay", 200000],
};
const phases = process.argv.slice(2).map(Number);
assert(phases.length && phases.every((n) => scopes[n]));
const prior = [];
for (const n of [32, 33, 34]) {
  const p = `docs/research/prose-qr/phase-${n}/custody.json`,
    b = await readFile(p),
    c = JSON.parse(b);
  for (const f of c.inventory) {
    const a = await readFile(f.path);
    assert.equal(a.length, f.bytes);
    assert.equal(sha(a), f.sha256, f.path);
  }
  prior.push({ path: p, sha256: sha(b), entries: c.inventory.length });
}
for (const n of phases) {
  const root = `docs/research/prose-qr/phase-${n}`,
    source = `experiments/prose-qr/${scopes[n][0]}`,
    files = [];
  async function walk(p) {
    for (const e of await readdir(p, { withFileTypes: true })) {
      const q = p + "/" + e.name;
      if (e.isDirectory()) await walk(q);
      else files.push(q);
    }
  }
  await walk(root);
  await walk(source);
  let refs = 0,
    packed = 0,
    pngRefs = 0;
  for (const p of files.filter((p) => p.endsWith(".json"))) {
    const q = JSON.parse(await readFile(p));
    if (q.sources)
      for (const [s, h] of Object.entries(q.sources)) {
        assert.equal(sha(await readFile(s)), h, s);
        refs++;
      }
    if (q.pngSha256 && q.path) {
      assert.equal(sha(await readFile(q.path)), q.pngSha256);
      pngRefs++;
    }
    if (q.pngSha256 && q.pngPath) {
      assert.equal(sha(await readFile(q.pngPath)), q.pngSha256);
      pngRefs++;
    }
    for (const r of [...(q.resources ?? []), ...(q.priorResources ?? [])])
      if (r.pngPath) {
        assert.equal(sha(await readFile(r.pngPath)), r.pngSha256);
        pngRefs++;
      }
    if (q.codec === "native-probe-f64-v1" && p.endsWith("-pack.json")) {
      const prefix = p.slice(0, -"-pack.json".length),
        core = await readFile(prefix + "-core.json.gz"),
        geo = await readFile(prefix + "-geometry.f64.gz"),
        object = unpackProbe(core, geo, q);
      assert.equal(sha(JSON.stringify(object)), q.originalJSONSha256);
      packed++;
    }
  }
  const analysis = JSON.parse(await readFile(root + "/analysis.json"));
  assert.equal(analysis.goal, "unsolved");
  assert.equal(analysis.phoneTests, 0);
  const receipt = {
    at: new Date().toISOString(),
    phase: n,
    anchorHead: execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
    verifiedSources: refs,
    verifiedPNGRefs: pngRefs,
    losslessPackedTracesVerified: packed,
    prior,
    goal: "unsolved",
    phoneTests: 0,
    sources: {
      "experiments/prose-qr/session-2026-10-10/seal-phases-v3.mjs": sha(
        await readFile(
          "experiments/prose-qr/session-2026-10-10/seal-phases-v3.mjs",
        ),
      ),
    },
  };
  await json(root + "/verification.json", receipt);
  files.push(root + "/verification.json");
  const inventory = await Promise.all(
    files.sort().map(async (p) => {
      const b = await readFile(p);
      return { path: p, bytes: b.length, sha256: sha(b) };
    }),
  );
  const custody = {
    at: new Date().toISOString(),
    phase: n,
    anchorHead: receipt.anchorHead,
    cap: scopes[n][1],
    goal: "unsolved",
    prior,
    inventory,
  };
  const content = await format(JSON.stringify(custody), { parser: "json" }),
    bytes =
      inventory.reduce((n, r) => n + r.bytes, 0) + Buffer.byteLength(content);
  assert(bytes < custody.cap, "phase cap");
  await writeFile(root + "/custody.json", content, { flag: "wx" });
  console.log(
    JSON.stringify({
      phase: n,
      sealed: true,
      files: inventory.length,
      logicalBytes: bytes,
      cap: custody.cap,
      refs,
      packed,
    }),
  );
}

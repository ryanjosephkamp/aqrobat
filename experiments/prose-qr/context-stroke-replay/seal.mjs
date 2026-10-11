import { readFile, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { format } from "prettier";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const json = async (p, v) =>
  writeFile(p, await format(JSON.stringify(v), { parser: "json" }), {
    flag: "wx",
  });
const priorPath = "docs/research/prose-qr/phase-32/custody.json",
  prior = JSON.parse(await readFile(priorPath));
for (const f of prior.inventory) {
  const b = await readFile(f.path);
  assert.equal(sha(b), f.sha256, f.path);
  assert.equal(b.length, f.bytes);
}
for (const [n, source, cap] of [
  [33, "experiments/prose-qr/context-stagger", 10000000],
  [34, "experiments/prose-qr/context-stroke-replay", 4000000],
]) {
  const root = `docs/research/prose-qr/phase-${n}`,
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
  let refs = 0;
  for (const p of files.filter((p) => p.endsWith(".json"))) {
    const v = JSON.parse(await readFile(p));
    if (v.sources)
      for (const [q, h] of Object.entries(v.sources)) {
        assert.equal(sha(await readFile(q)), h, q);
        refs++;
      }
  }
  if (n === 33) {
    for (const run of ["run-01", "run-02"]) {
      const c = JSON.parse(await readFile(`${root}/${run}/capture.json`)),
        p = JSON.parse(await readFile(`${root}/${run}/native-pixels.json`));
      assert(c.repeatExact);
      assert.equal(c.repeatSha256, c.pngSha256);
      assert.equal(sha(await readFile(p.path)), p.pngSha256);
      assert.equal(c.pngSha256, p.pngSha256);
    }
    assert(
      JSON.parse(await readFile(root + "/opencv-01/control.json")).exactControl,
    );
    assert(
      (await readFile(root + "/run-02/aborted.json", "utf8")).includes(
        "reserve reached",
      ),
    );
  } else {
    const a = JSON.parse(
        await readFile(root + "/replay-01/native-summary.json"),
      ),
      b = JSON.parse(await readFile(root + "/replay-01/solid-summary.json"));
    assert(!a.structurePass);
    assert(b.structurePass);
    const q = JSON.parse(
      gunzipSync(await readFile(root + "/replay-01/native-probe.json.gz")),
    );
    assert.equal(a.structurePass, q.structurePass);
    assert.equal(
      a.traceSha256,
      sha(await readFile(root + "/replay-01/native-probe.json.gz")),
    );
  }
  const receipt = {
    at: new Date().toISOString(),
    anchorHead: execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
    phase: n,
    verifiedSources: refs,
    prior32FilesVerified: prior.inventory.length,
    priorCustodySha256: sha(await readFile(priorPath)),
    goal: "unsolved",
    phoneTests: 0,
    sources: {
      "experiments/prose-qr/context-stroke-replay/seal.mjs": sha(
        await readFile("experiments/prose-qr/context-stroke-replay/seal.mjs"),
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
    anchorHead: receipt.anchorHead,
    phase: n,
    cap,
    goal: "unsolved",
    prior: { path: priorPath, sha256: receipt.priorCustodySha256 },
    inventory,
  };
  const content = await format(JSON.stringify(custody), { parser: "json" }),
    bytes =
      inventory.reduce((n, f) => n + f.bytes, 0) + Buffer.byteLength(content);
  assert(bytes < cap);
  await writeFile(root + "/custody.json", content, { flag: "wx" });
  console.log(
    JSON.stringify({
      phase: n,
      sealed: true,
      files: inventory.length,
      logicalBytes: bytes,
      cap,
      refs,
    }),
  );
}

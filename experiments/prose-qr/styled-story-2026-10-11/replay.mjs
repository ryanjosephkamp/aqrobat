import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

const out = resolve("docs/research/prose-qr/styled-story-2026-10-11/baseline");
await mkdir(out);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const inputs = [
  {
    id: "band-023",
    path: "docs/research/prose-qr/phase-02/batch-02/raw/band-023-2233.png",
    expected: "AQROBAT-TEST",
    engines: ["zxing", "jsqr", "opencv", "configured-baseline"],
  },
  {
    id: "phase-14",
    path: "docs/research/prose-qr/phase-14/run-01/native.png",
    expected: "https://example.com/",
    engines: ["zxing", "jsqr", "opencv"],
  },
  {
    id: "conventional",
    path: "docs/research/prose-qr/integrated-2026-10-10/empirical/payload-04/canonical-control/input.png",
    expected: "https://example.com/",
    engines: ["zxing", "jsqr", "opencv"],
  },
];
const sources = {};
for (const p of ["reader.mjs", "opencv.py", "replay.mjs"]) {
  const bytes = await readFile(new URL(p, import.meta.url));
  sources[p] = sha(bytes);
  await writeFile(resolve(out, p + ".txt"), bytes, { flag: "wx" });
}
await writeFile(
  resolve(out, "manifest.json"),
  JSON.stringify(
    {
      at: new Date().toISOString(),
      inputs,
      sources,
      calls: 10,
      freshCaptures: 0,
      head: execFileSync("git", ["rev-parse", "HEAD"], {
        encoding: "utf8",
      }).trim(),
    },
    null,
    2,
  ),
  { flag: "wx" },
);
const rows = [];
for (const input of inputs) {
  for (const engine of input.engines) {
    const args =
      engine === "opencv"
        ? [
            "-B",
            "experiments/prose-qr/styled-story-2026-10-11/opencv.py",
            input.path,
          ]
        : [
            "experiments/prose-qr/styled-story-2026-10-11/reader.mjs",
            engine,
            input.path,
          ];
    const raw = spawnSync(
      engine === "opencv" ? "python3" : process.execPath,
      args,
      { timeout: 45000, maxBuffer: 12000000, encoding: "utf8" },
    );
    await writeFile(
      resolve(out, `${input.id}-${engine}.stdout.txt`),
      raw.stdout || "",
      { flag: "wx" },
    );
    await writeFile(
      resolve(out, `${input.id}-${engine}.stderr.txt`),
      raw.stderr || "",
      { flag: "wx" },
    );
    let value = null;
    try {
      value = JSON.parse(raw.stdout);
    } catch {}
    const row = {
      id: input.id,
      engine,
      status: raw.status,
      error: raw.error?.message || null,
      pngSha256: sha(await readFile(input.path)),
      texts: value?.texts || null,
      exact: value ? value.texts.includes(input.expected) : null,
    };
    rows.push(row);
    console.log(JSON.stringify(row));
  }
}
await writeFile(
  resolve(out, "results.json"),
  JSON.stringify({ finishedAt: new Date().toISOString(), rows }, null, 2),
  { flag: "wx" },
);

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { format } from "prettier";
const root = "docs/research/prose-qr/phase-18/",
  sha = (b) => createHash("sha256").update(b).digest("hex");
await mkdir(root + "proposal-01");
let i = 0;
const configs = [];
for (const path of [
  "docs/research/prose-qr/phase-16/run-01.json",
  "docs/research/prose-qr/phase-17/run-02.json",
]) {
  const b = await readFile(path),
    original = JSON.parse(b).specs[0];
  for (const [dx, offset] of [
    [0, 6],
    [6, 0],
  ]) {
    const spec = {
      ...original,
      id: `source-translate-${++i}`,
      dx,
      offset,
      originalSource: path,
      originalSourceSha256: sha(b),
    };
    const output = root + `run-0${i}.json`,
      content = await format(
        JSON.stringify({
          batch: `run-0${i}`,
          plan: root + "PLAN.md",
          specs: [spec],
        }),
        { parser: "json" },
      );
    await writeFile(output, content, { flag: "wx" });
    configs.push({
      path: output,
      sha256: sha(content),
      originalSource: path,
      originalSourceSha256: sha(b),
      dx,
      dy: offset,
    });
  }
}
await writeFile(
  root + "proposal-01/manifest.json",
  await format(
    JSON.stringify({
      at: new Date().toISOString(),
      configs,
      sources: Object.fromEntries(
        await Promise.all(
          [
            "experiments/prose-qr/finder-source-translate/proposal.mjs",
            root + "PLAN.md",
          ].map(async (p) => [p, sha(await readFile(p))]),
        ),
      ),
    }),
    { parser: "json" },
  ),
  { flag: "wx" },
);
console.log(JSON.stringify(configs));

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { format } from "prettier";
const root = "docs/research/prose-qr/phase-20/",
  original = "docs/research/prose-qr/phase-17/run-02.json",
  sha = (b) => createHash("sha256").update(b).digest("hex");
await mkdir(root + "proposal-01");
const b = await readFile(original),
  source = JSON.parse(b).specs[0],
  configs = [];
let i = 0;
for (const [leading, tracking] of [
  [14, 0.125],
  [14.25, 0],
  [14.25, 0.125],
]) {
  const spec = {
    ...source,
    id: `native-rhythm-${++i}`,
    leading,
    tracking,
    dx: 6,
    originalSource: original,
    originalSourceSha256: sha(b),
  };
  const p = root + `run-0${i}.json`,
    content = await format(
      JSON.stringify({
        batch: `run-0${i}`,
        plan: root + "PLAN.md",
        specs: [spec],
      }),
      { parser: "json" },
    );
  await writeFile(p, content, { flag: "wx" });
  configs.push({ path: p, sha256: sha(content), leading, tracking });
}
await writeFile(
  root + "proposal-01/manifest.json",
  await format(
    JSON.stringify({
      at: new Date().toISOString(),
      configs,
      originalSource: original,
      originalSourceSha256: sha(b),
      sources: Object.fromEntries(
        await Promise.all(
          [
            "experiments/prose-qr/finder-text-rhythm/proposal.mjs",
            root + "PLAN.md",
          ].map(async (p) => [p, sha(await readFile(p))]),
        ),
      ),
    }),
    { parser: "json" },
  ),
  { flag: "wx" },
);

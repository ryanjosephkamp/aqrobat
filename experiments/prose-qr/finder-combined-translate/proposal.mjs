import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { format } from "prettier";
const root = "docs/research/prose-qr/phase-24/",
  input = "docs/research/prose-qr/phase-17/run-02.json",
  sha = (b) => createHash("sha256").update(b).digest("hex");
await mkdir(root + "proposal-01");
const b = await readFile(input),
  spec = {
    ...JSON.parse(b).specs[0],
    id: "combined-translate",
    dx: 6,
    offset: 6,
    originalSource: input,
    originalSourceSha256: sha(b),
  },
  p = root + "run-01.json",
  c = await format(
    JSON.stringify({ batch: "run-01", plan: root + "PLAN.md", specs: [spec] }),
    { parser: "json" },
  );
await writeFile(p, c, { flag: "wx" });
await writeFile(
  root + "proposal-01/manifest.json",
  await format(
    JSON.stringify({
      at: new Date().toISOString(),
      input,
      inputSha256: sha(b),
      configSha256: sha(c),
      sources: Object.fromEntries(
        await Promise.all(
          [
            "experiments/prose-qr/finder-combined-translate/proposal.mjs",
            root + "PLAN.md",
          ].map(async (p) => [p, sha(await readFile(p))]),
        ),
      ),
    }),
    { parser: "json" },
  ),
  { flag: "wx" },
);

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { format } from "prettier";
const root = "docs/research/prose-qr/phase-31/",
  sha = (b) => createHash("sha256").update(b).digest("hex"),
  input = "docs/research/prose-qr/phase-29/run-01.json";
await mkdir(root + "proposal-01");
const b = await readFile(input),
  base = JSON.parse(b).specs[0],
  spec = {
    ...base,
    id: "native-enlargement",
    size: 18,
    leading: 18,
    unit: 216,
    textField: 7 * 216,
    columnWidths: [7, 11, 7].map((n) => n * 216),
  };
const config = await format(
  JSON.stringify({ batch: "run-01", plan: root + "PLAN.md", specs: [spec] }),
  { parser: "json" },
);
await writeFile(root + "run-01.json", config, { flag: "wx" });
await writeFile(
  root + "proposal-01/manifest.json",
  await format(
    JSON.stringify({
      at: new Date().toISOString(),
      input,
      inputSha256: sha(b),
      configSha256: sha(config),
      sourceScale: 9 / 7,
      wordBytesPreserved: true,
      sources: Object.fromEntries(
        await Promise.all(
          [
            input,
            root + "PLAN.md",
            "experiments/prose-qr/finder-native-enlargement/proposal.mjs",
          ].map(async (p) => [p, sha(await readFile(p))]),
        ),
      ),
    }),
    { parser: "json" },
  ),
  { flag: "wx" },
);

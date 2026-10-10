import { execFileSync } from "node:child_process";
import { writeFile, readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { format } from "prettier";
const root = "docs/research/prose-qr/session-2026-10-10-d/",
  name = process.argv[2];
if (!["test", "format:check"].includes(name)) throw Error("Unknown check");
let output,
  status = 0;
try {
  output = execFileSync("npm", name === "test" ? ["test"] : ["run", name], {
    encoding: "utf8",
    maxBuffer: 2000000,
  });
} catch (e) {
  status = e.status ?? 1;
  output = (e.stdout ?? "") + (e.stderr ?? "");
}
const id = name.replace(":", "-"),
  sha = (b) => createHash("sha256").update(b).digest("hex");
await writeFile(root + id + ".log.gz", gzipSync(output), { flag: "wx" });
await writeFile(
  root + id + ".json",
  await format(
    JSON.stringify({
      command: "npm " + (name === "test" ? "test" : "run " + name),
      status,
      outputSha256: sha(output),
      sources: {
        "experiments/prose-qr/session-2026-10-10-d/checks.mjs": sha(
          await readFile(new URL(import.meta.url)),
        ),
      },
    }),
    { parser: "json" },
  ),
  { flag: "wx" },
);
console.log(output.slice(-1500));
process.exitCode = status;

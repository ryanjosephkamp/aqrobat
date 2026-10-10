import { execFileSync } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import assert from "node:assert/strict";
import {
  root,
  source,
  read,
  json,
  save,
  sha,
  sources,
  checkTime,
} from "./common.mjs";
checkTime();
const phase = process.argv[2];
assert(/^[a-z]+-\d+$/.test(phase));
const out = root + "/" + phase;
const captures = await read(out + "/captures.json");
await json(out + "/readers-manifest.json", {
  at: new Date().toISOString(),
  sources: await sources([
    source + "/read-captures.mjs",
    source + "/reader.mjs",
    source + "/common.mjs",
    source + "/passive.mjs",
    "experiments/prose-qr/context-letter-counters/ordinary.py",
    out + "/PLAN.md",
  ]),
  plannedSlots: captures.length * 3,
  readerTimeoutMs: 45000,
});
const slots = [];
let passiveProfiles = 0,
  stockBranches = 0;
for (const c of captures) {
  assert.equal(sha(await readFile(c.pngPath)), c.pngSha256);
  for (const engine of ["opencv", "zxing", "jsqr"]) {
    const row = {
      id: c.id,
      control: !!c.control,
      engine,
      status: "unattempted",
      texts: [],
    };
    if (c.rejected) {
      row.reason = c.reasons.join("; ");
    } else if (Date.now() > Date.parse("2026-10-10T19:35:30Z")) {
      row.reason = "Deadline reserve";
    } else {
      try {
        const raw =
          engine === "opencv"
            ? execFileSync(
                "python3",
                [
                  "experiments/prose-qr/context-letter-counters/ordinary.py",
                  c.pngPath,
                ],
                { encoding: "utf8", timeout: 45000, maxBuffer: 1000000 },
              )
            : execFileSync(
                process.execPath,
                [source + "/reader.mjs", engine, c.pngPath],
                { encoding: "utf8", timeout: 45000, maxBuffer: 2000000 },
              );
        const result = JSON.parse(raw);
        await json(c.dir + "/" + engine + ".json", result);
        row.status = result.error ? "error" : "completed";
        row.texts =
          engine === "opencv"
            ? result.text
              ? [result.text]
              : []
            : result.texts;
        row.exactExpected = c.payload !== null && row.texts.includes(c.payload);
        row.unexpectedText =
          c.payload === null
            ? row.texts
            : row.texts.filter((t) => t !== c.payload);
      } catch (e) {
        row.status = e.code === "ETIMEDOUT" ? "timeout" : "error";
        row.error = {
          message: e.message,
          code: e.code,
          signal: e.signal,
          stdout: e.stdout?.toString(),
          stderr: e.stderr?.toString(),
        };
        await json(c.dir + "/" + engine + "-error.json", row);
      }
    }
    slots.push(row);
    await json(c.dir + "/" + engine + "-slot.json", row);
  }
  if (!c.rejected && slots.at(-1)?.status === "completed") {
    try {
      const raw = execFileSync(
        process.execPath,
        [source + "/reader.mjs", "passive", c.pngPath, c.dir + "/capture.json"],
        { encoding: "utf8", timeout: 45000, maxBuffer: 12000000 },
      );
      const full = JSON.parse(raw);
      await save(c.dir + "/passive-full.json.gz", gzipSync(raw));
      await json(c.dir + "/passive-summary.json", {
        ...full,
        scans: full.scans.map(({ allScoredRuns, allQuads, ...s }) => ({
          ...s,
          scoredRuns: allScoredRuns.length,
          quads: allQuads.length,
        })),
      });
      passiveProfiles++;
      stockBranches += full.stockBranchesActuallyExecuted;
    } catch (e) {
      await json(c.dir + "/passive-error.json", {
        message: e.message,
        code: e.code,
        signal: e.signal,
        stderr: e.stderr?.toString(),
      });
    }
  }
  console.log(JSON.stringify({ id: c.id, slots: slots.slice(-3) }));
}
await json(out + "/reader-results.json", {
  at: new Date().toISOString(),
  plannedPrimarySlots: captures.length * 3,
  completedPrimarySlots: slots.filter((s) => s.status === "completed").length,
  errorSlots: slots.filter((s) => s.status === "error").length,
  timeoutSlots: slots.filter((s) => s.status === "timeout").length,
  unattemptedSlots: slots.filter((s) => s.status === "unattempted").length,
  passiveProfiles,
  stockBranches,
  slots,
});

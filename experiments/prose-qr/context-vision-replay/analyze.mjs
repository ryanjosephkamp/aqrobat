import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { format } from "prettier";
const root = "docs/research/prose-qr/phase-48/",
  sha = (b) => createHash("sha256").update(b).digest("hex"),
  maybe = async (p) => {
    try {
      return JSON.parse(await readFile(p));
    } catch (e) {
      if (e.code === "ENOENT") return null;
      throw e;
    }
  },
  rows = [],
  refs = [
    "experiments/prose-qr/context-vision-replay/analyze.mjs",
    root + "run-01/manifest.json",
  ];
for (const id of ["control", "native"]) {
  const dir = root + "run-01/" + id + "/",
    result = await maybe(dir + "result.json"),
    error = await maybe(dir + "error.json");
  if (!result && !error) throw new Error("Unfinished slot " + id);
  rows.push({ id, result, error });
  refs.push(
    dir + (result ? "result.json" : "error.json"),
    dir + "attempt.json",
  );
}
const native = rows.find((r) => r.id === "native"),
  control = rows.find((r) => r.id === "control"),
  ordinary = [
    {
      reader: "Apple Vision default — fresh per-input profile",
      exact: native.result?.exact ?? null,
      observations: native.result?.observations ?? null,
      error: native.error?.error ?? native.result?.error ?? null,
    },
  ];
const result = {
  at: new Date().toISOString(),
  phase: 48,
  goal: "unsolved",
  phoneTests: 0,
  phoneCandidates: 0,
  newNativeSources: 0,
  plannedCalls: 2,
  attemptedProcesses: 2,
  retainedResultRows: rows.filter((r) => r.result).length,
  unknownSlots: rows.filter((r) => !r.result || r.result.error).length,
  ordinary,
  exactOrdinaryNativeReturns: ordinary.filter((r) => r.exact === true).length,
  exactOrdinaryControls: control.result?.exact === true ? 1 : 0,
  controlResult: control.result ?? control.error,
  priorVisionUnknownSlotsPreserved: 2,
  sources: Object.fromEntries(
    await Promise.all(refs.map(async (p) => [p, sha(await readFile(p))])),
  ),
};
await writeFile(
  root + "analysis.json",
  await format(JSON.stringify(result), { parser: "json" }),
  { flag: "wx" },
);
const md = `# Phase 48 — fresh complete default Vision profile\n\nTwo processes were attempted, control first then the unchanged full native input.\n${result.retainedResultRows} of two result rows were retained; ${result.unknownSlots} slots remain unknown.\nThe control exact result is ${control.result?.exact ?? "unknown"}; native exact recovery is ${ordinary[0].exact ?? "unknown"}.\nRaw stdout and each row/error are preserved immediately in separate exclusive\ndirectories. No further retry or new image occurred.\n\nThe request, URL image handler and empty options remain ordinary defaults. Output\nrecords use explicit assignments, and each process has a 180-second resource bound.\nThis changes the harness, not reader parameters. Phase 46's original 60-second\nwhole-profile timeout and both unknown slots remain separate evidence; its exact\nfailing stage is unknown. Vision remains one implementation across attempts.\n\nNo phone acceptance, normal-page or semantic-prose claim. Goal remains unsolved.\n`;
await writeFile(root + "README.md", await format(md, { parser: "markdown" }), {
  flag: "wx",
});
console.log(
  JSON.stringify({
    exact: ordinary[0].exact,
    control: control.result?.exact,
    unknown: result.unknownSlots,
  }),
);

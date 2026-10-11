import { readFile, writeFile, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import { format } from "prettier";
const root = "docs/research/prose-qr/phase-46/",
  sha = (b) => createHash("sha256").update(b).digest("hex");
const maybe = async (p) => {
  try {
    return JSON.parse(await readFile(p));
  } catch (e) {
    if (e.code === "ENOENT") return null;
    throw e;
  }
};
const vision = await maybe(root + "vision-01/result.json"),
  zNative = await maybe(root + "zbar-01/native.json"),
  zControl = await maybe(root + "zbar-01/control.json"),
  errors = [
    await maybe(root + "vision-01/error.json"),
    await maybe(root + "zbar-01/error.json"),
  ].filter(Boolean),
  vNative = vision?.results.find((r) => r.input.includes("phase-45")),
  vControl = vision?.results.find((r) => r.input.includes("phase-12"));
const ordinary = [
  {
    reader: "Apple Vision default",
    exact: vNative?.exact ?? null,
    observations: vNative?.observations ?? null,
    error: vNative?.error ?? (vision ? null : "Profile output unavailable"),
  },
  {
    reader: "ZBar default retained wrapper",
    exact: zNative?.exact ?? null,
    results: zNative?.results ?? null,
    error: zNative
      ? null
      : errors.length
        ? "See retained error receipt"
        : "Output unavailable",
  },
];
const refs = ["experiments/prose-qr/context-other-readers/analyze.mjs"];
for (const p of [
  root + "vision-01/result.json",
  root + "vision-01/error.json",
  root + "zbar-01/native.json",
  root + "zbar-01/control.json",
  root + "zbar-01/error.json",
]) {
  try {
    await access(p);
    refs.push(p);
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
}
const result = {
  at: new Date().toISOString(),
  phase: 46,
  goal: "unsolved",
  phoneTests: 0,
  phoneCandidates: 0,
  newNativeSources: 0,
  plannedOrdinaryProfiles: 2,
  plannedReaderCalls: 4,
  completedResultRows:
    (vision?.results.length ?? 0) + (zNative ? 1 : 0) + (zControl ? 1 : 0),
  checkerErrors: errors,
  ordinary,
  exactOrdinaryNativeReturns: ordinary.filter((r) => r.exact === true).length,
  exactOrdinaryControls: [vControl, zControl].filter((r) => r?.exact === true)
    .length,
  controlResults: [
    {
      reader: "Apple Vision default",
      exact: vControl?.exact ?? null,
      error: vControl?.error ?? null,
    },
    { reader: "ZBar default retained wrapper", exact: zControl?.exact ?? null },
  ],
  sources: Object.fromEntries(
    await Promise.all(refs.map(async (p) => [p, sha(await readFile(p))])),
  ),
};
await writeFile(
  root + "analysis.json",
  await format(JSON.stringify(result), { parser: "json" }),
  { flag: "wx" },
);
console.log(
  JSON.stringify({
    calls: result.completedResultRows,
    exactNative: result.exactOrdinaryNativeReturns,
    exactControls: result.exactOrdinaryControls,
    errors: errors.length,
  }),
);

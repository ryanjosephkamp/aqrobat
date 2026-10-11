import { readFile, writeFile, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readBarcodes, defaultReaderOptions } from "zxing-wasm/reader";
import { DECODER_PROVENANCE } from "../decoders.mjs";
import { format } from "prettier";
import assert from "node:assert/strict";
const root = "docs/research/prose-qr/phase-13/",
  out = root + "run-01/";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const save = async (p, o) =>
  writeFile(out + p, await format(JSON.stringify(o), { parser: "json" }), {
    flag: "wx",
  });
await mkdir(out);
const inputs = [
  [12, "monaco-native-20"],
  [12, "monaco-native-14"],
  [11, "monaco-justified"],
  [10, "monaco-staggered-0", "dense-02"],
  [12, "full"],
  [12, "solid"],
];
const profiles = {
  default: { formats: ["QRCode"] },
  baseline: DECODER_PROVENANCE.readerOptions,
  errorsDiagnostic: { formats: ["QRCode"], returnErrors: true },
};
await save("manifest.json", {
  at: new Date().toISOString(),
  plannedInputs: inputs.length,
  profiles,
  defaults: defaultReaderOptions,
  provenance: DECODER_PROVENANCE,
  sources: Object.fromEntries(
    await Promise.all(
      [
        "experiments/prose-qr/finder-reader-symbol/run.mjs",
        root + "PLAN.md",
      ].map(async (p) => [p, sha(await readFile(p))]),
    ),
  ),
  classification:
    "Native PNG unchanged. Error profile is diagnostic only, never acceptance.",
});
function finder(bits, w, ox, oy) {
  let exact = 0;
  const mask = [];
  for (let y = 0; y < 7; y++) {
    const row = [];
    for (let x = 0; x < 7; x++) {
      const expected =
        x === 0 ||
        x === 6 ||
        y === 0 ||
        y === 6 ||
        (x >= 2 && x <= 4 && y >= 2 && y <= 4);
      const actual = bits[(oy + y) * w + ox + x] === 0;
      row.push(actual ? 1 : 0);
      exact += actual === expected ? 1 : 0;
    }
    mask.push(row);
  }
  const rays = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ].map(([dx, dy]) => {
    const values = [];
    for (let t = -3; t <= 3; t++)
      values.push(bits[(oy + 3 + dy * t) * w + ox + 3 + dx * t] === 0 ? 1 : 0);
    const runs = [];
    for (const v of values) {
      if (runs.length && runs.at(-1).value === v) runs.at(-1).length++;
      else runs.push({ value: v, length: 1 });
    }
    return {
      dx,
      dy,
      values,
      runs,
      exact: JSON.stringify(values) === "[1,0,1,1,1,0,1]",
    };
  });
  return {
    exact,
    total: 49,
    mask,
    rays,
    pass: exact === 49 && rays.every((r) => r.exact),
  };
}
const rows = [];
for (const [phase, id, batch = "run-01"] of inputs) {
  const base = `docs/research/prose-qr/phase-${phase}/${batch}/`,
    key = `p${phase}-${id}`,
    row = { phase, id, batch, key };
  try {
    const controls = JSON.parse(await readFile(base + "controls.json")),
      records = (await readFile(base + "results.jsonl", "utf8"))
        .trim()
        .split("\n")
        .map(JSON.parse),
      source = controls[id] ?? records.find((r) => r.id === id);
    assert(source, "Missing native source record");
    const png = await readFile(base + source.path);
    assert.equal(sha(png), source.pngSha256);
    const rgba = execFileSync(
      "python3",
      [
        "-c",
        "import cv2,sys; i=cv2.imread(sys.argv[1]); sys.stdout.buffer.write(cv2.cvtColor(i,cv2.COLOR_BGR2RGBA).tobytes())",
        base + source.path,
      ],
      { maxBuffer: 120000000 },
    );
    assert.equal(sha(rgba), source.rgbaSha256);
    row.pngSha256 = source.pngSha256;
    row.rgbaSha256 = source.rgbaSha256;
    let layout = null;
    if (!controls[id])
      layout = JSON.parse(await readFile(base + id + "-layout.json"));
    row.profiles = {};
    for (const [name, opts] of Object.entries(profiles)) {
      const start = Date.now(),
        results = await readBarcodes(png, opts);
      row.profiles[name] = { ms: Date.now() - start, results: [] };
      for (let index = 0; index < results.length; index++) {
        const r = results[index],
          symbol = r.symbol,
          record = {
            isValid: r.isValid,
            error: r.error,
            text: r.text,
            bytes: Array.from(r.bytes ?? []),
            position: r.position,
            format: r.format,
            width: symbol?.width,
            height: symbol?.height,
          };
        if (symbol?.data?.length) {
          const bytes = Buffer.from(symbol.data);
          record.symbolSha256 = sha(bytes);
          record.symbolPath = `${key}-${name}-${index}-symbol.bin`;
          await writeFile(out + record.symbolPath, bytes, { flag: "wx" });
          const w = symbol.width,
            h = symbol.height;
          if (w >= 21 && w === h) {
            record.finders = [
              [0, 0],
              [w - 7, 0],
              [0, h - 7],
            ].map(([x, y]) => finder(symbol.data, w, x, y));
            record.completeFinders = record.finders.every((f) => f.pass);
          }
          if (layout) {
            const lo = layout.quiet * layout.unit,
              hi = (layout.quiet + layout.modules) * layout.unit - 1,
              expected = [
                [lo, lo],
                [hi, lo],
                [hi, hi],
                [lo, hi],
              ],
              actual = [
                r.position.topLeft,
                r.position.topRight,
                r.position.bottomRight,
                r.position.bottomLeft,
              ];
            record.intendedQuad = actual.every(
              (p, i) =>
                Math.hypot(p.x - expected[i][0], p.y - expected[i][1]) <
                layout.unit,
            );
            record.intendedDimension =
              w === layout.modules && h === layout.modules;
            record.nativeFinderDiagnosticPass =
              record.intendedQuad &&
              record.intendedDimension &&
              record.completeFinders;
          }
        }
        row.profiles[name].results.push(record);
      }
    }
  } catch (e) {
    row.error = e.stack;
  }
  rows.push(row);
  await save(key + ".json", row);
  console.log(
    JSON.stringify({
      key,
      error: row.error,
      profiles:
        row.profiles &&
        Object.fromEntries(
          Object.entries(row.profiles).map(([k, v]) => [
            k,
            {
              ms: v.ms,
              count: v.results.length,
              valid: v.results.filter((r) => r.isValid).length,
              structural: v.results.filter((r) => r.nativeFinderDiagnosticPass)
                .length,
            },
          ]),
        ),
    }),
  );
}
await save("summary.json", {
  planned: inputs.length,
  completed: rows.filter((r) => !r.error).length,
  errors: rows.filter((r) => r.error),
  nativeFinderDiagnosticPasses: rows.flatMap((r) =>
    (r.profiles?.errorsDiagnostic.results ?? [])
      .filter((x) => x.nativeFinderDiagnosticPass)
      .map((x) => ({ key: r.key, position: x.position })),
  ),
  nativePayloadClaims: 0,
});

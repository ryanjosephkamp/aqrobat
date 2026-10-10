import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  canonicalData,
  construct,
  PAYLOAD,
  verifyCanonical,
} from "./padding-solver.mjs";

const out = new URL(
  "../../../../docs/research/prose-qr/integrated-2026-10-10/design/",
  import.meta.url,
);
const rows = [];
for (let version = 1; version <= 40; version++)
  for (const ecc of ["L", "M", "Q", "H"])
    try {
      const built = construct(version, ecc, 0);
      const count = {};
      for (const row of built.map)
        for (const m of row)
          count[m.role ?? m.kind] = (count[m.role ?? m.kind] ?? 0) + 1;
      rows.push({
        version,
        ecc,
        dimension: built.code.size,
        ...built.canonical,
        data: undefined,
        freePostTerminatorBits: built.canonical.paddingBytes * 8,
        blocks: built.ownership.blocks.length,
        eccPerBlock: built.ownership.eccLength,
        totalSymbolErrorRadius:
          built.ownership.blocks.length *
          Math.floor(built.ownership.eccLength / 2),
        counts: count,
      });
    } catch (error) {
      if (!String(error).includes("does not fit")) throw error;
      rows.push({
        version,
        ecc,
        dimension: 4 * version + 17,
        exactUrlFits: false,
      });
    }
const matrices = [];
for (let mask = 0; mask < 8; mask++) {
  verifyCanonical(10, "L", mask);
  const built = construct(10, "L", mask);
  matrices.push({
    mask,
    matrix: built.matrix,
    dataCodewords: built.canonical.data,
    interleavedCodewords: built.code.interleavedCodewords,
  });
}
const sourcePaths = [
  "AGENTS.md",
  "docs/PROJECT-HANDOFF.md",
  "docs/research/prose-qr/integrated-2026-10-10/REQUEST.txt",
  "docs/research/prose-qr/integrated-2026-10-10/START.json",
  "docs/research/prose-qr/resource-audit-2026-10-10/handback.html",
  "docs/research/prose-qr/resource-audit-2026-10-10/results.json",
  "docs/research/prose-qr/layout-design-2026-10-10/RECONSIDERATION.md",
  "docs/research/prose-qr/layout-design-2026-10-10/reconsideration.json",
  "vendor/qrcodegen.mjs",
  "LICENSE",
  "NOTICE.md",
  "package.json",
];
const sources = [];
for (const path of sourcePaths) {
  const raw = await readFile(new URL("../../../../" + path, import.meta.url));
  sources.push({
    path,
    bytes: raw.length,
    sha256: createHash("sha256").update(raw).digest("hex"),
  });
}
for (const [name, value] of [
  [
    "capacity.json",
    {
      schema: "aqrobat.exact-url-capacity.v1",
      payload: PAYLOAD,
      classification:
        "Pure encoder arithmetic; no native geometry, render, glyph measurement or reader calls",
      rows,
    },
  ],
  [
    "canonical-v10-L.json",
    {
      schema: "aqrobat.canonical-matrix-catalog.v1",
      payload: PAYLOAD,
      version: 10,
      ecc: "L",
      padding: "canonical",
      classification:
        "Encoded target/control matrices only. Never paint these behind native text.",
      matrices,
    },
  ],
  [
    "input-provenance.json",
    {
      schema: "aqrobat.design-input-provenance.v1",
      baseline: "a5cd4c2cbc6a285b7922e7d4c031eef750eb4222",
      branch: "codex/aqrobat-foundation",
      sources,
    },
  ],
])
  await writeFile(new URL(name, out), JSON.stringify(value, null, 2) + "\n", {
    flag: "wx",
  });
console.log(
  JSON.stringify({
    capacityRows: rows.length,
    matrices: matrices.length,
    inputSources: sources.length,
    nativeCaptures: 0,
    readerCalls: 0,
  }),
);

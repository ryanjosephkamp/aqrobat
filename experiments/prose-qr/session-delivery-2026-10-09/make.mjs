import { readFile, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { format } from "prettier";
import assert from "node:assert/strict";
const from = "docs/research/prose-qr/session-2026-10-09/",
  root = "docs/research/prose-qr/session-2026-10-09-delivery/",
  source = "experiments/prose-qr/session-delivery-2026-10-09/",
  sha = (b) => createHash("sha256").update(b).digest("hex");
const original = await readFile(from + "index.html", "utf8");
assert.equal((original.match(/publication or release/g) ?? []).length, 1);
const note = `<div class="card"><strong>Delivery note: existing Pages automation</strong><p>GitHub Pages was already configured to publish from <code>codex/aqrobat-foundation</code>. Backing up this work on that branch automatically rebuilt the existing site. No Pages setting, new host or manual deployment was created. The product code and three downloadable products remain unchanged.</p><p class="small">The sealed research report and all native evidence remain intact. This copy clarifies delivery wording only. <a href="https://github.com/ryanjosephkamp/aqrobat/actions/runs/38010882229">Recorded automatic Pages run</a>.</p></div>`;
assert(original.includes("<h2>What actually worked</h2>"));
const corrected = original
  .replace("publication or release", "npm publication or release")
  .replace(
    "<h2>What actually worked</h2>",
    note + "<h2>What actually worked</h2>",
  );
await writeFile(
  root + "index.html",
  await format(corrected, { parser: "html" }),
  { flag: "wx" },
);
const before = await readFile(from + "PR-DESCRIPTION.md", "utf8");
assert(before.includes("No new deployment or host is created."));
const body = before.replace(
  "No new deployment or host is created.",
  "No manual deployment or new host is created. Existing GitHub Pages automation\nis configured to publish this branch, so branch backups automatically rebuild\nthe existing site. Pages settings were not changed. The delivery clarification\nis in `docs/research/prose-qr/session-2026-10-09-delivery/`.",
);
await writeFile(
  root + "PR-DESCRIPTION.md",
  await format(body, { parser: "markdown" }),
  { flag: "wx" },
);
await writeFile(
  root + "README.md",
  await format(
    `# Delivery clarification\n\nThe existing Pages configuration publishes codex/aqrobat-foundation from /.\nThe automatic deployment at commit603a72083fb4fec9780d9b20b031af7a51b150c0\ncompleted successfully. No Pages configuration or manual deployment command was\nused. Branch backups trigger this existing automation, including the backup\nof this additive note. No new host, npm publication or release is created.\n\nThe prior session collection remains sealed unchanged. This fresh corrected\nreport copy clarifies Pages/npm wording and adds one visible delivery note;\nall embedded native source, checkpoint, styles and scripts remain the same.\nThe original report and all rejected/error outcomes remain preserved.\n\nFresh delivery cap600,000 logical bytes including source and custody.\nNo new native experiment, decoder or phone test. Existing local report UI\nchecks apply to the unchanged layout/scripts; this note is a text-only addition.\n`,
    { parser: "markdown" },
  ),
  { flag: "wx" },
);
const p = JSON.parse(await readFile(root + "pages-state.json"));
assert.equal(p.source.branch, "codex/aqrobat-foundation");
assert.equal(p.build_type, "legacy");
await writeFile(
  root + "pages-state.json",
  await format(JSON.stringify(p), { parser: "json" }),
);
const inventory = [];
for (const dir of [root, source])
  for (const e of await readdir(dir)) {
    const path = dir + e,
      b = await readFile(path);
    inventory.push({ path, bytes: b.length, sha256: sha(b) });
  }
const receipt = {
  at: new Date().toISOString(),
  cap: 600000,
  sourceReport: { path: from + "index.html", sha256: sha(original) },
  sourceCustody: {
    path: from + "custody.json",
    sha256: sha(await readFile(from + "custody.json")),
  },
  nativeEvidenceChanged: false,
  reportChanges: [
    "Clarify npm publication wording",
    "Disclose automatic rebuild of existing Pages branch configuration",
  ],
  inventory,
};
const bytes = await format(JSON.stringify(receipt), { parser: "json" });
assert(
  inventory.reduce((n, f) => n + f.bytes, 0) + Buffer.byteLength(bytes) <
    600000,
);
await writeFile(root + "custody.json", bytes, { flag: "wx" });
console.log(
  JSON.stringify({
    deliveryOnly: true,
    bytes:
      inventory.reduce((n, f) => n + f.bytes, 0) + Buffer.byteLength(bytes),
  }),
);

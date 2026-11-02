// Markdown summary of results: editor x format pass counts and failure causes.
const GROUPS = [
  ["tiles ⬛", (f) => f.startsWith("tiles-black")],
  ["tiles 🟦", (f) => f.startsWith("tiles-blue")],
  ["blocks", (f) => /^blocks-\dx1$/.test(f)],
  ["blocks fenced", (f) => f.endsWith("-fence")],
  ["rich █ 2x1", (f) => f === "rich-block-2x1"],
  ["rich # 4x2", (f) => f === "rich-hash-4x2"],
  ["plain # 2x1", (f) => f === "plain-hash-2x1"],
];

const cell = (rs) => {
  if (!rs.length) return "";
  const s = rs.filter((r) => r.decode?.sharp.pass).length,
    p = rs.filter((r) => r.decode?.phone.pass).length;
  return `${s}/${p} of ${rs.length}`;
};

export function summarize(records, meta) {
  const editors = [...new Set(records.map((r) => r.editor))];
  const lines = [];
  lines.push(`# Paste lab summary`);
  lines.push("");
  lines.push(
    `${records.length} cases, ${meta.runtimeSeconds} s, Chrome ${meta.chrome}, ${meta.shards} shard(s). Cell = sharp passes / phone-sim passes of N cases (across styles, widths, payloads, and format options). Pass = exact payload from ZXing or jsQR.`,
  );
  lines.push("");
  lines.push(`| editor | ${GROUPS.map((g) => g[0]).join(" | ")} |`);
  lines.push(`|---|${GROUPS.map(() => "---").join("|")}|`);
  for (const e of editors) {
    const rs = records.filter((r) => r.editor === e);
    lines.push(
      `| ${e} | ${GROUPS.map(([, m]) => cell(rs.filter((r) => m(r.format)))).join(" | ")} |`,
    );
  }
  lines.push("");
  lines.push("## Format detail (all editors)");
  lines.push("");
  lines.push(
    "| format | sharp | phone | ZXing sharp | jsQR sharp | text exact | wrapped |",
  );
  lines.push("|---|---|---|---|---|---|---|");
  for (const f of [...new Set(records.map((r) => r.format))]) {
    const rs = records.filter((r) => r.format === f && r.decode);
    const n = rs.length;
    const c = (fn) => `${rs.filter(fn).length}/${n}`;
    lines.push(
      `| ${f} | ${c((r) => r.decode.sharp.pass)} | ${c((r) => r.decode.phone.pass)} | ${c((r) => r.decode.sharp.zxing.pass)} | ${c((r) => r.decode.sharp.jsqr.pass)} | ${c((r) => r.rows.exactNbspAsSpace)} | ${c((r) => r.render.wrapped)} |`,
    );
  }
  lines.push("");
  lines.push("## Style detail (sharp/phone passes)");
  lines.push("");
  const styles = [...new Set(records.map((r) => r.style))];
  lines.push(`| editor | ${styles.join(" | ")} |`);
  lines.push(`|---|${styles.map(() => "---").join("|")}|`);
  for (const e of editors) {
    const rs = records.filter((r) => r.editor === e);
    lines.push(
      `| ${e} | ${styles.map((s) => cell(rs.filter((r) => r.style === s))).join(" | ")} |`,
    );
  }
  lines.push("");
  lines.push("## Change labels on failing cases (sharp fail), by editor");
  lines.push("");
  for (const e of editors) {
    const fails = records.filter(
      (r) => r.editor === e && !r.decode?.sharp.pass,
    );
    const counts = {};
    for (const r of fails)
      for (const c of r.error
        ? ["error"]
        : r.changes.length
          ? r.changes
          : ["no-structural-change"])
        counts[c] = (counts[c] || 0) + 1;
    const top = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([k, v]) => `${k} ${v}`)
      .join(", ");
    lines.push(`- **${e}**: ${fails.length} sharp fails. ${top}`);
  }
  const errs = records.filter((r) => r.error);
  if (errs.length) {
    lines.push("");
    lines.push(`## Errors (${errs.length})`);
    for (const r of errs.slice(0, 20)) lines.push(`- ${r.id}: ${r.error}`);
  }
  return lines.join("\n") + "\n";
}

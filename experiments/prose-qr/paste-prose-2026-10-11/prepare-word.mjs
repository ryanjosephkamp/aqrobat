import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  DEFAULT_RECIPE,
  composePortable,
  portableClipboardHtml,
} from "../portable-story-2026-10-11/generator.mjs";

const base = "docs/research/prose-qr/paste-prose-2026-10-11/";
const measurement = JSON.parse(
  await readFile("docs/research/prose-qr/portable-story-2026-10-11/batch-01/page-impact-preserve-metrics.json"),
);
const layout = composePortable(DEFAULT_RECIPE, measurement);
const paragraph = portableClipboardHtml(layout);
const table = paragraph.replace("<p style=", '<table border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse:collapse;table-layout:fixed;width:450pt;margin:0"><tbody><tr><td width="600" style="width:450pt;padding:0;vertical-align:top"><p style=').replace("</p>", "</p></td></tr></tbody></table>");
const profiles = [paragraph, table, table.replaceAll("9pt", "9px")];
const sha = (b) => createHash("sha256").update(b).digest("hex");
for (const [i, html] of profiles.entries()) {
  const out = base + `word-0${i + 1}/`;
  for (const [name, data] of [
    ["clipboard.html.txt", html],
    ["expected.txt", layout.plainText],
    ["source.txt", layout.source],
    ["layout.json", JSON.stringify(layout, null, 2) + "\n"],
  ]) await writeFile(out + name, data, { flag: "wx" });
  await writeFile(out + "PLAN.json", JSON.stringify({
    at: new Date().toISOString(),
    id: `word-0${i + 1}`,
    hypothesis: [
      "Actual Word CUA HTML paste of the earlier linear paragraph; default Letter receiver with one-inch margins.",
      "Borderless fixed-width one-cell table carries a 450pt text measure into a default Word receiver.",
      "Receiver-specific CSS 9px instead of 9pt tests the conversion observed in TextEdit; a separate planned input, not a retry.",
    ][i],
    route: "CUA HTML paste through the actual macOS pasteboard, restoring its previous contents; browser Copy button route untested.",
    receivingApp: "Microsoft Word for Mac",
    inputDocxSha256: sha(await readFile(out + "input.docx")),
    htmlSha256: sha(html),
    expectedTextSha256: sha(layout.plainText),
    expectedRows: 50,
    expectedBodyPoints: [450, 450],
    payload: layout.spec.payload,
    summary: layout.summary,
    plannedNativePasteTrials: 1,
    plannedNativeExports: 1,
    plannedPdfRasterDpi: [96],
    plannedCandidateCaptureSlots: 1,
    plannedImmediateRepeats: 1,
    priorAcceptedBytesAreReferencesOnly: true,
  }, null, 2) + "\n", { flag: "wx" });
}
console.log(JSON.stringify({ profiles: profiles.map((h) => ({ bytes: Buffer.byteLength(h), sha256: sha(h) })), summary: layout.summary }));

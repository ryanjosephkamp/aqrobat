import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { format } from "prettier";
const root = "docs/research/prose-qr/session-2026-10-10-b/";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const save = async (p, s, parser) =>
  writeFile(root + p, await format(s, { parser }), { flag: "wx" });
const phases = [];
for (let n = 49; n <= 63; n++) {
  const path = `docs/research/prose-qr/phase-${n}/analysis.json`,
    a = JSON.parse(await readFile(path));
  phases.push({
    phase: n,
    analysis: path,
    sha256: sha(await readFile(path)),
    nativeCaptures: a.completedNativeSources ?? a.completedNative ?? 0,
    nativeExactRepeats: a.nativeExactRepeats ?? 0,
    primaryPlanned: a.plannedPrimaryReaderSlots ?? (n === 49 ? 9 : 0),
    primaryCompleted: a.completedPrimaryReaderSlots ?? (n === 49 ? 9 : 0),
    primaryUnattempted: a.unattemptedPrimaryReaderSlots ?? 0,
    strictPasses:
      a.nativeStrictSelectedPasses ?? a.actualNativeStrictPasses ?? 0,
    intendedBranches: a.nativeIntendedGeometryBranches ?? 0,
    passiveProfiles: a.completedPassiveProfiles ?? 0,
    classification:
      n === 50 || n === 51
        ? "Passive OpenCV logging profile; accounted separately"
        : n >= 60
          ? "Logographic structural control; not semantic prose"
          : n === 52
            ? "Glyph-resource objective; no native finder source"
            : "Native Latin finder-only objective",
  });
}
const aggregate = {
  at: new Date().toISOString(),
  goal: "unsolved",
  phoneTests: 0,
  phoneCandidates: 0,
  newNativePayloadSources: 0,
  phases,
  totals: {
    nativeCaptureAttemptsRetained: phases.reduce(
      (n, r) => n + r.nativeCaptures,
      0,
    ),
    nativeImmediateExactRepeats: phases.reduce(
      (n, r) => n + r.nativeExactRepeats,
      0,
    ),
    primarySlotsPlanned: phases.reduce((n, r) => n + r.primaryPlanned, 0),
    primarySlotsCompleted: phases.reduce((n, r) => n + r.primaryCompleted, 0),
    primarySlotsUnattempted: phases.reduce(
      (n, r) => n + r.primaryUnattempted,
      0,
    ),
    strictNativePasses: phases.reduce((n, r) => n + r.strictPasses, 0),
  },
  separateLoggingProfiles: {
    phase50: {
      planned: 4,
      completed: 0,
      setupErrors: 4,
      unknownSlots: 4,
      decoderCalls: 0,
    },
    phase51: { planned: 4, completed: 4, baselineParity: true },
  },
  limitations: [
    "Capture count includes repeated profiles and substituted-font duplicates; it is not unique visual cases or independent engines.",
    "No new native source encodes a payload; empty reader results are not a meaningful payload-recovery test. The current objective is finder geometry and native stroke structure.",
    "Phase60 abort preserves 18 unattempted primary slots. Phase61 does not erase them.",
    "Phase54 has four additional local legibility rejections after numeric passes; its completed reader results remain retained.",
    "Phase62 omitted measured DOM target-origin metadata; phase63 retains it in a fresh profile.",
    "Normal controls pass all three ordinary implementations. Inverted controls pass ZXing/jsQR but fail stock OpenCV.",
    "No phone/print/portable or owner prose acceptance.",
  ],
  sources: {
    "experiments/prose-qr/session-2026-10-10-b/report.mjs": sha(
      await readFile(new URL(import.meta.url)),
    ),
  },
};
await save("analysis.json", JSON.stringify(aggregate), "json");
const prompt = `Continue prose QR research only in /Users/noir/Documents/aqrobat, branch codex/aqrobat-foundation and existing OPEN draft PR #1. Read AGENTS.md and docs/research/prose-qr/session-2026-10-10-b/CHECKPOINT.md, README.md, analysis.json, verification-final.json, custody.json, HARNESS-NOTES.md and phases59–63 plans/results/custody. Verify branch, remote, HEAD, dirty state, PR draft status, exact saved executed source, prior custody and product download hashes before edits. Preserve all earlier phases/prototypes, product/extension, Splashery, PDF archive, owner profiles, other tasks and jobs. npm stays private/unpublished. No agents/chats/new host/migration/merge/release/store/messages.

The prose goal remains unsolved. This session retains44 full native capture attempts and44 exact immediate repeats, including profile duplicates and rejected substitutions; none is a new payload source or phone candidate. Phase62 Regular64 and phase63 Medium48/64 return intended centers/dimensions in an ordinary stock inverted branch, but every strict selected native structure gate still fails. Phase63 Medium64 has balanced quads0.929, nominal span0.763, stable wide rows13/17 and worst true-axis ratio error0.459. These are repetitive logographic structural controls, not English prose, meaningful Chinese prose, normal-page usability or phone acceptance. Preserve phase50 setup errors/four unknown slots, phase60 font-load abort/18 unattempted reader slots, phase54 visual rejections, phase62 four font substitutions and omitted origin receipt. Phase63 confirms all four requested native font faces and directly retains target-origin drift; that does not establish decoding. No new phone results.

Start a fresh modest phase and exclusive directories with an explicit file cap. Do not rerun sealed scripts in old output dirs. Before another full-QR sweep, preregister one small objective addressing the actual selected full-context finder stroke ratios, stable spans and both diagonals with a clear legibility rejection. Avoid further size-only sweeps or treating correct placement as sufficient. Keep logographic controls, regular Latin, intrinsically heavy fonts, styled/bold prose and uniform-black ASCII separate. Use an ordinary reader outside ZXing, unchanged full native output, and keep resource models/source-aligned samples separate from actual ordinary returns. Geometry is for source rendering and post-return diagnostics only: no repaired pixels, forced corners/extraction, acceptance-reader tuning, hidden modules/invisible letters or unreadable compression. Preserve all outcomes, errors, aborts, rejections, exact denominators and executed versions. Back up milestones on the existing branch. Continue toward readable native prose with independent ordinary exact payload recovery, then phone acceptance. Do not claim completion at a time boundary.`;
await save(
  "CHECKPOINT.md",
  `# Prose QR checkpoint — October 10, 2026, recovered session\n\nThe connection interruption did not lose the phase62 outputs. Its job finished successfully and was collected on resume. Phase63 is a fresh four-case follow-up, also complete. No experiment/browser job remains active at handback. All prior and new evidence must be verified from the receipts before continuing.\n\nBaseline: 5e71a10a9381d050e61c567c90191517b59f1368. Earlier milestones: 7e0b9015285f55c288bd221f3a13cabadccc2332 and 6a549de848aae8fe555817485f89b25cfc15f639. Later backup commits are verified live after push; do not hard-code an inferred final commit.\n\nThe session report/source cap is1,000,000 logical bytes. Each sealed phase has its own custody cap. No new payload or phone candidate; goal unsolved. The final verifier checks hashes, source custody, raw PNG/RGBA conversion, passive-return records, product preservation and draft status. Browser report checks cover390/1280px and denied-clipboard fallback only.\n\n## Continuation prompt\n\n${prompt}\n`,
  "markdown",
);
await save(
  "HARNESS-NOTES.md",
  `# Harness notes\n\n- Phase49 original minimum-gap receipt measured the first line only. A retained all-line source-bounds audit establishes1.240234375px minimum for both sources; the original capture remains unchanged. Bounds are not human legibility.\n- Phase50 fails before decoder invocation because this OpenCV build lacks getLogLevel. Four setup errors/four unknown slots remain; phase51 separately completes the four-case default-reader logging profile. No QR debug trace is emitted by this build.\n- Phase54 four monospaced cases pass mechanical bounds but are rejected on native visual inspection. Their completed reader outcomes are not removed.\n- Phase58 three source-width overflows remain retained with their unattempted reader slots.\n- Phase60 requests an unavailable Songti local font identity and aborts on the third resource. Two native captures/repeats remain; all18 primary reader slots are unattempted. Phase61 uses the installed STSongti-SC-Regular identity in a fresh complete profile.\n- Phase62 Medium/Semibold requested at CSS400 render with Regular instead; actual platform-font identity rejects all four cases before readers. The script computes target origins but omits them from its returned object. No origin measurements are retroactively claimed.\n- Phase63 sets native500/600 consistently for face declarations, loading, measurements and visible text. All four platform-font identities match; all12 target DOM origins retain x phase drift−0.015625px/y0. The native structure gate still fails.\n- Native glyph-resource gray128 components and ordinary-binarizer models supply rendering rules only. Actual selected native runs, source samples, nearest unselected quads and threshold replicas remain different evidence. The diagnostic inverted resource is not an acceptance decoder branch.\n- Passive jsQR logging checks unchanged full stock return parity, then diagnoses actually executed branches. It is the same implementation, not another independent engine. Current phase readers include stock OpenCV, default ZXing and stock jsQR; no new independent-reader count is inferred from repeated profiles.\n- No full-QR sweep was performed here. All new native sources are finder-only; absence of payload is expected. The earlier full native URL remains a separate failed experiment.\n- Tests from before the connection interruption: npm test18/18; formatting passed at two milestones. No product changes; product build, browser product/extension, Gmail, native paste and phone/print checks are not repeated for research-only edits. Final report browser checks and fresh custody/pixel verification have their own receipts.\n`,
  "markdown",
);
const rows = phases
  .map(
    (r) =>
      `|${r.phase}|${r.nativeCaptures}|${r.primaryCompleted}/${r.primaryPlanned}|${r.primaryUnattempted}|${r.strictPasses}|`,
  )
  .join("\n");
await save(
  "README.md",
  `# Prose QR research — recovered October 10 session\n\nThe prose goal remains unsolved. No new native payload source or phone candidate exists. The connection interruption left phase62 intact; phase63 completed a bounded font-weight/position follow-up.\n\n## What changed\n\nNative Latin counters, cursive strokes and dots did not pass the full selected-finder criteria. A separate logographic control using visible 回 and 人 brought ordinary selection closer: phase62 Regular64 and phase63 Medium48/64 return intended centers and dimensions. Phase63 Medium64 still has only13/17 stable wide central rows, nominal span0.763 (required0.8), and true-axis ratio error0.459 (required<=0.35). All strict native cases fail. This is a useful observed limit of these glyphs, not an impossibility proof.\n\nThe current sources are repetitive structural controls, not meaningful Chinese prose or English prose. Their large native glyphs do not establish normal-page use. No phone testing is requested.\n\n## Exact accounting\n\n${aggregate.totals.nativeCaptureAttemptsRetained} retained full native capture attempts have${aggregate.totals.nativeImmediateExactRepeats} exact immediate repeats. This includes duplicate profiles and substituted faces; do not call it a count of unique images. Primary reader slots include controls. Four phase50 setup/unknown slots and four phase51 completed logging profiles stay separate from the table. Phase52's64 glyph resources and32 multirow repeats are not full native finder sources.\n\n|Phase|Full native captures|Primary complete/planned|Unattempted primary|Strict native pass|\n|---|---:|---:|---:|---:|\n${rows}\n\nSee analysis.json for aggregates and each phase's analysis/manifest for case-level detail. Normal conventional controls pass all three ordinary implementations. The inverted conventional control remains an OpenCV limitation; ZXing/jsQR recover it. These repeat profiles are not independent engines or phone evidence.\n\n## Next useful question\n\nA fresh, small source-glyph objective should target the actual native finder ring/central-span ratios and both diagonals in full text context. Repeating size or placement sweeps alone is poorly justified by these results. Keep the logographic control separate from the desired prose deliverable. A full QR experiment remains gated by coherent intended native finder structure and legibility, followed eventually by independent exact-payload decoding and phone acceptance.\n\n[Mobile report](index.html) · [Checkpoint](CHECKPOINT.md) · [Harness limitations](HARNESS-NOTES.md) · [Verification](verification-final.json) · [Custody](custody.json)\n`,
  "markdown",
);
const esc = (s) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const nativeImage = (
  await readFile("docs/research/prose-qr/phase-63/run-01/medium64/letters.png")
).toString("base64");
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Aqrobat · Research recovered</title><style>body{margin:0;background:#f5f1e8;color:#252939;font:17px/1.65 system-ui,sans-serif}main{max-width:850px;margin:auto;padding:30px 20px 70px}h1{font-size:clamp(32px,7vw,54px);line-height:1.08}h2{font-size:25px}p{max-width:72ch}.tag{color:#794618;font-weight:700}section{margin:28px 0;padding:22px;background:#fff;border:1px solid #dfd9cc;border-radius:16px}img{max-width:100%;height:auto;border:1px solid #ccc}figure{margin:20px 0}figcaption{font-size:14px;color:#51576a}table{border-collapse:collapse;width:100%;font-size:14px}td,th{padding:9px 5px;text-align:left;border-bottom:1px solid #ddd}.scroll{overflow:auto}textarea{box-sizing:border-box;width:100%;height:340px;font:14px/1.5 ui-monospace,monospace;padding:12px}button{background:#303965;color:#fff;padding:12px 20px;border:0;border-radius:8px;font:inherit;cursor:pointer}a{color:#334d95}code{overflow-wrap:anywhere}.small{font-size:14px}</style><main><p class="tag">October 10 · Phases 49–63 · Goal unsolved</p><h1>The work survived the disconnect.</h1><p>The interrupted experiment finished and its results were recovered. A fresh four-case follow-up confirmed the intended native font weights and saved the missing position measurements.</p><section><h2>What we learned</h2><p>Some native characters now give an ordinary reader the intended three centers and dimensions. But the width, height and diagonal proportions still fail our full finder-structure checks. Correct placement alone is not enough.</p><p>The best follow-up here has <strong>13 of 17</strong> stable wide central rows and a worst stroke-ratio error of <strong>0.459</strong>, above the fixed <strong>0.35</strong> gate. No threshold was relaxed.</p><figure><img alt="Native excerpt containing distinct repeated 人 and 回 characters; structural control only" width="400" height="170" src="data:image/png;base64,${nativeImage}"><figcaption>Native excerpt from phase63 Medium64. This logographic control tests glyph structure. It is not meaningful prose and does not encode a QR payload.</figcaption></figure></section><section><h2>Nothing new to scan yet</h2><p>There is no successful prose QR candidate. These are finder-only experiments, and they contain no link or payload. We are keeping the Latin-text, styled/bold, heavy-font and logographic results separate.</p><p>The earlier full native URL still failed ordinary readers. No new phone or print results have been added.</p></section><section><h2>What is safely retained</h2><p>${aggregate.totals.nativeCaptureAttemptsRetained} full native capture attempts and ${aggregate.totals.nativeImmediateExactRepeats} exact immediate repeats are recorded, including duplicate profiles and rejected font substitutions. Every rejection, abort and checker limitation remains in the evidence.</p><div class="scroll"><table><thead><tr><th>Phase</th><th>Captures</th><th>Reader slots complete/planned</th><th>Strict pass</th></tr></thead><tbody>${phases.map((r) => `<tr><td>${r.phase}</td><td>${r.nativeCaptures}</td><td>${r.primaryCompleted}/${r.primaryPlanned}</td><td>${r.strictPasses}</td></tr>`).join("")}</tbody></table></div><p class="small">Slots include controls. Phases50–51 logging profiles are separately recorded: four setup errors/unknown slots, then four completed profiles. Repeats and profiles do not count as independent reader implementations.</p></section><section><h2>Recommended continuation</h2><p>Test one small native-glyph objective aimed at the remaining ring and center proportions. Keep ordinary readers unchanged and require legible full-context structure before considering another full QR experiment.</p><p>The source checkpoint and verification receipts are in <code>docs/research/prose-qr/session-2026-10-10-b/</code>.</p><textarea id="prompt" aria-label="Continuation prompt" readonly>${esc(prompt)}</textarea><p><button id="copy">Copy continuation prompt</button></p><p id="copy-status" role="status">You can also select the prompt manually.</p></section></main><script>document.querySelector('#copy').onclick=async()=>{const p=document.querySelector('#prompt'),s=document.querySelector('#copy-status');try{await navigator.clipboard.writeText(p.value);s.textContent='Prompt copied.'}catch{p.focus();p.select();s.textContent='Prompt selected. Use your browser’s Copy command.'}};</script></html>`;
await save("index.html", html, "html");
console.log(JSON.stringify(aggregate.totals));

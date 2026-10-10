import { readFile, writeFile } from "node:fs/promises";
import { format } from "prettier";
import { createHash } from "node:crypto";
const root = "docs/research/prose-qr/session-2026-10-10-d/",
  sha = (b) => createHash("sha256").update(b).digest("hex"),
  json = async (p, v) =>
    writeFile(p, await format(JSON.stringify(v), { parser: "json" }), {
      flag: "wx",
    }),
  md = async (p, s) =>
    writeFile(p, await format(s, { parser: "markdown" }), { flag: "wx" }),
  esc = (s) =>
    s.replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const phases = [];
for (let n = 70; n <= 74; n++)
  phases.push(
    JSON.parse(
      await readFile(`docs/research/prose-qr/phase-${n}/analysis.json`),
    ),
  );
const keys = [
  "plannedNativeProfileSlots",
  "nativeCaptures",
  "nativeExactRepeats",
  "plannedPrimaryReaderSlots",
  "completedPrimaryReaderSlots",
  "unattemptedPrimaryReaderSlots",
  "passiveProfiles",
  "actualStockBranches",
  "nativeFirstIntendedBranches",
  "nativeStrictSelectedPasses",
  "controlSlots",
  "controlExactSlots",
];
const totals = Object.fromEntries(
  keys.map((k) => [k, phases.reduce((s, p) => s + p[k], 0)]),
);
totals.uniqueNativePNGHashes = new Set(
  phases.flatMap((p) =>
    p.cases.filter((c) => !c.control).map((c) => c.pngSha256),
  ),
).size;
const a = {
  at: new Date().toISOString(),
  goal: "unsolved",
  phaseRange: [70, 74],
  totals,
  newPayloadSources: 0,
  phoneTests: 0,
  phoneCandidates: 0,
  independentPrimaryImplementations: ["OpenCV", "ZXing", "jsQR"],
  classification:
    "Visible outlined Latin structural controls, separate from unstyled Latin, uniform-black ASCII, logographic and earlier bold prose. Large repetitive word arrays are not natural prose.",
  setupAbort: {
    phase: 72,
    profile: "run-01",
    readerCalls: 0,
    unattemptedPrimarySlots: 12,
    error:
      "Source guard expected one background declaration; saved HTML has two. Corrected run-02 uses an artifact-specific string. Both executed sources and original plan retained.",
  },
  notable: {
    phase73Pave: {
      quadBalance: 0.9,
      nominalSpanFraction: 0.810778202292379,
      stableRows: "9/11",
      trueWorst: 0.5562979917466013,
      sourceDimension: 133,
      ordinaryDimension: 125,
    },
    phase74Pill: {
      minimumQuadBalance: Math.min(
        ...Object.values(
          phases[4].cases.find((c) => c.id === "pill").scans[1].selected,
        ).map((p) => p.quadBalance),
      ),
      minimumNominalSpan: Math.min(
        ...Object.values(
          phases[4].cases.find((c) => c.id === "pill").scans[1].selected,
        ).map((p) => p.nominalSpanFraction),
      ),
      minimumStableRowsFraction: 1,
      trueWorst: 0.5562979917466013,
      sourceDimension: 125,
      ordinaryDimension: 113,
    },
  },
  sources: Object.fromEntries([
    [
      "experiments/prose-qr/session-2026-10-10-d/report.mjs",
      sha(await readFile(new URL(import.meta.url))),
    ],
    ...(await Promise.all(
      phases.map(async (p) => {
        const f = `docs/research/prose-qr/phase-${p.phase}/analysis.json`;
        return [f, sha(await readFile(f))];
      }),
    )),
  ]),
};
await json(root + "analysis.json", a);
const prompt = `Continue prose QR research only in /Users/noir/Documents/aqrobat, branch codex/aqrobat-foundation and existing OPEN draft PR #1. Read AGENTS.md, docs/research/prose-qr/session-2026-10-10-d/CHECKPOINT.md, README.md, analysis.json, verification-final.json, custody.json, HARNESS-NOTES.md and phases70–74 plans/results/custody. Verify branch/remote/HEAD/dirty state, draft PR, exact executed sources, prior custody and product download hashes before edits. Preserve every earlier phase/prototype/product/extension/download, Splashery/PDF archive, owner profile, other task/job. npmprivate/unpublished. No agents/chats/new host/migration/merge/release/store/messages.

Goal unsolved. Fifteen new full native text captures and15 exact repeats test visible Latin outlines; none encodes a payload or is a phone candidate.75/87 planned primary slots complete; phase72's initial setup assertion abort leaves12 unattempted slots, preserved separately from its complete run-02. Original run.mjs and PLAN.initial.md remain saved.25 passive profiles/45 actually executed stock branches are not independent engines. Two actual first-selected branches return intended source geometry; every strict structure gate fails. PILL has stable wide-row fraction1, minimum balance0.818 and nominal span0.822, but true-diagonal RMS0.556>0.35 and ordinary dimension113 versus source125. PAVE has the same diagonal failure; RILL/BILL and dark-page variants do not resolve it. Repeated outlined uppercase words are not natural prose, normal-page use or unstyled/ASCII success. No new phone results.

Start a fresh modest phase with an explicit cap/exclusive directories. Preregister a genuinely different native-text topology mechanism addressing actual first-selected diagonal contour and dimension stability; do not continue size/placement/weight sweeps of the same glyph without a new justified mechanism. Native letter visibility and full-resolution stroke gates stay separate from source models and scored-only/second-return diagnostics. Ordinary independent readers including one outside ZXing get unchanged complete native output. Geometry only in source rendering/post-return diagnosis; no repaired pixels, forced corners/extraction, acceptance-reader tuning, hidden modules/invisible letters or unreadable compression. Keep styled outline, bold, regular Latin, intrinsic-heavy/decorative, logographic and uniform-black ASCII separate. No full-QR sweep on these failed structural controls. Preserve all outcomes/errors/aborts/rejections/unattempted slots/executed sources and exact denominators; never reuse sealed output dirs. Back up milestones on this branch. Continue toward readable native prose with independent ordinary exact-payload recovery, then phone acceptance. Do not claim completion at a time boundary.`;
await md(
  root + "CHECKPOINT.md",
  `# Prose QR checkpoint — October 10, 2026, session D\n\nBaseline f028c72870572a942d6d978d4df93d194e751442. New work is additive research only. The final commit is verified separately in the handback; this document cannot contain its own commit hash. All native jobs/browsers launched for this phase have finished/closed.\n\n${totals.nativeCaptures} native captures / ${totals.nativeExactRepeats} exact immediate-repeat receipts, ${totals.uniqueNativePNGHashes} distinct native PNG hashes. ${totals.completedPrimaryReaderSlots}/${totals.plannedPrimaryReaderSlots} primary slots complete; ${totals.unattemptedPrimaryReaderSlots} setup-aborted slots unattempted. ${totals.passiveProfiles} passive profiles / ${totals.actualStockBranches} stock branches. ${totals.nativeFirstIntendedBranches} first-geometry branches, zero strict passes. No payload or phone candidate.\n\nPhase72's setup guard abort and executed source/initial plan are retained; run-02 is a separate completed profile. Phase65 ERRATA and all old errors remain preserved.\n\n## Resume prompt\n\n${prompt}\n`,
);
await md(
  root + "README.md",
  `# Readable Latin letters, still no prose QR\n\nThe new outline approach keeps visible, selectable Latin letters and real words. It improves some finder structure: PILL retains stable wide central rows at all three first-selected counters. It still fails the true-diagonal ratio and intended-dimension gates. No new native source contains a QR payload. Nothing is ready for phone testing.\n\nThese are deliberately repetitive uppercase word arrays on large pages, not natural paragraphs. Styling uses visible native glyph outlines, never hidden QR blocks. This is separate from unstyled Latin/ASCII and the earlier bold/logographic techniques.\n\n- Phases70–71: filled/outlined O and counter-edge hypotheses; all fail strict structure. Phosphate O is visibly round, contrary to the anticipated straight-edge benefit.\n- Phase72: native dark-page polarity; setup guard abort preserved, fresh complete profile still fails.\n- Phase73: flat-sided P/D bowls; PAVE gains balanced stable spans but fails diagonal/dimension. DARE selects competing counters.\n- Phase74: PILL/RILL/BILL compare counter appendages and remove other letters with enclosed counters. PILL retains stable spans; diagonal/dimension failure persists.\n\n${totals.nativeCaptures} native captures plus${totals.nativeExactRepeats} exact repeats; ${totals.completedPrimaryReaderSlots}/${totals.plannedPrimaryReaderSlots} planned primary slots complete,${totals.unattemptedPrimaryReaderSlots} unattempted before capture. ${totals.controlExactSlots}/${totals.controlSlots} conventional slots exact: only the already-known inverted OpenCV limitation fails. Controls and repeats are not independent engines.\n\nSee analysis.json for exact results, HARNESS-NOTES.md for limits, verification-final.json and custody.json for final checks. The next native objective must address diagonal topology and stable ordinary dimension rather than repeat size/placement/weight searches. The goal remains unsolved.\n`,
);
await md(
  root + "HARNESS-NOTES.md",
  `# Harness notes\n\n- Before edits, live clean branch/remote/HEAD/draft PR and all prior evidence were verified. Phase70 intake retains6002 inventory entries/5586 unique paths,1574 matching source references and14 historical references resolved. Product download hashes match; npmprivate. Final verification independently repeats custody checks.\n- Exactly15 new full native captures,15 exact immediate-repeat hash receipts,18 glyph-resource captures (including filled resources),75 completed primary slots and12 setup-unattempted slots. No new payload source or phone/print observation.\n- Ordinary OpenCV/ZXing/jsQR receive complete native PNGs. Passive jsQR code only logs and asserts full stock-return parity.25 passive profiles and45 executed branches are not new engines. Models, source centers, second returns and scored diagonals do not replace actual first selected true axes.\n- Phase72 run-01 aborts before any native capture or reader call on a source uniqueness assertion. Original executed run.mjs, manifest, capture-error.json and exact PLAN.initial.md retained. Fresh run-v2/run-02 changes only artifact-specific background selection and output/source paths. Original12 primary slots remain unattempted; fresh12 complete.\n- Outline styles use white-filled black contours or black-filled white contours. These are visible Latin glyphs, not invisible letters or concealed QR modules. All local1:1 excerpts inspected and recognizable; no owner/natural-prose/normal-page acceptance is inferred.\n- Phosphate-Solid O did not have the hoped-for straight counter edges. PAVE/DARE change glyph/filler together; PILL changes advance/placement too. These are confounded source comparisons, not causal estimates. BILL has two counter components; ordinary selection can mix them.\n- All exact resource/full native font identities are recorded. Filled resource identity in phases73/74 is independently checked at verification. Filled resource geometry selects a source counter only; there is no decoder extraction or forced corner.\n- Fresh pixel verification reopens saved PNGs and matches38 PNG/RGBA receipt pairs, including reused controls/resources; it is not a new screenshot or phone test. Immediate repeat bytes are represented by saved matching hashes; identical files were not duplicated.\n- Research-only changes: npm test and formatting have retained receipts. Product build/browser/extension/Gmail/native-paste suites are not rerun; product/downloads remain unchanged. No owner browser/profile or other job is touched.\n`,
);
const im = async (p) =>
  "data:image/png;base64," + (await readFile(p)).toString("base64");
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Aqrobat · outline Latin research</title><style>:root{color-scheme:light}*{box-sizing:border-box}body{margin:0;background:#f4f1ea;color:#222b30;font:17px/1.65 system-ui,sans-serif}main{max-width:960px;margin:auto;padding:30px 22px 65px}h1{font-size:clamp(2rem,6vw,3.5rem);line-height:1.1;max-width:760px}h2{font-size:1.35rem;margin-top:2rem}p{max-width:76ch}article,.note{background:white;border:1px solid #d6d7d0;border-radius:15px;padding:22px;margin:22px 0}.tag{font-size:.8rem;letter-spacing:.1em;font-weight:700;color:#67511b}.status{background:#fff0c2;border-left:5px solid #b38419;padding:16px}img{max-width:100%;height:auto;display:block;background:white}small{color:#4c565b}table{border-collapse:collapse;width:100%;font-size:.9rem}th,td{text-align:left;border-bottom:1px solid #d6d7d0;padding:9px 5px}.table{overflow:auto}textarea{width:100%;min-height:320px;font:14px/1.55 ui-monospace,monospace;padding:14px;border:1px solid #a6afb2;border-radius:8px;resize:vertical}button{font:inherit;background:#234b54;color:white;border:0;border-radius:8px;padding:12px 18px;margin:12px 0;cursor:pointer}a{color:#24515d}code{overflow-wrap:anywhere}footer{font-size:.85rem;color:#4c565b}</style><main><div class="tag">AQROBAT RESEARCH · OCTOBER 10 · SESSION D</div><h1>Readable letters.<br>Still no prose QR.</h1><p class="status"><strong>No phone test is needed.</strong> These are finder-structure experiments, with no encoded link or payload. The prose goal remains unsolved.</p><p>I tested visible outline typography as a different way to create the boundaries a QR reader looks for. The strongest new Latin case keeps stable central rows, but it still fails the true-diagonal proportions and the intended dimension. There is no full-QR result.</p><article><h2>What changed</h2><p>The letters themselves supply every visible contour. There are no hidden QR blocks. Unlike the recent repeated logographic controls, these samples use recognizable English words—but the large repetitive arrays are not natural prose.</p><img alt="Native outlined PILL WILL letter excerpt; structural control without a QR payload" src="${await im("docs/research/prose-qr/phase-74/run-01/pill/letters.png")}"><small>Native letter excerpt only. It illustrates typography, not a scannable candidate.</small><p>The three first-selected P counters have stable wide-row fraction <strong>1.0</strong>, minimum span balance <strong>0.818</strong>, and minimum nominal span <strong>0.822</strong>. The worst true-diagonal error is <strong>0.556</strong>, above the fixed0.35 limit. The ordinary locator returns dimension113; the source model specifies125. Both failures remain failures.</p></article><h2>The bounded tests</h2><div class="table"><table><thead><tr><th>Phase</th><th>Question</th><th>Native captures</th><th>Strict passes</th></tr></thead><tbody>${phases.map((p, i) => `<tr><td>${p.phase}</td><td>${["Can outlined O supply two contours?", "Do straighter counters help?", "Does native dark-page polarity help?", "Can flatter P/D bowls hold stable spans?", "Do appendages and competing counters matter?"][i]}</td><td>${p.nativeCaptures}</td><td>${p.nativeStrictSelectedPasses}</td></tr>`).join("")}</tbody></table></div><p>All${totals.nativeCaptures} native captures have exact immediate-repeat receipts. Three ordinary implementations—OpenCV, ZXing and jsQR—received unchanged complete images.${totals.completedPrimaryReaderSlots} of${totals.plannedPrimaryReaderSlots} planned primary slots completed. The remaining12 were unattempted after a setup assertion, before rendering or decoding; that failure and its source are preserved.</p><p>Conventional controls recovered the exact URL in25 of30 repeated reader slots. The five failures are the already-recorded inverted OpenCV limitation. Repeats and passive logging profiles are not independent engines.</p><article><h2>What did not work</h2><p>Round O contours produced unbalanced or short spans. Silom was narrow, and Phosphate O was rounder than the proposed straight-edge mechanism needed. Dark-page typography changed which ordinary branch found the letters, but did not solve their structure. P was stronger; R's diagonal leg and B's second bowl did not fix the remaining failure.</p><img alt="Visible dark-page outlined OPEN READ text, not a payload or phone candidate" src="${await im("docs/research/prose-qr/phase-72/run-02/arial-outline-dark/letters.png")}"><small>Dark-page native typography, also an unsuccessful structural control.</small></article><h2>What remains</h2><p>A future native-text design must satisfy the actual selected diagonal contours and stable ordinary dimension, then survive full-payload recovery in independent readers. It must also become readable prose at a useful page size. Only after those steps should we ask for another phone test. Unstyled text and uniform-black ASCII remain separate unresolved goals.</p><p>These results justify investigating the P counter's asymmetric diagonal boundary. They do not justify another blind size, placement or weight sweep, or promotion to a full QR.</p><h2>Safe continuation</h2><p>The prompt below preserves the scope, failures and stop gates. All prior product, extension and download files are preserved; npm remains private and PR#1 stays draft.</p><button id="copy">Copy continuation prompt</button><span id="notice" role="status"></span><textarea id="prompt" aria-label="Continuation prompt" readonly>${esc(prompt)}</textarea><footer><p>Exact sources, manifests, raw reader outputs, errors and custody receipts live alongside this report. Automated tests and evidence checks establish only what they exercise; no owner, portable, phone or print acceptance is claimed.</p></footer></main><script>document.getElementById('copy').addEventListener('click',async()=>{const p=document.getElementById('prompt'),n=document.getElementById('notice');try{await navigator.clipboard.writeText(p.value);n.textContent=' Copied.'}catch{p.focus();p.select();n.textContent=' Prompt selected. Use Copy.'}})</script></html>`;
await writeFile(root + "index.html", await format(html, { parser: "html" }), {
  flag: "wx",
});
console.log(JSON.stringify(totals));

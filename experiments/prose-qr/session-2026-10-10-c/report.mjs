import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { format } from "prettier";
const root = "docs/research/prose-qr/session-2026-10-10-c/";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const save = async (n, s, parser) =>
  writeFile(root + n, await format(s, { parser }), { flag: "wx" });
const phases = [],
  hashes = [];
for (let n = 64; n <= 69; n++) {
  const path = `docs/research/prose-qr/phase-${n}/analysis.json`,
    a = JSON.parse(await readFile(path));
  phases.push({
    phase: n,
    analysis: path,
    sha256: sha(await readFile(path)),
    plannedNative: a.plannedNativeSources,
    nativeCaptures: a.completedNativeSources,
    nativeRepeats: a.nativeExactRepeats,
    primaryPlanned: a.plannedPrimaryReaderSlots,
    primaryCompleted: a.completedPrimaryReaderSlots,
    primaryUnattempted: a.unattemptedPrimaryReaderSlots,
    passiveProfiles: a.completedPassiveProfiles,
    intendedBranches: a.nativeIntendedGeometryBranches,
    strictPasses: a.nativeStrictSelectedPasses,
    readOnly: n === 66,
  });
  if (n !== 66)
    for (const c of JSON.parse(
      await readFile(`docs/research/prose-qr/phase-${n}/run-01/captures.json`),
    ))
      if (!c.control && c.pngSha256) hashes.push(c.pngSha256);
}
const sum = (k) => phases.reduce((n, r) => n + r[k], 0);
const totals = {
  nativeResourceProposals: sum("plannedNative"),
  nativeCaptureAttempts: sum("nativeCaptures"),
  nativeExactImmediateRepeats: sum("nativeRepeats"),
  uniqueNativePNGHashes: new Set(hashes).size,
  plannedPrimaryReaderSlots: sum("primaryPlanned"),
  completedPrimaryReaderSlots: sum("primaryCompleted"),
  unattemptedPrimaryReaderSlots: sum("primaryUnattempted"),
  passiveProfiles: sum("passiveProfiles"),
  intendedNativeGeometryBranches: sum("intendedBranches"),
  strictNativePasses: sum("strictPasses"),
  newPayloadSources: 0,
  phoneTests: 0,
  phoneCandidates: 0,
};
const analysis = {
  at: new Date().toISOString(),
  goal: "unsolved",
  phases,
  totals,
  scope:
    "Logographic structural controls at fixed native64px; no semantic or English prose result.",
  bestObserved: {
    phase: 65,
    case: "heiti-sc",
    quadBalance: 0.9333333333333333,
    nominalSpanFraction: 0.875,
    stableWideRowFraction: 1,
    worstTrueAxisRMS: 0.3803039805262239,
    requiredMaximumTrueAxisRMS: 0.35,
    strictPass: false,
  },
  pointAudit: {
    phase: 66,
    inputs: 4,
    actualSelectedPoints: 12,
    sourcePoints: 12,
    translatedResourcePoints: 12,
    secondActuallyReturnedPoints: 12,
    newReaderCalls: 0,
    substitutedAcceptancePoints: 0,
  },
  controls: {
    primarySlots: 30,
    exactSlots: 25,
    knownLimitation:
      "Stock OpenCV inverted conventional control fails; normal control passes all three, inverted ZXing/jsQR pass.",
  },
  preservedReportingError:
    "Phase65 README duplicate-pair sentence is superseded by ERRATA.md; raw hashes and analysis remain correct.",
  sources: {
    "experiments/prose-qr/session-2026-10-10-c/report.mjs": sha(
      await readFile(new URL(import.meta.url)),
    ),
    [root + "ERRATA.md"]: sha(await readFile(root + "ERRATA.md")),
  },
};
await save("analysis.json", JSON.stringify(analysis), "json");
const prompt = `Continue prose QR research only in /Users/noir/Documents/aqrobat, branch codex/aqrobat-foundation and existing OPEN draft PR #1. Read AGENTS.md and docs/research/prose-qr/session-2026-10-10-c/CHECKPOINT.md, README.md, ERRATA.md, analysis.json, verification-final.json, custody.json, HARNESS-NOTES.md and phases64–69 plans/results/custody. Verify branch, remote, HEAD, dirty state, PR draft status, exact executed sources, prior custody and product download hashes before edits. Preserve all prior phases/prototypes, product/extension/downloads, Splashery, PDF archive, owner profiles, other tasks and jobs. Keep npm private/unpublished. No agents/chats/new host/migration/merge/release/store/messages.

The prose goal remains unsolved. Twenty native resource proposals produced14 full native capture attempts and14 exact repeats, with11 distinct PNG hashes. Six phase64 resource rejects leave18 primary slots unattempted;72 of90 planned primary slots complete. Phase66 is a separate read-only audit with no decoder calls. None of the new native sources encodes a payload or is a phone candidate. All strict first-selected structure gates still fail. Heiti Light has stable wide rows1, balanced spans0.933 and nominal span0.875, but actual first-selected true-diagonal error0.3803 exceeds0.35. Source-aligned, translated-resource and second-returned points with lower errors are diagnostics only, never substituted for acceptance. Native quarter-pixel source shifts do not help: phase67 yields only two PNG hashes, one identical to the original Heiti source. Sibling weights/designs remain failures. These repeated logographic controls do not establish English prose, meaningful Chinese prose, normal-page usability or phone acceptance.

Preserve the phase65 README's reported duplicate-pair error with its correction in ERRATA.md: Hiragino/GB have equal reported finder diagnostics but distinct PNG/RGBA hashes; only Heiti SC/TC are identical. Phase64 early resource rejects lack independent platform-font receipts; phase65 onward retain resource/full identity. Preserve all earlier errors/aborts/unknown slots and source versions. No new phone results.

Start a fresh modest phase with an explicit file cap and exclusive directories. Preregister one genuinely different native-text topology objective with a plausible path toward readable prose, aimed at actual first-selected H/V/both diagonal runs and stable spans. Do not continue size/placement/weight sweeps of the same character without a new justified mechanism. No full-QR sweep based on coordinate, model, scored-only or second-return passes. Keep logographic controls, regular Latin, intrinsic-heavy, styled/bold and uniform-black ASCII lanes separate. Ordinary readers including one outside ZXing receive unchanged complete native outputs. Geometry is only for source rendering and post-return diagnosis: no repaired pixels, forced corners/extraction, acceptance-reader tuning, hidden modules/invisible letters or unreadable compression. Preserve all outcomes, rejections, errors, aborts, exact denominators and executed sources. Back up milestones on this branch. Continue toward readable native prose with independent ordinary exact-payload recovery, then phone acceptance. Do not claim completion at a time boundary.`;
await save(
  "CHECKPOINT.md",
  `# Prose QR checkpoint — fixed-size native design research\n\nBaseline867f1ea0b2ec37a9e659a17bdc5798e0f1ef4de0 was clean and matched origin and OPEN draft PR1 before edits. Read ERRATA.md with phase65's sealed README. The goal remains unsolved. All phase64–69 experiment jobs have finished; no test-owned browser remains running at handback.\n\nThere is no new payload or phone candidate.14 full native captures/repeats,11 distinct PNGs. This is a bounded character-design result, not English prose. Session source/report cap1,000,000 logical bytes; phases64/65/67/68/69 each4,000,000, read-only phase66 cap600,000. Sources/output directories are sealed: never rerun in place.\n\n## Continuation prompt\n\n${prompt}\n`,
  "markdown",
);
await save(
  "HARNESS-NOTES.md",
  `# Harness notes\n\n- Intake reverified43 prior receipts/5535 inventory entries,1366 currently matching source references and14 historical source snapshots. The persisted intake is a fresh recheck after generation; initial checks preceded edits in tool output.\n- Phase64 source models reject six resources before full text capture. They have requested/local-font loading evidence but no separately recorded actual platform-font identity. Do not call those six exact-face measurements.\n- Phase65 onward records resource and full-context platform-font identity. All eligible new full text identities match. Native source origins and phase drift are retained.\n- Phase66 performs ordinary binarization on saved bytes solely for passive point diagnostics. It makes no decoder call and never substitutes another point into a reader or into the fixed first-selected gate. Actual first-selected metrics reproduce the saved trace exactly.\n- Phase67 native0.25px render equals the saved phase65 original;0.5/0.75px renders are identical to each other. These are recorded proposals, not independent visual cases. No PNG was shifted after capture.\n- Phase65 README incorrectly calls Hiragino/GB images duplicates based on equal finder diagnostics. Both PNG and RGBA hashes differ. ERRATA.md supersedes that sentence; original README/sealer remain intact. The phase analysis's unique count is already correct.\n- Native words/characters are large and repetitive. Local visible shapes do not establish Chinese reading fluency, semantics, ordinary-page use or owner/portable acceptance. No new native source contains a payload.\n- Ordinary readers remain default OpenCV, default ZXing and stock jsQR. Passive profiles/repeats are not engines. Normal conventional controls pass all three; inverted OpenCV fails as already recorded.\n- No product code/download changes. npm test18/18 passes. Formatting and final custody/pixel/report checks have separate receipts. Product build, product browser/extension, Gmail/native paste and phone/print suites are not rerun for research-only changes.\n- No new experiment aborts or reader/checker errors occurred in these phases; the report wording error above is retained. Prior setup errors/aborts/unknown and unattempted slots remain in original receipts.\n`,
  "markdown",
);
const table = phases
  .map(
    (r) =>
      `|${r.phase}|${r.plannedNative}|${r.nativeCaptures}|${r.primaryCompleted}/${r.primaryPlanned}|${r.strictPasses}|`,
  )
  .join("\n");
await save(
  "README.md",
  `# Prose QR — fixed-size native design results\n\nThe goal remains unsolved. The best Heiti controls now have stable wide centers and balanced spans in full native context, but the actual first-selected true-diagonal metric still fails0.3803 versus0.350 required. No new payload or phone candidate exists.\n\n## What changed\n\nThe fixed-size design tests separate font structure from text size. Several cases pass center/dimension, span and reader-scored checks. Every case still fails at least one strict criterion. A read-only point audit shows lower errors at source-model or second-return points, but those do not replace the first selection. Quarter-pixel source changes fail to improve the structure, and neighboring font weights do not resolve it.\n\n## Accounting\n\n20 resource proposals;14 full native captures and14 exact immediate repeats;11 distinct PNG hashes. Six resource rejections leave18 primary slots unattempted.72/90 primary slots complete, including30 conventional slots (25 exact; known inverted OpenCV limitation). Phase66 makes no reader call.24 passive profiles are not independent engines. No full-QR sweep was run.\n\n|Phase|Resource proposals|Native captures|Primary complete/planned|Strict pass|\n|---|---:|---:|---:|---:|\n${table}\n\nThese are repetitive logographic structural controls, not English/meaningful Chinese prose or normal-page usability. No new phone/print acceptance exists. Read [ERRATA.md](ERRATA.md): phase65's duplicate-pair sentence is incorrect; equal diagnostics did not mean equal pixels. Exact raw sources/results and the correction are retained.\n\n## What remains\n\nReadable prose, independent ordinary exact-payload recovery and phone acceptance all remain outstanding. This bounded font-design bracket does not justify more of the same size/placement/weight sweeps. A next phase needs a new native-text mechanism that addresses the actual selected diagonal structure and can plausibly transfer to prose. Its gate must include clear letters and unchanged ordinary-reader output.\n\n[Mobile report](index.html) · [Checkpoint](CHECKPOINT.md) · [Harness notes](HARNESS-NOTES.md) · [Verification](verification-final.json) · [Custody](custody.json)\n`,
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
const image = (
  await readFile("docs/research/prose-qr/phase-65/run-01/heiti-sc/letters.png")
).toString("base64");
await save(
  "index.html",
  `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Aqrobat · Native structure research</title><style>body{margin:0;background:#f3f1eb;color:#252939;font:17px/1.65 system-ui,sans-serif}main{max-width:850px;margin:auto;padding:30px 20px 70px}h1{font-size:clamp(32px,7vw,52px);line-height:1.1}h2{font-size:25px}section{margin:26px 0;padding:22px;border:1px solid #ded8cc;background:white;border-radius:16px}.tag{color:#835014;font-weight:700}img{max-width:100%;height:auto;border:1px solid #ccc}figure{margin:20px 0}figcaption,.small{font-size:14px;color:#535b6c}table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;padding:9px 5px;border-bottom:1px solid #ddd}.scroll{overflow:auto}textarea{box-sizing:border-box;width:100%;height:350px;padding:12px;font:14px/1.5 ui-monospace,monospace}button{border:0;border-radius:8px;padding:12px 20px;background:#303c68;color:white;font:inherit;cursor:pointer}code{overflow-wrap:anywhere}</style><main><p class="tag">October 10 · Phases64–69 · Goal unsolved</p><h1>Stronger centers.<br>Diagonals still fail.</h1><p>This round tested native font design at a fixed text size. It improved several structural checks, but produced no working prose QR or phone candidate.</p><section><h2>The useful finding</h2><p>The best Heiti text has stable wide centers, balanced spans and the intended three positions in full text context. The ordinary reader’s scoring checks pass. Our separate true-diagonal check still fails: <strong>0.3803</strong> error against the unchanged <strong>0.3500</strong> gate.</p><figure><img width="400" height="170" alt="Native Heiti character excerpt, structural control only" src="data:image/png;base64,${image}"><figcaption>This is an excerpt of visible native characters. It is a structural control with no encoded link or payload, and it is not meaningful prose.</figcaption></figure><p>A point audit found better ratios at other recorded points. Those were kept as diagnostics; they were not substituted for the reader’s actual first selection.</p></section><section><h2>What did not help</h2><p>Quarter-pixel source shifts produced only the original image or an unchanged-shape translated image. The diagonal failure remained. Additional neighboring font weights and designs also failed the full gate.</p><p>These results do not justify continuing the same size, weight or position sweep. They also do not prove that prose QR is impossible.</p></section><section><h2>The retained record</h2><p><strong>20</strong> resource proposals, <strong>14</strong> full native captures with exact repeats, and <strong>11</strong> distinct PNG hashes. All rejections and unattempted cases remain recorded.</p><div class="scroll"><table><thead><tr><th>Phase</th><th>Native captures</th><th>Primary slots complete/planned</th><th>Strict pass</th></tr></thead><tbody>${phases.map((r) => `<tr><td>${r.phase}</td><td>${r.nativeCaptures}</td><td>${r.primaryCompleted}/${r.primaryPlanned}</td><td>${r.strictPasses}</td></tr>`).join("")}</tbody></table></div><p class="small">Phase66 is read-only diagnosis. Reader slots include conventional controls; profiles/repeats are not independent engines. One sealed README sentence incorrectly called a pair of images duplicates. Hash verification caught it, and ERRATA.md records the correction while preserving the original.</p></section><section><h2>What remains</h2><p>Readable prose, independent exact-payload decoding and phone acceptance remain unsolved. There is nothing new you need to scan. The next research step needs a different native-text mechanism with a plausible route from coherent finder structure to prose.</p><p>Everything is retained under <code>docs/research/prose-qr/session-2026-10-10-c/</code>.</p><textarea id="prompt" readonly aria-label="Continuation prompt">${esc(prompt)}</textarea><p><button id="copy">Copy continuation prompt</button></p><p id="copy-status" role="status">You can also select the prompt manually.</p></section></main><script>document.querySelector('#copy').onclick=async()=>{const p=document.querySelector('#prompt'),s=document.querySelector('#copy-status');try{await navigator.clipboard.writeText(p.value);s.textContent='Prompt copied.'}catch{p.focus();p.select();s.textContent='Prompt selected. Use your browser’s Copy command.'}};</script></html>`,
  "html",
);
console.log(JSON.stringify(totals));

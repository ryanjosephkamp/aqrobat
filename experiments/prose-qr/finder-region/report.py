from pathlib import Path
import json, html, hashlib
root=Path('docs/research/prose-qr/phase-08')
source=Path('experiments/prose-qr/finder-region')
def read(p):return json.loads(p.read_text())
def write(name,text):
    size=sum(p.stat().st_size for r in [root,source] for p in r.rglob('*') if p.is_file())
    assert size+len(text.encode())<2940000, 'Keep custody reserve'
    with (root/name).open('x') as f:f.write(text)
rows=[]
for batch in ['run-01','pitch-01','packing-01','placement-01']:
    rows += [(batch,json.loads(s)) for s in (root/batch/'results.jsonl').read_text().splitlines()]
placements=[r for b,r in rows if b=='placement-01']
control=read(root/'placement-01/controls.json')['solid']['probe']
audit=read(root/'score-audit-summary.json')
analysis={'sourceScriptSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
'plannedSourceProposals':29,'nativeLayouts':len(rows),'sourcePackingRejections':2,
'ordinaryCoordinateDimensionPasses':sum(r['probe']['ordinary']['correctFinder'] for _,r in rows),
'layoutsWithAnyStableCentralRow':sum(any(c['stableRows'] for c in r['probe']['corners'].values()) for _,r in rows),
'automaticLegibilityRejections':sum(r['legibility']['automaticRejected'] for _,r in rows),
'payloads':0,'phoneCandidates':0,'goal':'unsolved',
'placementMechanism':{'sourceOffsets':[7,8,9],'nativeFontSize':20,'nativeLineHeight':24,'tracking':0,'nominalModule':6,'expectedCentralSpan':18,'actualTopWidth':5,'actualBottomWidth':5,'actualHeight':3,'scoredSize':13/3,'stableRows':0,'ordinaryGeometry':'Dimension 25, all three points within one nominal unit; also returns dimension 23 alternative','qualification':'Coordinate/dimension gate only; not complete finder structure or payload recovery'},
'visualReview':{'representativeFiles':['run-01/raw/monaco-area.png','run-01/raw/impact-region.png','pitch-01/raw/impact-pitch-6.png','pitch-01/raw/monaco-pitch-8.png'],'observations':'Letters/words distinguishable in representative displays. Text is repetitive, mixed-case and semantically unaccepted. Small fields contain only three/four short lines and separate clusters, not ordinary paragraph flow. Other layouts not individually visually accepted. Owner legibility untested. Eight Impact large-field layouts fail conservative -0.1171875 px ink-bounds overlap gate; this alone does not establish perceptual illegibility.'},
'rows':[{'batch':b,'id':r['id'],'unit':r['spec'].get('unit',48),'objective':r['probe']['objective'],'components':r['probe']['components'],'coordinatePass':r['probe']['ordinary']['correctFinder'],'legibilityRejected':r['legibility']['automaticRejected']} for b,r in rows],
'audit':{'path':'score-audit-summary.json','ordinaryReturnsMatch':4,'nativeTopLeftRuns':audit['inputs'][0]['selected']['topLeft']['runRecords'][0],'solidTopLeftRuns':audit['inputs'][-1]['selected']['topLeft']['runRecords'][0]},
'interpretation':'A word texture can yield correctly arranged ordinary finder points while its horizontal/vertical/diagonal run structure remains incomplete. Native region objective and coordinate check are separate proxies. This local result does not establish QR recovery, phone reliability, universal impossibility or a complete mechanism.'}
write('analysis.json',json.dumps(analysis,indent=2)+'\n')
resume='''Continue prose QR research only in /Users/noir/Documents/aqrobat, branch codex/aqrobat-foundation and existing draft PR #1. Read AGENTS.md and docs/research/prose-qr/phase-08/CHECKPOINT.md, README.md, verification-final.json, analysis.json, score-audit-summary.json and custody.json. Verify Git branch/remote/HEAD/dirty state, PR draft status, source hashes, prior custody and product downloads before edits. Preserve all phases, original prototypes, product/extension, Splashery, PDF archive, profiles, other tasks and jobs. npm stays private/unpublished. No merge, migration, host, chat/agent, release, store or messages.

Phase 08 retains 29 source proposals: 27 native finder-only layouts, two original DP packing rejections, including two revised packing proposals and three source-placement probes. All 27 immediate repeats and three-dozen-independent-data claims must be checked against exact receipts: final replay contains 35 PNG/RGBA pairs. Three Impact placements (+7,+8,+9 px; 20 px native font, 24 px leading, pitch 6) pass ordinary coordinate/dimension geometry, but ALL 27 have zero stable wide central rows. The selected native quad is 5 by 3 pixels, scored size 4.33, versus nominal central span 18. Passive scoring traces retain missing vertical/diagonal runs; the solid control has complete runs. These are narrow locator results, not QR payloads or phone candidates. No new phone tests; prose goal unsolved. Eight larger Impact layouts fail the explicit conservative ink-bounds overlap gate; mechanical pass is not owner legibility acceptance.

Preserve the first verifier denominator error and its executed source, two source-packing failures, original recipes, all corrected-source versions and every outcome. Phase 08 is sealed under a 3-MB logical-file cap and close to its cap; do not append native sweeps or reuse fixed output directories. Start a fresh modest phase, preregister a small objective based on actual native selected-candidate horizontal/vertical/both diagonal runs, balanced spans and clear legible letters. Geometry is allowed only in source rendering and post-probe diagnostics, never to repair pixels, force extraction/corners or tune acceptance readers. Retain negative outcomes/rejections/aborts/errors and exact denominators. No full-QR sweep based merely on the three coordinate passes; complete finder structure and legibility remain unresolved. No hidden blocks, invisible text or unreadable raster compression as a solution. Keep styled prose and uniform-black ASCII separate. Back up milestones on the same branch. Continue toward readable unchanged native text decoded by independent ordinary readers, then phone acceptance; do not claim completion at a time-block boundary.'''
resume=resume.replace(' and three-dozen-independent-data claims must be checked against exact receipts: final replay contains 35 PNG/RGBA pairs',' match; final read-only replay contains 35 PNG/RGBA pairs')
checkpoint='''# Prose QR checkpoint — phase 08

October 9, 2026. Baseline `3bead571699cc767d03d5f96e829c0c85f694dd4`.
Work only in Aqrobat on the existing branch/draft PR. No migration requested.
Final commit is verified via live Git/remote/PR, rather than embedded in this
self-referential checkpoint. No task-owned browser/job remains at final handback.

A narrow milestone: three source placements pass ordinary corner coordinates
and dimension 25. The selected quad is only 5 × 3 px, scored size 4.33; nominal
central span is 18. All 27 layouts have zero stable wide central rows. Vertical
and diagonal scoring runs contain missing transitions. No encoded payload,
full-QR candidate, phone candidate or new phone observation. Goal remains unsolved.

29 source proposals: 16 initial/native-feedback, eight pitch proposals (six
native and two source DP rejections), two separately revised packing proposals,
three fixed native placements. 27 native captures, 27 exact immediate repeats,
four ordinary full controls passing three profiles (12 initial attempts), four
solid finder controls. Final read-only replay: 35 PNG/RGBA pairs and 12 additional
full-control profile attempts. Earlier separate replay: 26 pairs and six control
attempts. Passive score audit: four inputs, identical ordinary return values.
The first verifier denominator failure is retained; its unreceipted partial
probes are not added to successful replay counts. Prior 1,062 inventory entries,
40 old executed-source hashes and three product downloads match unchanged.
Eight native outputs fail conservative overlapping ink-bounds rejection; no
owner prose-legibility acceptance. See reports for exact qualifications.

Do not rerun exclusive capture scripts. All sources/outputs/errors survive.
The fresh phase has a 3,000,000-byte logical cap including custody, excluding Git
objects; read its final receipt. Use a fresh modest phase for more native work.

## Resume prompt

'''+resume+'\n'
write('CHECKPOINT.md',checkpoint)
readme='''# Phase 08 — ordinary location is not yet a complete finder

Codex continued bounded native-letter research only in Aqrobat. The prose QR
goal remains unsolved. This phase has no candidate payload or phone test.

## Narrow result

Three native Impact layouts pass the unmodified ordinary jsQR locator's corner
and dimension test. Only the source nodes move +7,+8,+9 px; letters stay 20 px,
400 weight, black, 24 px leading, zero tracking. No raster translation or reader
hint is used. They contain the frozen complete words `wee / RUM / if IT.` in
three isolated clusters. This is not paragraph flow or meaningful prose.

Their selected quad has top/bottom width 5 and height 3, computed size 4.33,
against an 18 px nominal central region. All 27 native layouts have zero stable
central rows at the preregistered 80% width criterion. The three point arrangements
therefore pass a limited coordinate/dimension test, not the complete structure
objective, independent payload recovery, or phone acceptance.

A passive audit logs all finder-scoring runs on three placements and their solid
control. Its returns exactly match ordinary results. The +7 top-left example has
horizontal runs [1,4,5,1,4], vertical [0,0,16,10,9], and missing diagonal runs;
the solid control has [24,24,72,24,24] horizontal/vertical, and complete diagonal
runs. Actual score inputs—not source-center samples—show the remaining mismatch.
The opened [locator source](https://github.com/cozmo/jsQR/blob/master/src/locator/index.ts)
and [binarizer source](https://github.com/cozmo/jsQR/blob/master/src/binarizer/index.ts)
provide context; exact executed installed-bundle hashes are in manifests/audits.
This is a local observation and does not prove a universal cause or impossibility.

## Exact denominator and sequence

- Initial preregistration: four seeds and twelve native whole-word feedback
  proposals, all sixteen captured. Region weighting and feedback give only small
  proxy-score changes, with no intended geometry and zero stable rows.
- Additive pitch plan: eight fixed proposals, six native captures and two Monaco
  source DP packing rejections. Native font size/spacing stays fixed; source
  module pitch changes. No rejected proposal is silently shortened or recounted
  as a failed native scan.
- Bounded packing plan: two explicit revised proposals widen only the DP terminal
  allowance. Both render, neither passes intended geometry. Feasible source
  text can miss a narrow discrete terminal band; original failures are solver
  evidence, not proof that words cannot fit. Old source copies are unchanged.
- Placement plan: three frozen word layouts with registered source x offsets,
  all three pass coordinates/dimension, all three fail stable wide-span structure.

Total: 29 source proposals, 27 native layouts, two original source rejections,
three coordinate/dimension passes, zero stable-span layouts, zero payloads or
phone candidates. Every PNG, native metrics, TXT, HTML gzip, source version,
selection and exception is retained. No captured native output was rerun in its
original directory. The source-position offsets can extend text beyond the
idealized 7-module field; actual native node widths fit. They are diagnostic
relaxations, not a finished QR source renderer.

## Legibility and preservation

20 px letters and 24 px lines retain at least 2 px native envelope clearance.
Eight large-field Impact outputs fail the preregistered ink-bounds overlap gate
(-0.1171875 px); all other mechanical checks pass. Bounding-box overlap is a
conservative rejection, not proof of perceptual illegibility. Representative
native displays have distinguishable but repetitive words and mixed case.
Remaining individual visual/owner legibility is unaccepted. Small fields contain
very short word clusters, not normal paragraphs. No synthetic I/E/T words,
negative tracking, per-character boxes, color/weight coding or hidden modules.

All 1,062 inventoried phase-04/05/06/07 files, 40 prior executed-source hashes and
three product 0.4.2 downloads verify unchanged. Product/extension/build outputs,
original prototypes, Splashery and PDF archive are outside this change. npm
remains private/unpublished and PR #1 remains draft. No new device, print, Gmail,
clipboard or owner extension observations. Earlier styled prose and uniform-black
ASCII/TXT results remain separate; previous Samsung failures are not superseded.

## Verification and errors

27 immediate native repeats and four old-seed replays match exactly. Four initial
full controls pass jsQR, default ZXing and the retained baseline (12 profile
attempts); four solid controls locate correctly. Final separate read-only replay
checks all 35 PNG/RGBA pairs, ordinary diagnostics, passive-return equivalence,
and adds twelve full-control profile attempts. Earlier successful replay checks
26 pairs and adds six control attempts; it is a separate retained receipt.
A blank negative image rejects in the verification harness.

The first verifier assumed all eight pitch proposals were captured and stopped
on 6 != 8. Its source/error are retained; corrected denominator includes two
source rejections. Its partial unreceipted replay is not counted as successful.
The original error bytes survive beside the formatted JSON. A completed-PTY poll
error generated no native work. Read HARNESS-NOTES.md for these distinctions.

No product build or product browser/download rebuild is needed for these
research-only files; prior product/browser results are historical, not new native
acceptance. Current unit/format/scope and mobile handback checks are recorded
separately. Custody caps this phase below 3 MB excluding Git objects.

## Next objective

Start a fresh modest phase rather than filling this one. Use actual selected
ordinary score runs to seek balanced horizontal, vertical and both diagonal
structure from clear native letters. Keep source/legibility gates explicit.
Do not start a full-QR sweep based only on these three coordinate passes.
Independent payload recovery and phone acceptance still follow that source
structure work. No completion claim is warranted.
'''
write('README.md',readme)
data={'placements':[{'id':r['id'],'pass':r['probe']['ordinary']['correctFinder'],'components':r['probe']['components'],'corners':r['probe']['ordinary']['locations'][0],'quad':r['probe']['corners']['topLeft']['bestBalancedQuad']} for r in placements], 'runs':[r['selected']['topLeft']['runRecords'][0] for r in audit['inputs']]}
page='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Aqrobat · phase 08 research</title><style>
:root{color-scheme:light;--ink:#26233b;--muted:#615b72;--paper:#faf8f3;--accent:#6150b8}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:17px/1.65 system-ui,sans-serif}main{max-width:920px;margin:auto;padding:30px 20px 70px}h1{font:clamp(2rem,6vw,3.5rem)/1.12 Georgia,serif;max-width:750px}h2{font:1.65rem Georgia,serif;margin-top:1.8em}.eyebrow{font-size:.8rem;letter-spacing:.1em;text-transform:uppercase}.status{background:#eee8fb;border-left:4px solid var(--accent);padding:18px;border-radius:7px}a{color:#514294}article{background:white;border:1px solid #ded8e9;border-radius:16px;padding:20px;margin:20px 0}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.stats b{display:block;font-size:2rem}.stats span{font-size:.85rem;color:var(--muted)}select,button{font:inherit;padding:10px 13px;border-radius:9px;border:1px solid #c9bfdf;background:white;color:var(--ink)}button{cursor:pointer}svg{width:100%;max-height:240px}textarea{display:block;width:100%;height:360px;margin:16px 0;font:14px/1.5 ui-monospace,monospace;padding:12px;border:1px solid #ccc;border-radius:9px}.table-wrap{overflow:auto}table{border-collapse:collapse;width:100%;font-size:.9rem}th,td{text-align:left;padding:10px;border-bottom:1px solid #e0dce8}code{overflow-wrap:anywhere}pre{white-space:pre-wrap;font-size:14px}small{color:var(--muted)}.bars{display:grid;gap:8px}.bar{display:grid;grid-template-columns:110px 1fr 60px;align-items:center;gap:10px;font-size:.85rem}.track{height:12px;background:#ece8f2;border-radius:6px}.fill{height:100%;background:#8674c8;border-radius:6px}.actions{display:flex;gap:10px;flex-wrap:wrap}@media(max-width:480px){.stats b{font-size:1.7rem}article{padding:16px}.bar{grid-template-columns:90px 1fr 50px;gap:6px}main{padding:20px 15px}}
</style><main><p class="eyebrow">Aqrobat · October 9, 2026 · Phase 08</p><h1>A narrow locator milestone. The prose QR goal is still open.</h1><p class="status">Three readable native-word layouts now produce the intended ordinary finder coordinates and dimension. Their finder structure is incomplete. <strong>No payload, no phone candidate, no new phone test.</strong></p><div class="stats"><div><b>27</b><span>native layouts retained</span></div><div><b>3</b><span>coordinate/dimension passes</span></div><div><b>0</b><span>stable wide-span layouts</span></div></div><article><h2>What changed</h2><p>The experiment holds letters at 20 pixels, line spacing at 24 pixels and tracking at zero. It scores the actual native output across regions, neighboring rows, both diagonals and surviving candidates. Word substitutions do little. Smaller module pitch exposes a consistent arrangement of native-letter points; three registered source offsets align them without helping the reader.</p><p>The words are <code>wee / RUM / if IT.</code> in three isolated clusters. They are distinguishable letters, but this is still a finder experiment, not a paragraph or a complete QR code. The ordinary reader receives only unchanged new pixels.</p></article><article><h2>Why correct coordinates are insufficient</h2><label for="case">Source offset </label><select id="case"><option value="0">+7 px</option><option value="1">+8 px</option><option value="2">+9 px</option></select><p id="location"></p><svg viewBox="0 0 400 200" role="img" aria-label="Diagram comparing nominal central region and surviving native candidate"><rect x="38" y="20" width="144" height="144" fill="none" stroke="#b3a8ca" stroke-width="2" stroke-dasharray="5 4"/><rect x="90" y="80" width="40" height="24" fill="#6150b8"/><text x="220" y="65" font-size="18" fill="#26233b">Nominal: 18 × 18 px</text><text x="220" y="105" font-size="18" fill="#6150b8">Selected: 5 × 3 px</text><text x="38" y="192" font-size="13" fill="#615b72">Post-probe diagram, not pixels given to a reader</text></svg><p>The surviving quad is only 5 pixels wide and 3 pixels high. Its computed size is 4.33, versus an intended central span of 18. None of the 27 layouts has a central row spanning at least 80% of its intended width.</p><div id="bars" class="bars"></div><small>Diagnostic components are 0–1. Their sum is an optimization score, not a probability of scanning.</small><h3>Actual scoring runs, top-left point</h3><div class="table-wrap"><table><thead><tr><th>Axis</th><th>Native word</th><th>Solid control</th></tr></thead><tbody id="runs"></tbody></table></div><p>Zeros mean missing runs in the measured scoring input. A native word texture can produce a matching triangle while these transitions remain incomplete. The passive logger returns exactly the same locations as the ordinary reader.</p></article><article><h2>What is preserved and checked</h2><ul><li>29 source proposals: 27 native images and two original source-packing rejections. Two revised packing versions are separate outcomes.</li><li>27 exact immediate repeats; four old-seed replays. Final read-only replay checks 35 PNG/RGBA pairs.</li><li>Four conventional full controls pass three profiles; four solid finder controls locate correctly. These control successes do not transfer to prose.</li><li>All 1,062 prior inventoried files, 40 saved executed-source hashes and three product downloads match unchanged.</li><li>Eight large-field Impact layouts fail the conservative ink-bounds overlap gate. Mechanical pass does not establish owner readability.</li></ul><p>The source optimizer’s end-of-line allowance caused two Monaco packing failures. Their exceptions and original sources survive. A verifier denominator error and its original executed source also survive; corrected replay includes the rejected proposals explicitly.</p><p>Earlier styled prose, uniform-black ASCII and configured-reader proofs remain separate. No new Samsung, print, Gmail or clipboard acceptance is claimed. PR #1 stays draft; npm stays private. Product, extension and other repositories are untouched.</p></article><article><h2>Where to go next</h2><p>Use the actual selected candidate’s horizontal, vertical and diagonal runs as the next native-letter objective. Require balanced spans and clear letters before spending on a full-QR sweep. Keep the three coordinate passes as a narrow result. They do not show that a phone can read a link.</p><p>This phase is sealed under a 3 MB logical-file cap. More native work belongs in a fresh bounded phase, preserving all prior evidence.</p></article><article><h2>Resume safely</h2><p>No scan review is needed for these finder-only layouts. The prompt below carries the scope and unresolved gates forward.</p><div class="actions"><button id="copy">Copy continuation prompt</button><button id="download">Download checkpoint</button></div><p id="copy-status" role="status"></p><textarea id="prompt" readonly aria-label="Continuation prompt">PROMPT</textarea><p><a href="README.md">Research report</a> · <a href="verification-final.json">Final verification</a> · <a href="analysis.json">Analysis</a> · <a href="score-audit-summary.json">Scoring audit</a> · <a href="custody.json">Custody</a></p><p><small>Code context: opened <a href="https://github.com/cozmo/jsQR/blob/master/src/locator/index.ts">jsQR locator</a> and <a href="https://github.com/cozmo/jsQR/blob/master/src/binarizer/index.ts">binarizer</a>. Measurements come from the exact locally installed bundle. This page runs offline; it sends no automatic requests.</small></p></article></main><script>
const data=DATA,checkpoint=CHECKPOINT;const fmt=a=>a.map(x=>Number(x.toFixed(2))).join(' · ');function render(){const n=Number(document.getElementById('case').value),r=data.placements[n],p=r.corners.topLeft;document.getElementById('location').textContent=`Ordinary top-left (${p.x}, ${p.y}); dimension ${r.corners.dimension}. Intended center (51, 51). Coordinate check: ${r.pass?'pass':'fail'}. Full finder structure: unresolved.`;const labels={agreement:'Region match',axisMean:'Continuity',stableFraction:'Stable rows',balancedFraction:'Quad balance'};document.getElementById('bars').innerHTML=Object.entries(r.components).map(([k,v])=>`<div class="bar"><span>${labels[k]}</span><span class="track"><span class="fill" style="display:block;width:${v*100}%"></span></span><span>${(v*100).toFixed(1)}%</span></div>`).join('');document.getElementById('runs').innerHTML=['horizontal','vertical','diagonalDown','diagonalUp'].map(k=>`<tr><th>${k}</th><td>${fmt(data.runs[n][k])}</td><td>${fmt(data.runs[3][k])}</td></tr>`).join('');}document.getElementById('case').onchange=render;render();document.getElementById('copy').onclick=async()=>{const p=document.getElementById('prompt'),s=document.getElementById('copy-status');try{await navigator.clipboard.writeText(p.value);s.textContent='Prompt copied.'}catch{p.focus();p.select();s.textContent='Prompt selected. Use your device’s Copy command.'}};document.getElementById('download').onclick=()=>{const u=URL.createObjectURL(new Blob([checkpoint],{type:'text/markdown;charset=utf-8'})),a=document.createElement('a');a.href=u;a.download='aqrobat-phase-08-checkpoint.md';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};
</script></html>'''
page=page.replace('PROMPT',html.escape(resume)).replace('DATA',json.dumps(data,ensure_ascii=True)).replace('CHECKPOINT',json.dumps(checkpoint,ensure_ascii=True))
write('index.html',page)
print('Report, analysis and checkpoint created')

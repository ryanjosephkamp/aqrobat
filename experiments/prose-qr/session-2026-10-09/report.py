from pathlib import Path
import json,hashlib,base64,gzip,html
from datetime import datetime,timezone
r=Path('docs/research/prose-qr/session-2026-10-09');base=Path('docs/research/prose-qr');sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
legacy={9:['words-02','fonts-02','glyphs-01','scale-01'],10:['run-01','dense-02'],11:['run-01'],12:['run-01']};phases=[]
for phase in range(9,32):
 p=base/f'phase-{phase:02d}';captures=[json.loads(f.read_text()) for f in p.glob('run-*/capture.json')];old=[json.loads(l) for b in legacy.get(phase,[]) for l in (p/b/'results.jsonl').read_text().splitlines()];rej=sum(v.get('legibility',{}).get('automaticRejected',False) for v in old)
 for f in p.glob('run-*/native-metrics.json'):rej+=json.loads(f.read_text()).get('automaticRejected',False)
 phases.append({'phase':phase,'completedNativeRenderings':len(captures)+len(old),'exactImmediateRepeats':sum(x.get('repeatExact') is True for x in captures+old),'partialNativeAttempts':int(phase in (9,10)),'mechanicalLegibilityRejectionsAmongCompleted':rej})
assert sum(v['completedNativeRenderings'] for v in phases)==96
profiles=[]
def j(p):return json.loads(Path(p).read_text())
for title,p14,p28,c14,c28 in [
 ('ZXing default','phase-14/run-01/native-zxing-default.json','phase-28/decode-01/zxing-default.json','phase-14/run-01/control-zxing-default.json','phase-28/run-01/control-zxing-default.json'),
 ('ZXing baseline (same engine)','phase-14/run-01/native-zxing-baseline.json','phase-28/decode-01/zxing-baseline.json','phase-14/run-01/control-zxing-baseline.json','phase-28/run-01/control-zxing-baseline.json'),
 ('jsQR','phase-14/run-01/native-jsqr.json','phase-28/decode-01/jsqr.json','phase-14/run-01/control-jsqr.json','phase-28/run-01/control-jsqr.json'),
 ('OpenCV default','phase-14/detector-01/native.json','phase-28/opencv-01/native-default.json','phase-14/detector-01/control.json','phase-28/opencv-01/control-default.json'),
 ('OpenCV ArUco','phase-15/alternate-01/phase14-native.json','phase-28/opencv-01/native-aruco.json','phase-15/alternate-01/control.json','phase-28/opencv-01/control-aruco.json'),
 ('ZBar default','phase-26/replay-02/native.json','phase-28/zbar-01/native.json','phase-26/replay-02/control.json','phase-28/zbar-01/control.json')]:
 paths=[str(base/p) for p in [p14,p28,c14,c28]];data=[j(p) for p in paths];profiles.append({'profile':title,'phase14Exact':data[0]['exact'],'phase28Exact':data[1]['exact'],'bothControlsExact':data[2]['exact'] and data[3]['exact'],'receipts':{p:sha(Path(p)) for p in paths}})
a=j(base/'phase-14/vision-01/results.json')['results'];b=j(base/'phase-28/vision-01/results.json')['results'];profiles.append({'profile':'macOS Vision default','phase14Exact':a[0]['exact'],'phase28Exact':b[0]['exact'],'bothControlsExact':a[1]['exact'] and b[1]['exact'],'receipts':{str(base/p):sha(base/p) for p in ['phase-14/vision-01/results.json','phase-28/vision-01/results.json']}})
assert sum(v['phase14Exact'] for v in profiles)==2 and not any(v['phase28Exact'] for v in profiles) and all(v['bothControlsExact'] for v in profiles)
result={'at':datetime.now(timezone.utc).isoformat(),'goal':'unsolved','phases':phases,'completedNativeRenderings':96,'exactImmediateRepeats':96,'partialNativeAttempts':2,'fullPayloadSources':2,'finderOnlyCompleted':94,'ordinaryNativeProfileChecks':14,'exactNativeProfileReturns':2,'successfulReaderImplementations':1,'ordinaryConventionalControlChecks':14,'exactConventionalControlReturns':14,'phoneTests':0,'phoneCandidates':0,'profiles':profiles,'priorPhoneEvidence':'Owner reports both Samsung scanners failed earlier full PNGs, exact case denominator/viewing conditions unspecified','gateDistinction':'Early jsQR native connected-run gate and later ZXing error-reporting sampled-symbol masks are separate diagnostics. Neither is a portable phone acceptance criterion.'}
with (r/'analysis.json').open('x') as f:json.dump(result,f,indent=2);f.write('\n')
readme='''# Prose QR session — October 9–10, 2026

The goal remains unsolved. This session produced one unchanged native regular-black
text layout that returns exactly https://example.com/ in ordinary ZXing default
and baseline. Those are the same implementation. jsQR, default OpenCV, ArUco,
macOS Vision and default ZBar fail the same PNG; conventional controls pass.
The second, whole-word full payload fails every ordinary profile. No new phone
or print tests, no successful phone candidate, no product or export changes.

Native text is real selectable browser text: regular Monaco 14 px/14 px, zero
tracking, black, justified ordinary spaces. The first source uses repetitive
capitalized words and isolated i tokens, not natural prose. A single text node
spans 257 rows / 3600 px on a 5040 px page. Source mechanical bounds pass and
native excerpts show individually readable letters, but full-document and owner
legibility acceptance remain untested. Fixed-font HTML/TXT is not portable paste.

The second source uses whole light words and 300 rows / 4200 px. It is also
legible by the mechanical gate but disconnected word material. Its failed
reader run follows a complete diagnostic sampled-finder result, demonstrating
that this gate does not transfer automatically into arbitrary surrounding text.

## Denominators and custody

Phases09–31 retain 96 completed native renderings, all with exact immediate
repeats: 94 finder-only and two full payloads. Two partial native attempts remain
separate (phase09 initial capture, phase10 reserve abort). Rejected source
proposals, unattempted slots, compilation errors, reader-wrapper and byte-buffer
errors remain recorded. These counts include mechanical legibility rejections;
they are not 96 acceptable prose examples. All 23 per-phase counts and 14 ordinary
native profile checks are in analysis.json. ZXing diagnostic error-reporting is
excluded from acceptance counts.

Read-only verification checks 137 retained PNG files: 116 have exact prior
RGBA receipt matches, 21 are newly observed RGBA hashes (display/diagnostic and
partial cases, not invented replay successes). 1,611 saved files and 546 executed
source references verify, including exact preserved versions. All 1,268 prior
phase04–08 inventory entries, phase09/14 milestone inventories and three product
download hashes remain unchanged. See verification.json, verification-inputs.json
and verification-pixels.json; final custody inventories added reporting separately.

## What the finder gates mean

Early phases use the full-resolution jsQR locator's actual selected runs,
connected quads and balanced spans. Those native stroke gates remain negative.
A source check found the bundled locator's second diagonal endpoint is not
normally a true negative diagonal; true geometric post-return rays are recorded
separately without altering the dependency or acceptance readers. See phase09/
RUN-DIRECTIONS.md. This is a local diagnostic observation, not an impossibility proof.

Later tests inspect the actual sampled matrix returned by the separate ZXing
error-reporting profile. Its gate requires 147/147 finder cells, twelve exact
horizontal/vertical/true-diagonal sequences and nominal corners/dimension. This
is a sampled-symbol diagnostic, not native continuous ink spans or ordinary
default payload recovery. Error reporting can affect search/termination, so it
is never treated as passive-equivalent acceptance. Source centers are not proof.

Phase27/pitch168 passes that sampled gate with whole-word source; native 14 px
excerpts were inspected. Phase28's single full payload still fails. Phase29/30
then preserve all three rendered finder regions byte-for-byte, yet their returned
geometry shifts and bottom-left sampled cells (2,20..22) fail, with only one exact
ray. Context changes reader behavior even when finder source pixels are identical.
Phase31 enlarges native source to 18 px/18 px and pitch216, but has no diagnostic
candidate. No further payload follows incomplete finder context.

## Separate lanes and remaining work

Visible black/gray meaningful prose (phases21/23/25) is a separate styled lane.
The uppercase phase25 source fails its conservative row-clearance gate. Prior
bold text, earlier configured-reader ASCII/TXT/HTML proofs and original phone
results are preserved separately. No hidden graphics, invisible letters, image
pixel repair, forced corners/extraction or tuned acceptance readers are used.

Next work should prioritize stable intended geometry in full native text context
and an ordinary reader outside ZXing, with actual directional/connected-run
measurements and clear letters, before more full payloads. Coherent prose,
copy/paste portability, independent exact payload recovery, phone and physical
print acceptance are still open. A fresh modest phase and explicit denominator
are required; this evidence collection is sealed at handback. PR #1 remains draft,
npm remains private/unpublished; no migration or new host is requested.
'''
(r/'README.md').write_text(readme)
for phase,txt in [(9,'''56 completed native finder layouts / 56 exact repeats, two source-width
rejections, one partial initial capture and 23 then-unattempted initial slots.
The corrected batch retains the same 24 labels plus later font/glyph/scale plans:
58 unique proposal labels, 82 scheduled slots across the original and corrected
batch, 59 attempted slots including rejections/partial. No complete native stroke
gate or payload. One font catalog screenshot is display inventory, not a proposal.
The source versions, initial missing-matrix exception and true-diagonal diagnostic
correction remain preserved. See PROGRESS.md and the session handback.'''),(10,'''Four native source proposals: three completed with exact immediate repeats,
one partial PNG after the file-reserve abort. Both dense18-leading sources fail
the row-clearance gate, including the partial. Two larger24-leading layouts also
fail structural recovery. The first three-versus-four-input detector denominator
assertion and its executed source survive; corrected replay is separate. A later
RGBA hash on the partial is first-observed, not a prior exact pair. See PROGRESS.md,
REPAIR-01.md and the session handback.''')]:
 (base/f'phase-{phase:02d}'/'README.md').write_text(f'# Phase {phase:02d} — preserved bounded outcomes\n\n'+txt+'\n\nNo phone candidate or new phone/print test. Goal remains unsolved.\n')
checkpoint='''# Prose QR checkpoint — October 9–10, 2026

Work only /Users/noir/Documents/aqrobat, branch codex/aqrobat-foundation,
existing OPEN draft PR #1. npm private:true and unpublished. No migration,
merge, new host, chat/agent, release/store submission or messages. Preserve every
phase/prototype/product/extension/download, Splashery, PDF archive, owner profile,
other task and running job. This collection's source-generation work is stopped;
no task-owned browser/decoder job remains at handback (verify process state).

Phase08 remains sealed unchanged. Phases09–31 retain 96 completed native
renderings and 96 exact immediate repeats, plus two partial attempts. 94 completed
outputs are finder-only, two contain full payloads. Counts include legibility
rejections; source rejects, aborts, unattempted slots and checker errors survive.

Phase14 returns exactly https://example.com/ on its unchanged native regular-black
Monaco14/14 PNG in ordinary ZXing default and baseline (one implementation).
jsQR, default OpenCV, ArUco, macOS Vision and default ZBar fail; controls pass.
Source has repetitive words and isolated i tokens, not coherent prose/portable
paste. Phase28's whole-word payload fails all ordinary profiles. No new phone
results; earlier both-Samsung-scanner full-PNG failures remain owner evidence.
Goal remains unsolved, no successful phone candidate.

Phase27/pitch168 whole-word source passes a complete ZXing error-reporting sampled
finder mask/ray/geometry gate. This is distinct from the earlier full-resolution
jsQR connected-stroke gate, which remains negative; diagnostics never establish
phone recovery. Phase29/30 retain identical raw finder-region pixels, but ordinary
returned geometry shifts and bottom-left cells (2,20..22) fail. Only one of its
four rays stays exact. Phase31 enlarges native letters to18/18 and pitch216,
without image resizing, and finds no diagnostic candidate. Do not extrapolate
from isolated finder or perfect source centers to payload recovery.

Verification checks 137 retained PNG files, 116 exact prior RGBA receipt matches
and21 newly observed hashes, 1,611 pre-handback saved-file hashes,546 source refs,
1,268 earlier custody inventory entries, prior milestones and three downloads.
Final receipts/custody include reporting additions separately. Product code is
unchanged since d932bcefeebfd19d85ec3339c3e7fc5086210341; current unit/format checks
and report browser validation are recorded. Do not present earlier product-browser
or native clipboard evidence as newly tested. Read HARNESS-NOTES.md for retained
errors and the phase16 manual-report erratum.

## Continuation prompt

Continue prose QR research only in /Users/noir/Documents/aqrobat. Read AGENTS.md,
docs/research/prose-qr/session-2026-10-09/CHECKPOINT.md, README.md, analysis.json,
verification-final.json, custody.json, HARNESS-NOTES.md and the referenced phase27–31
plans/results. Verify branch/remote/HEAD/dirty state, OPEN draft PR#1, exact saved
source and prior custody/download hashes before edits. Preserve all boundaries
above. No agents, chats, host, migration, merge, publish/release/store or messages.
Keep npm private and PRdraft. No new phone results; the goal remains unsolved.

Start a fresh modest phase with exclusive directories and explicit file cap;
do not rerun sealed scripts in their old output dirs. Prioritize a small
preregistered native-letter objective for stable intended geometry in full text
context, including actual selected H/V/both diagonal runs, balanced spans and
clear letters, and an ordinary reader outside ZXing. Keep full-resolution native
stroke gates separate from sampled-symbol diagnostics. Use geometry only for
source rendering and post-return diagnostics, never pixel repair, forced
corners/extraction or acceptance-reader tuning. No hidden modules, invisible
letters or unreadable raster compression as a solution. Keep styled, bold and
uniform-black ASCII lanes separate. Preserve every result/rejection/abort/error,
source version and exact denominator. No further full-QR sweep based merely on
isolated or diagnostic finder passes; back up milestones on this same branch.
Continue toward readable unchanged native text with independent ordinary exact
payload recovery, then phone acceptance. Do not claim completion at a time boundary.
'''
(r/'CHECKPOINT.md').write_text(checkpoint)
(r/'HARNESS-NOTES.md').write_text('''# Retained errors and source custody

- Phase09: initial missing-matrix TypeError after one PNG; 23 original slots then
  unattempted, corrected batch separate. Two WOW source-width rejections preserved.
  PLAN06's nine-versus-eight scored-axis wording is corrected in PROGRESS.md.
- Phase10: reserve abort leaves one partial native PNG; a probe executed but its
  artifact was unsaved, so it is not claimed as a successful saved replay. The
  first detector checker expected4 inputs but had3, before any decoder call.
- Phase10's first staged whitespace check flagged raw build stdout. The shell
  continued to the milestone commit; phase11 REPORTING-NOTES.md records this.
  Exact raw bytes stay; narrow per-file Git attributes allow later checks.
- Phase11: producer console says18 leading; actual source and native metadata
  correctly use19. Original console label is not an accepted source measurement.
- Phase14: first producer terminal-space DP exception precedes config/native
  output. Executed v1 source and error survive, corrected producer is separate.
- Phase16: original producer saved three configs then rejected the fourth width.
  The first capture actually succeeded. Two manually authored error receipts and
  a repair note incorrectly described this as first-proposal/missing-config
  failure. They remain unchanged and are explicitly superseded by ERRATA-01.md;
  they are not counted as real capture errors. Second producer invocation hits
  exclusive EEXIST; third builds only revised fourth config. Versioned sources
  and reconstructed, explicitly retrospective provenance survive.
- Phase25: a complete rendering fails row-clearance gate due the actual punctuation
  envelope. This is a legibility rejection, not a successful candidate.
- Phase26: plan's wrong control path corrected before execution, original retained.
  First replay wrapper rejects an eight-byte excess backing buffer before scanning;
  control unattempted. New replay copies identical verified RGBA into exact-length
  memory. No pixel or reader-option change. Upstream package/source/license kept.
- Phase28: native rendering and exact repeat complete;120MB stdout transport fails
  before native reader calls. Original source and abort survive. Fresh read-only
  decode transports the existing PNG with200MB capacity; no native rerender.
- Phase26 raw upstream README triggers staged whitespace check. Its original
  bytes remain; one explicit .gitattributes entry disables whitespace warnings
  only for that upstream file. The subsequent staged check passes before commit.

Python/Swift JSON results are preserved as .raw.gz before Prettier presentation
changes. Native PNGs and executed source hashes do not change. Verification and
custody distinguish current files, exact snapshots and decompressed original
bytes. No failed outcome was erased or relabeled as a scanner success.
''')
verification=j(r/'verification.json')
checks=''.join(f'<tr><th>{html.escape(v["profile"])}</th><td class="{"yes" if v["phase14Exact"] else "no"}">{"Exact URL" if v["phase14Exact"] else "No recovery"}</td><td class="no">No recovery</td><td>Exact URL</td></tr>' for v in profiles)
phaseRows=''.join(f'<tr><td>{v["phase"]:02d}</td><td>{v["completedNativeRenderings"]}</td><td>{v["exactImmediateRepeats"]}</td><td>{v["partialNativeAttempts"]}</td><td>{v["mechanicalLegibilityRejectionsAmongCompleted"]}</td></tr>' for v in phases)
def dataimage(p):return 'data:image/png;base64,'+base64.b64encode(Path(p).read_bytes()).decode()
excerpt=dataimage(base/'phase-27/legibility-01/bands.png')
htmlSource=base64.b64encode(gzip.decompress((base/'phase-14/run-01/native.html.gz').read_bytes())).decode()
txtSource=base64.b64encode((base/'phase-14/run-01/native.txt').read_bytes()).decode()
prompt=checkpoint.split('## Continuation prompt\n\n',1)[1]
page=f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>Prose QR · research checkpoint</title><style>
:root{{--bg:#101824;--panel:#1a2637;--ink:#edf1f7;--muted:#b6c3d5;--line:#3c4f65;--accent:#97caff;--yes:#a9e3b8;--no:#ffc2a1}}*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--ink);font:17px/1.6 system-ui,sans-serif}}main{{max-width:980px;margin:auto;padding:24px 18px 64px}}h1{{font:650 clamp(32px,6vw,52px)/1.1 system-ui;letter-spacing:-.03em;max-width:760px}}h2{{font-size:25px;line-height:1.25;margin-top:36px}}h3{{font-size:20px}}p{{max-width:76ch}}a{{color:var(--accent)}}.eyebrow,.muted{{color:var(--muted)}}.card{{background:var(--panel);border:1px solid var(--line);padding:18px;border-radius:18px;margin:20px 0}}.status{{display:inline-block;border:1px solid var(--line);padding:4px 12px;border-radius:999px}}.table-wrap,.excerpt{{overflow:auto;border:1px solid var(--line);border-radius:10px}}table{{width:100%;border-collapse:collapse;font-size:14px}}td,th{{text-align:left;border-bottom:1px solid var(--line);padding:10px;vertical-align:top}}th{{font-weight:600}}.yes{{color:var(--yes)}}.no{{color:var(--no)}}code{{overflow-wrap:anywhere}}button{{background:var(--accent);color:#132333;font:600 15px system-ui;border:0;border-radius:9px;padding:12px 16px;margin:8px 8px 8px 0;cursor:pointer}}textarea{{display:block;width:100%;min-height:350px;padding:14px;background:var(--bg);color:var(--ink);border:1px solid var(--line);border-radius:9px;font:14px/1.5 ui-monospace,monospace}}summary{{cursor:pointer;font-weight:650;padding:10px 0}}li{{margin:8px 0}}img{{display:block}}.small{{font-size:14px}}@media print{{:root{{--bg:white;--panel:white;--ink:black;--muted:#333;--line:#aaa;--accent:#163e70;--yes:#134b20;--no:#6a2510}}button,textarea{{display:none}}main{{max-width:none}}}}
</style></head><body><main><p class="eyebrow">AQROBAT RESEARCH · OCTOBER 9–10, 2026</p><span class="status">Goal remains unsolved</span><h1>Real progress in one reader.<br>Phone-ready prose is still open.</h1><p>One unchanged, unbolded native-text QR returns exactly <code>https://example.com/</code> in ZXing. The other tested readers fail that same image. This is a useful machine result, with clear limits.</p><div class="card"><strong>No new phone test is needed from you yet.</strong><p>Your earlier failures in both Samsung scanners remain our phone evidence. These experiments are research records, not a new grid of successful phone candidates. The product, extension and all three downloads are unchanged.</p></div>
<h2>What actually worked</h2><p>The browser renders real selectable letters in regular black Monaco, 14 pixels, with 14-pixel line spacing and no extra character tracking. The generator chooses ink-heavy words for dark regions and thin letters for light regions. There are no hidden QR squares or invisible letters.</p><p>The successful source has 257 lines across a 3600-pixel text field. It uses repetitive capitalized words and isolated <code>i</code> tokens. It is individually readable at native size, but it is not coherent prose or a portable copy-and-paste solution.</p><div class="table-wrap"><table><thead><tr><th>Ordinary reader/profile</th><th>Phase 14 · original words + i</th><th>Phase 28 · whole words</th><th>Conventional control, both runs</th></tr></thead><tbody>{checks}</tbody></table></div><p class="small muted">14 ordinary native profile checks across two saved payload images; two exact returns from one implementation. ZXing default and baseline are the same engine. All 14 corresponding conventional-control checks return the exact URL. Separate error-reporting diagnostics are excluded.</p>
<h2>Why an isolated finder pass was not enough</h2><p>The whole-word pitch-168 case passes all 147 sampled finder cells, twelve horizontal/vertical/diagonal sequences and the nominal geometry check in ZXing’s error-reporting diagnostic. Its full payload still fails every ordinary profile.</p><p>In a follow-up, all three rendered finder regions remain byte-for-byte identical. Adding surrounding native text changes the reader’s returned geometry anyway. Three bottom-left sampled cells become wrong, and only one of that finder’s four directional rays remains exact. Two simpler surrounding word banks reproduce the same result. A larger 18-pixel native rendering does not form a diagnostic candidate.</p><p>This narrows the problem to context-sensitive detection and sampling in these cases. It does not prove that prose QR is impossible.</p><details><summary>Read the native-letter excerpt</summary><p class="small">Whole-word phase 27, shown at its original pixel dimensions. Scroll sideways on a phone. This excerpt is for letter inspection only and is never a reader acceptance input. Source words are disconnected; owner legibility remains untested.</p><div class="excerpt"><img src="{excerpt}" width="720" height="200" alt="Native 14-pixel Monaco words BOOM, BOBBY, mammal, it, ill and lit with readable spaces and line gaps"></div></details>
<h2>What was checked and preserved</h2><ul><li>96 completed native renderings, each with an exact immediate repeat: 94 finder-only layouts and two full payloads. These include mechanical legibility rejections.</li><li>Two partial native attempts remain partial. Packing rejects, unattempted slots, aborts, reader-wrapper errors and executed source versions remain recorded.</li><li>All 137 retained PNG files replayed: 116 match earlier RGBA receipts; 21 get first-observed hashes, with no invented replay claim.</li><li>1,611 saved-file hashes and 546 source references verify. All 1,268 earlier inventory entries, prior milestone inventories and three product downloads verify unchanged.</li><li>18 unit tests pass. Product/browser/native clipboard/device results remain separate from these research checks.</li></ul><details><summary>Exact per-phase native denominator</summary><div class="table-wrap"><table><thead><tr><th>Phase</th><th>Completed</th><th>Exact repeats</th><th>Partial attempts</th><th>Mechanical rejects among completed</th></tr></thead><tbody>{phaseRows}</tbody></table></div><p class="small">Phase09 has 58 unique proposal labels and 82 scheduled slots including the original and corrected batch; 59 attempted slots include two source-width rejects and one partial. Its 23 initial unattempted slots are retained in the abort history. A later corrected batch does not erase that history. Phase16’s incorrect manual error reports are explicitly superseded by its preserved erratum.</p></details>
<h2>Keep the evidence lanes separate</h2><p>The earlier bold-text technique stays intact. The newer black/gray styled prose is another lane: its colors remain visible, and the uppercase case fails the line-clearance gate. Uniform-black text, styled text, sampled matrices, configured-reader proofs and phone observations are not interchangeable.</p><p>The early jsQR connected-stroke gate remains negative. Later ZXing sampled-symbol masks are a different diagnostic. Error reporting can change search behavior, so that profile is never treated as ordinary acceptance. Geometry is used only to render source text and inspect results after readers return.</p>
<h2>What remains</h2><ol><li>Stable intended finder geometry in full native text context, including actual directional runs and balanced spans.</li><li>Exact payload recovery in independent ordinary reader implementations on unchanged output.</li><li>Readable continuous prose, followed by owner phone acceptance and separate copy/paste and physical-print testing.</li></ol><p>The next phase should stay small and preregister its source objective and denominator. Three-column arrangements remain diagnostics; they should not become a product substitute for a readable paragraph. More full-QR grids are not justified by coordinate agreement alone.</p>
<details><summary>Inspect the machine-only source</summary><p>These downloads contain the phase-14 original text/HTML source, without images. Exact layout depends on the installed Monaco font and browser; other devices and paste destinations are unverified. The full saved PNG remains in the repository evidence. This is not a phone-candidate handoff.</p><button data-source="html">Download research HTML</button><button data-source="txt">Download research TXT</button><p class="small">Raw PNG SHA-256: <code>83b0c5a678293f9a1f73217e46cf9bc09f749c2c9b28c716748d988de195afd1</code></p></details>
<h2>Safe continuation</h2><p>The existing branch and draft PR are preserved. No project migration, new host, agent, publication or release has occurred. The checkpoint and source custody are saved in the repository.</p><button id="copy">Copy continuation prompt</button><button id="checkpoint">Download checkpoint</button><p id="copy-status" aria-live="polite" class="small muted">You can also select the text below.</p><textarea id="prompt" readonly spellcheck="false">{html.escape(prompt)}</textarea>
<details><summary>Reader provenance and source notes</summary><p class="small">Research-only <a href="https://github.com/undecaf/zbar-wasm">ZBar wrapper</a> version 0.11.0 is pinned by registry integrity. Its original LGPL license, runtime and corresponding named source archives are retained separately from Aqrobat’s product. <a href="https://raw.githubusercontent.com/undecaf/zbar-wasm/c04ab59682681e27a24b36b36084806437a5d224/Makefile">Pinned build source</a>. No product dependency was added.</p><p class="small">The pinned <a href="https://raw.githubusercontent.com/zxing-cpp/zxing-cpp/2ecec3f5be0ee803f6e14a5a2c7028c0cfe525b4/core/src/qrcode/QRReader.cpp">ZXing reader source</a> and retained options distinguish ordinary acceptance from error-reporting diagnostics. All local methodology, corrections and exact file references are in README.md, HARNESS-NOTES.md, analysis.json and the verification/custody receipts.</p></details><p class="small muted">Local self-contained handback. It performs no external requests and stores no test results. No new scan success is being claimed beyond the two ordinary ZXing returns above.</p></main><script>
const sources={{html:"{htmlSource}",txt:"{txtSource}"}},checkpoint={json.dumps(checkpoint)};
function save(name,bytes,type){{const blob=new Blob([bytes],{{type}}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}}
for(const b of document.querySelectorAll('[data-source]'))b.onclick=()=>{{const k=b.dataset.source,bytes=Uint8Array.from(atob(sources[k]),c=>c.charCodeAt(0));save('prose-qr-phase-14-research.'+k,bytes,k==='html'?'text/html;charset=utf-8':'text/plain;charset=utf-8')}};
document.querySelector('#checkpoint').onclick=()=>save('PROSE-QR-CHECKPOINT.md',checkpoint,'text/markdown;charset=utf-8');
document.querySelector('#copy').onclick=async()=>{{const t=document.querySelector('#prompt'),s=document.querySelector('#copy-status');try{{await navigator.clipboard.writeText(t.value);s.textContent='Prompt copied.'}}catch{{t.focus();t.select();s.textContent='Clipboard unavailable. The prompt is selected; use Copy.'}}}};
</script></body></html>'''
(r/'index.html').write_text(page)
print(json.dumps({'nativeComplete':96,'repeats':96,'partial':2,'profileChecks':14,'exactReturns':2,'htmlBytes':len(page.encode())}))

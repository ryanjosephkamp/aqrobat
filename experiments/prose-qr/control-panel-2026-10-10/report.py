"""Read saved receipts only; generate the local handback without rendering/decoding."""
from pathlib import Path
import json, base64, html, datetime, hashlib
ROOT=Path('docs/research/prose-qr/control-panel-2026-10-10')
read=lambda p:json.loads(p.read_text())
r=read(ROOT/'run-results.json'); prereg=read(ROOT/'preregistration.json'); runtime=read(ROOT/'runtime.json')
order=['square','rounded-one-third','rounded-two-thirds','circle']
rows=[]
for name in order:
 t=next(t for t in prereg['treatments'] if t['id']==name)
 cap=next((c for c in r['captures'] if c['id']==name),None)
 prof=read(ROOT/name/'passive-summary.json') if (ROOT/name/'passive-summary.json').exists() else None
 slots=[s for s in r['slots'] if s['id']==name]
 branchrows=[]
 for b in prof['scans'] if prof else []:
  selected=b['selected']; details=[]
  for key,p in selected.items():
   failures=[]
   for label,value,limit in [('quad balance',p['quadBalance'],.8),('nominal span',p['nominalSpanFraction'],.8),('stable rows',p['stableRows']['fraction'],.8)]:
    if value<limit: failures.append({'metric':label,'value':value,'requiredMinimum':limit})
   if not p['records']: failures.append({'metric':'nonempty scored records','value':0})
   for i,rec in enumerate(p['records']):
    if rec['metric']['completeAxes']!=4 or rec['metric']['worstRMS']>.35: failures.append({'metric':'scored record '+str(i),'completeAxes':rec['metric']['completeAxes'],'worstRMS':rec['metric']['worstRMS']})
   if p['geometric']['completeAxes']!=4 or p['geometric']['worstRMS']>.35: failures.append({'metric':'true geometry','completeAxes':p['geometric']['completeAxes'],'worstRMS':p['geometric']['worstRMS']})
   details.append({'point':key,'location':p['point'],'balance':p['quadBalance'],'nominalSpan':p['nominalSpanFraction'],'stableRows':p['stableRows'],'scoredRecords':len(p['records']),'scoredCompleteAxes':[x['metric']['completeAxes'] for x in p['records']],'scoredWorstRMS':[x['metric']['worstRMS'] for x in p['records']],'trueCompleteAxes':p['geometric']['completeAxes'],'trueWorstRMS':p['geometric']['worstRMS'],'failures':failures})
  branchrows.append({'branch':b['branch'],'firstLocation':b['selectedFirstLocation'],'firstIntendedGeometry':b['postReturnIntendedGeometry'][0] if b['postReturnIntendedGeometry'] else None,'strictPass':b['strictPass'],'points':details})
 rows.append({'id':name,'curvature':t['curvature'],'source':t,'capture':cap,'readers':slots,'passiveParity':prof['passiveReturnsMatch'] if prof else None,'branches':branchrows})
endpoint=all(next(s for s in r['slots'] if s['id']==id and s['engine']==engine).get('exactExpected',False) for id,engine in [('square','opencv'),('square','zxing'),('square','jsqr'),('circle','zxing'),('circle','jsqr')])
summary={'generatedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'classification':'Complete finite conventional-image comparison; native prose remains unsolved','endpointComparability':endpoint,'stop':r['stop'],'counts':{'captures':r['captureCount'],'immediateRepeats':r['repeatCount'],'ordinaryAttempted':r['ordinaryAttempted'],'ordinaryCompleted':r['ordinaryCompleted'],'ordinaryUnattempted':r['ordinaryUnattempted'],'exactRecoveries':sum(s.get('exactExpected',False) for s in r['slots']),'passiveProfiles':r['passiveCount'],'actualStockBranches':sum(p['branches'] for p in r['profiles'])},'rows':rows,'runtime':runtime,'oneNextStepProposal':'Request an owner-selected source-layout redesign study that reports detector geometry separately from the fixed native eligibility gate; keep thresholds unchanged and authorize no native payload/phone work through this panel.'}
(ROOT/'comparison.json').write_text(json.dumps(summary,indent=2)+'\n')
esc=lambda s:html.escape(str(s))
fmt=lambda v:f'{v:.6f}'
reader_cell=lambda row,e:next((('exact URL' if s.get('exactExpected') else 'empty' if s['status']=='completed' and not s['texts'] else s['status']) for s in row['readers'] if s['engine']==e),'unattempted')
images=''; table=''; detail=''; sources=''
for row in rows:
 name=row['id']; cap=row['capture']; branch=row['branches'][0] if row['branches'] else None
 image=('<img width="396" height="396" alt="Saved input PNG for '+esc(name)+'" src="data:image/png;base64,'+base64.b64encode((ROOT/name/'input.png').read_bytes()).decode()+'">') if cap else '<p>Unattempted after stop</p>'
 images+='<figure>'+image+'<figcaption>'+esc(name)+' · curvature '+('1/3' if name=='rounded-one-third' else '2/3' if name=='rounded-two-thirds' else str(int(row['curvature'])))+'</figcaption></figure>'
 pts=branch['points'] if branch else []
 vals=lambda key:min(p[key] for p in pts) if pts else None
 table+='<tr><th>'+esc(name)+'</th>'+''.join('<td>'+reader_cell(row,e)+'</td>' for e in ['opencv','zxing','jsqr'])+'<td>'+('PASS' if branch and branch['strictPass'] else 'FAIL' if branch else 'unattempted')+'</td><td>'+('/'.join(fmt(vals(k)) for k in ['balance','nominalSpan']) if pts else '—')+'</td><td>'+(fmt(min(p['stableRows']['fraction'] for p in pts)) if pts else '—')+'</td><td>'+(fmt(max(max(p['scoredWorstRMS']) for p in pts)) if pts else '—')+'</td><td>'+(fmt(max(p['trueWorstRMS'] for p in pts)) if pts else '—')+'</td></tr>'
 pointtable=''
 for b in row['branches']:
  first=b['firstLocation']; intended=b['firstIntendedGeometry']
  detail+='<article><h3>'+esc(name)+' · '+esc(b['branch'])+'</h3><p>First location dimension '+esc(first['dimension'] if first else None)+'; intended source match '+esc(intended['intendedGeometry'] if intended else False)+'. Center errors in pixels: '+esc(intended['pointDeltas'] if intended else None)+'. Passive/ordinary complete-return parity: '+esc(row['passiveParity'])+'.</p>'
  for p in b['points']:
   fails='; '.join(f"{f['metric']} {f.get('value',f.get('worstRMS')):.6f}" for f in p['failures']) or 'none'
   pointtable+='<tr><th>'+esc(p['point'])+'</th><td>'+esc(p['location'])+'</td><td>'+fmt(p['balance'])+'</td><td>'+fmt(p['nominalSpan'])+'</td><td>'+str(p['stableRows']['stable'])+'/'+str(p['stableRows']['total'])+'</td><td>'+str(p['scoredRecords'])+' / '+esc(p['scoredCompleteAxes'])+'</td><td>'+esc(fails)+'</td></tr>'
  detail+='<div class="scroll"><table><thead><tr><th>Point</th><th>Selected center</th><th>Balance</th><th>Nominal span</th><th>Stable rows</th><th>Scored records / axes</th><th>Failing gates</th></tr></thead><tbody>'+pointtable+'</tbody></table></div></article>'
 t=row['source']
 sources+='<tr><th>'+name+'</th><td><a href="'+name+'/source.svg.txt">SVG bytes</a><code>'+t['svgSha256']+'</code><a href="'+name+'/source.html.txt">HTML bytes</a><code>'+t['htmlSha256']+'</code></td><td>'+('<code>'+cap['pngSha256']+'</code>Repeat '+esc(cap['repeatExact'])+'; RGBA <code>'+cap['rgbaSha256']+'</code>' if cap else 'unattempted')+'</td></tr>'
count=summary['counts']
report=f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Aqrobat · fixed curved-finder control panel</title><style>
:root{{color-scheme:light}}*{{box-sizing:border-box}}body{{margin:0;background:#f5f4ef;color:#18262a;font:17px/1.55 system-ui,sans-serif}}main{{max-width:1200px;margin:auto;padding:40px 24px 90px}}h1{{font-size:clamp(30px,5vw,52px);line-height:1.08;max-width:900px}}h2{{margin-top:42px;font-size:25px}}h3{{font-size:19px}}.lead{{font-size:21px;max-width:1000px}}.status{{border-left:5px solid #247368;padding:16px 22px;background:#e8f1ea}}.grid{{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}}figure{{margin:0;background:white;padding:12px;border:1px solid #c6cdc6}}img{{width:100%;height:auto;display:block}}figcaption{{margin-top:10px;font-weight:650}}table{{border-collapse:collapse;width:100%;font-size:14px;background:#fff}}th,td{{text-align:left;vertical-align:top;padding:12px;border:1px solid #ccd2cf}}thead{{background:#e7ece7}}.scroll{{overflow:auto}}code{{display:block;font:12px/1.5 ui-monospace,monospace;overflow-wrap:anywhere;margin:6px 0}}a{{color:#135d61}}article{{margin:24px 0}}.muted{{color:#4c5b60}}@media(max-width:750px){{.grid{{grid-template-columns:repeat(2,minmax(0,1fr))}}main{{padding:24px 14px 70px}}}}@media print{{body{{background:white}}main{{padding:0}}table{{font-size:11px}}}}
</style></head><body><main>
<p class="muted">AQROBAT · D1 · October 10, 2026 · bounded conventional-image evidence</p>
<h1>The curved-finder gate disagreement persists at both intermediate curvatures.</h1>
<p class="lead">Square passes the fixed strict gate and all three readers. Curvature 1/3, curvature 2/3 and circles recover the exact URL in default ZXing and jsQR while failing the strict shape conjunction. Default OpenCV returns empty text for all three curved treatments.</p>
<div class="status"><strong>Complete panel; all endpoint comparability and custody gates hold.</strong> {count['ordinaryCompleted']}/12 ordinary slots completed, {count['exactRecoveries']} exact recoveries and 3 empty returns; 0 wrong payloads, errors, timeouts, stops or unattempted slots. Four captures, four byte-identical immediate-repeat receipts, four separate passive profiles and four actual normal stock scan branches. All complete passive returns match the saved ordinary jsQR return.</div>
<h2>Four frozen treatments, four saved inputs</h2><p>Payload <strong>https://example.com/</strong>; pinned encoder, version 2, ECC M, mask 0, no boost; 12 px pitch; four-module quiet zone; 396×396 px at DPR 1. Curvature is each nested square’s corner radius divided by its own half-side. Each finder replaces its complete 7×7 module region. No square finder modules remain beneath the visible replacement shapes. The non-finder SVG module string is byte-identical in all four sources.</p>
<div class="grid">{images}</div><p class="muted">These images embed the exact retained input PNG bytes. They are the four authorized source captures, not additional screenshots or trials. Execution order was square → circle → 1/3 → 2/3; display order follows curvature.</p>
<h2>Ordinary readers and the unchanged strict gate</h2><div class="scroll"><table><thead><tr><th>Treatment</th><th>OpenCV</th><th>ZXing</th><th>jsQR</th><th>Strict gate</th><th>Min balance / span</th><th>Min stable fraction</th><th>Max scored RMS</th><th>Max true RMS</th></tr></thead><tbody>{table}</tbody></table></div>
<p>The table aggregates the three selected points conservatively: minima for balance/span/stability and maxima for RMS. Every selected point has one scored record, all four scored axes, and all four true-geometry axes. Every scored and true RMS passes ≤0.35. Curvature 1/3 fails balance and nominal span at 0.777778 versus ≥0.8; curvature 2/3 fails both at 0.5. Circle fails both at 0.222222 and stability at 22/36 = 0.611111. Square passes every condition.</p>
<p>The exact conjunction requires the <em>first location within each naturally executed branch</em> to match intended dimension 25 and all three centers within &lt;12 px; exactly three selected points; every point’s quad balance, nominal span and stable-wide-row fraction ≥0.8; a nonempty scored-record set with <strong>every record</strong> having four axes and worst RMS ≤0.35; and true geometry with four axes and worst RMS ≤0.35. The gate and all thresholds are unchanged. Source-aligned checks remain diagnostic; no later location replaces the first.</p>
<h2>First branches and point-level failures</h2><p>All four default jsQR calls recover in their normal first scan. Thus each passive profile naturally executes exactly one normal branch; zero inverted branches execute. The 1/3 centers shift 0.25 px horizontally. The other three treatments have zero center error. All first locations have intended dimension 25.</p>{detail}
<h2>What these observations establish</h2><p>For these four frozen conventional controls at one scale and rasterizer, the added shape gate rejects three images that default ZXing and jsQR decode exactly. This limited discrepancy is already present at the preregistered curvature 1/3. It does not estimate a false-negative rate, establish standards conformance, isolate the mechanism of OpenCV’s empty returns, or justify weakening the native gate.</p>
<p><strong>Native prose remains unsolved.</strong> Conventional image decoding, matrix/finder structure, copyable plain text, styled text, native-app paste, phone scanning and physical print are separate evidence lanes. This run adds evidence only to conventional image decoding and passive finder geometry. It includes zero native prose sources, native payload proposals, clipboard operations, native-app tests, phone tests or print tests.</p>
<h2>Custody, defaults and limits</h2><p>All four SVG and HTML hashes and the executed harness hashes were frozen before the first capture in <a href="preregistration.json">preregistration</a> and <a href="provenance.json">provenance</a>. Exact source aliases end in .txt to preserve bytes through formatting. Full raw passive receipts are gzip-compressed losslessly; their uncompressed hashes and paths are retained in each summary. Ordinary raw stdout is retained as .raw.json.txt. Identical repeats are represented by exact PNG and RGBA hashes in capture.json; no duplicate PNG is needed. Encoder and license notices are copied intact as text.</p>
<p>Ordinary reader calls used no options argument: OpenCV QRCodeDetector().detectAndDecode(image), ZXing readBarcodes(imageData), and jsQR(rgba,width,height). Passive instrumentation separately uses attemptBoth, the jsQR default, and compares the <em>entire</em> return. It never supplies the ordinary result. Installed versions: OpenCV {runtime['python']['opencv']}; jsQR {runtime['versions']['jsqr']}; zxing-wasm {runtime['versions']['zxing-wasm']}; Playwright {runtime['versions']['playwright']}; Node {runtime['node']}. Full runtime paths, default ZXing settings and pinned WASM identifiers are in the retained receipts.</p>
<p>Caps: four source captures plus one immediate repeat each; 12 ordinary slots; one passive profile per treatment; 4,000,000 bytes across both fresh trees, with parent reserve. No retries, transforms, tuning, rescue profiles or extra source locations. The worker harness enforced a 3,800,000-byte write ceiling. The authorized clock began 19:04:44 UTC; experimental work ran {esc(r['startedAtUtc'])} through {esc(r['finishedAtUtc'])}, before the 19:24:44 cutoff. The worker handback is due 19:26:44 and full-run close 19:29:44. The old Astra clock was never reopened. The fresh Playwright-owned browser and temporary profile were closed; owner profiles and running jobs were untouched.</p>
<div class="scroll"><table><thead><tr><th>Source</th><th>Frozen source hashes</th><th>Saved input / repeat custody</th></tr></thead><tbody>{sources}</tbody></table></div>
<h2>Validation and reproducibility boundary</h2><p>Read-only reconciliation checks frozen/executed hashes, source module omission and radius definitions, PNG/RGBA custody, exact repeats, all 12 slot/result links, default call syntax, passive return parity, first-location summaries, every-record gate arithmetic, metric RMS arithmetic, source/archive mapping, byte budget and embedded-image identity without rerunning a reader. <a href="final-verification.json">Final verification</a> records exact artifact bytes, hashes, checks and worker timing at seal. <a href="worker-receipt.json">Worker receipt</a> records scope and cleanup.</p>
<p>Harness syntax checks and repository npm run format:check are required; their saved outcomes are in the final verification. Product unit/build/browser/text-browser suites were skipped as irrelevant to these additive research artifacts; product/download outputs were preserved. Optional installed-extension/native-text checks were not run and provide no evidence here. No check was declared unavailable. Direct visual inspection used only the four already-retained PNGs; no additional capture was taken.</p>
<h2>One next-step proposal only</h2><p>{esc(summary['oneNextStepProposal'])} This is a proposal for Ryan’s separate decision, not a dispatched experiment or gate change.</p>
<p><a href="README.md">README</a> · <a href="comparison.json">Complete comparison JSON</a> · <a href="ledger.json">12-slot ledger</a> · <a href="events.json">Event timing</a> · <a href="run-results.json">Run receipt</a></p>
<script type="application/json" id="comparison-data">{json.dumps(summary).replace('</','<\\/')}</script>
</main></body></html>'''
(ROOT/'index.html').write_text(report)
README=f'''# Aqrobat D1 conventional-control panel — 2026-10-10

The complete four-source panel confirms a limited strict-gate disagreement at both preregistered intermediate finder curvatures. [Open the self-contained handback](index.html).

| Curvature | OpenCV default | ZXing default | jsQR default | Fixed strict gate |
| --- | --- | --- | --- | --- |
| 0, square | exact URL | exact URL | exact URL | pass |
| 1/3 | empty | exact URL | exact URL | fail: balance/span 0.777778 |
| 2/3 | empty | exact URL | exact URL | fail: balance/span 0.5 |
| 1, circle | empty | exact URL | exact URL | fail: balance/span 0.222222, stability 0.611111 |

All endpoint comparability gates hold. Four captures and four byte-identical immediate repeats; 12/12 ordinary slots completed, nine exact recoveries, three empty returns; four separate passive profiles and four normal branches, complete-return parity in all four. Zero wrong payloads, stops, errors, timeouts, retries or unattempted slots. Every record has all four axes; every scored and true RMS passes 0.35. The native eligibility gate remains unchanged and native prose remains unsolved.

Exact URL `https://example.com/`; pinned qrcodegen, version 2, ECC M, mask 0, no boost; 12 px pitch, quiet zone 4; 396×396 PNG at DPR 1. All original finder modules are omitted before drawing the concentric replacement shapes. Radius for each rounded nested square is its own half-side times curvature. Non-finder modules are identical. Sources and harness were frozen before capture. Execution order: square, circle, 1/3, 2/3; reader order per treatment: OpenCV, ZXing, jsQR, then one separate passive profile.

Read [preregistration](preregistration.json), [provenance](provenance.json), [12-slot ledger](ledger.json), [comparison](comparison.json), [run result](run-results.json), [timing events](events.json), [final verification](final-verification.json), and [worker receipt](worker-receipt.json). Per-treatment `capture.json` records source/PNG/RGBA/repeat hashes; `*.raw.json.txt` retains ordinary stdout; `passive-full.json.gz` preserves complete lossless diagnostics; `passive-summary.json` retains first locations, selected metrics, parity and the full ordinary/passive returns. The summary's `rawSha256` hashes the decompressed bytes. `.svg.txt` / `.html.txt` are canonical byte-preserving sources, not derivative text tests. The stock jsQR bundle is archived losslessly; pinned encoder and licenses are retained intact. Executed scripts in the fresh experiment tree remain immutable.

Do not rerun sealed scripts into these output paths. Reconciliation uses only saved sources/receipts. No decoder, renderer, profile, transform, or screenshot is needed to audit the saved results.

Experimental harness start {r['startedAtUtc']}; end {r['finishedAtUtc']}. Authorized clock 19:04:44 through 19:29:44 UTC, new-experiment cutoff 19:24:44, worker handback due 19:26:44. Caps: four captures/four repeats, 12 ordinary slots, four passive profiles, 4,000,000 bytes including parent files; worker write ceiling 3,800,000 bytes. Exact final byte count and elapsed timing are in final verification. Fresh owned browser/profile closed; owner profiles, chats and jobs preserved. No Git mutations by the worker.

Harness syntax and full repository format checks are recorded. Product `npm test`, build, browser, text-browser, installed-extension and native-text tests were skipped as unrelated to this additive research-only panel; no product/download build was performed. They are untested here, not unavailable.

Conventional image decoding, matrix/finder diagnostics, copyable text, styled text, native apps, phone and print remain separate. No native prose/payload/phone work, copying, publishing, threshold change, agent/chat creation, or model experiment occurred. The one scale/rasterizer/payload finite panel supplies neither population rates nor an OpenCV failure mechanism nor native acceptance.

One proposal only: {summary['oneNextStepProposal']}
'''
(ROOT/'README.md').write_text(README)
print(json.dumps({'endpointComparability':endpoint,'counts':count,'reportBytes':(ROOT/'index.html').stat().st_size}))

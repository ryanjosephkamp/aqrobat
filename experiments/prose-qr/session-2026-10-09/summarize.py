import json,hashlib
from pathlib import Path
root=Path('docs/research/prose-qr')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
notes={
18:'Four source translations preserve word bytes. Best whole-word case (Monaco dx6) has 146/147 sampled finder cells and twelve exact rays; incomplete gate, no payload.',
19:'Two full text-field finder-only contexts, with and without structural locator aids. No encoded data or format. Both fail complete finder gate. Default OpenCV replay: 12 native inputs, zero intended geometry, one conventional control exact.',
20:'Three fixed-source tracking/leading rhythms. No complete finder gate. Positive tracking is source spacing, not raster compression.',
21:'Two visible black/gray meaningful-source layouts, separate styled lane. Native mechanical gates pass; no diagnostic finder candidates. Source color compilation occurred before image/readers; provisional and compiled HTML retained.',
22:'Two Impact 20/19 tight native-row layouts. Mechanical gates pass. Isolated-i source gives one wrong cell per finder; whole-word source gives no diagnostic symbol. No payload.',
23:'Two tighter visible black/gray meaningful-source layouts. Impact returns five wrong cells per finder with only horizontal runs exact; Arial Black no symbol. Mechanical gates pass; styled lane separate.',
24:'One combined dx6dy6 fixed-source translation. Nominal diagnostic symbol but 3/3/2 wrong finder cells, incomplete directional runs. No payload.',
25:'One globally uppercase visible black/gray Impact source. Native rendering and repeat complete, but punctuation descender envelope fails conservative row-clearance gate. No diagnostic symbol. Legibility rejection retained, no payload.',
27:'Two row/advance-aligned pitches. Pitch140 gives no diagnostic symbol. Pitch168 passes all147 cells, twelve directional sequences and nominal geometry. Native14 excerpts read clearly to agent, repetitive words; owner untested. This justified only the one phase28 confirmation, not phone/prose acceptance.',
28:'One whole-word full payload confirmation after phase27 gate. Native PNG and repeat complete, but 120MB stdout transport aborted before native reader calls. Fresh read-only decode01 corrects byte capacity without rerendering. All seven ordinary native calls fail (ZXing2, jsQR, default OpenCV, ArUco, Vision, ZBar); controls exact. Diagnostic129/153 symbols incidental, no intended QR recovery.',
29:'One source-preserved finder context. All three rendered finder regions are byte-identical to phase27, verified post-probe. Diagnostic nominal25 mask has three wrong bottom-left cells (2,20..22); only one of its four rays exact. No payload.',
30:'Two outside-context lexicons, ill then it. Original finder source regions and raw pixels unchanged. Both retain same three bottom-left errors as mixed context, incomplete gate. No payload.',
31:'One larger native source rendering of the phase29 context, 18/18 Monaco, pitch216; not a resized image. See measured gate and actual sampled-symbol outcomes below.'
}
for n,note in notes.items():
 phase=root/f'phase-{n:02d}';captures=sorted(phase.glob('run-*/capture.json'))
 if not captures:continue
 rows=[]
 for p in captures:
  d=p.parent;capture=json.loads(p.read_text());metrics=json.loads((d/'native-metrics.json').read_text());config=json.loads((phase/(d.name+'.json')).read_text())['specs'][0]
  diag=d/'native-zxing-errors-diagnostic.json'
  if n==28:diag=phase/'decode-01/zxing-errors-diagnostic.json'
  j=json.loads(diag.read_text()) if diag.exists() else {}
  rows.append({'run':d.name,'payload':config.get('payload'),'font':config['font'],'size':config['size'],'leading':config['leading'],'unit':config['unit'],'nativePngSha256':capture['pngSha256'],'repeatExact':capture['repeatExact'],'nativeLegibilityRejected':metrics.get('automaticRejected',False),'legibilityReasons':metrics.get('reasons',[]),'nativeClearance':metrics.get('clearance'),'sampledDiagnostics':[{'width':v.get('width'),'height':v.get('height'),'position':v.get('position'),'error':v.get('error'),'finderAudit':v.get('finderAudit')} for v in j.get('results',[])],'sources':{str(p):sha(p),str(d/'native-metrics.json'):sha(d/'native-metrics.json'),str(diag):sha(diag)} if diag.exists() else {str(p):sha(p)}})
 result={'phase':n,'nativeRenderings':len(rows),'exactImmediateRepeats':sum(r['repeatExact'] for r in rows),'mechanicalLegibilityRejections':sum(r['nativeLegibilityRejected'] for r in rows),'completeFinderGates':sum(any(s.get('finderAudit',{}).get('complete') for s in r['sampledDiagnostics']) for r in rows),'phoneTests':0,'phoneCandidates':0,'goal':'unsolved','note':note,'results':rows}
 with (phase/'analysis.json').open('x') as f:json.dump(result,f,indent=2);f.write('\n')
 if n!=26:
  with (phase/'README.md').open('x') as f:
   f.write(f'# Phase {n:02d} — bounded native evidence\n\n{note}\n\n')
   f.write(f'{len(rows)} native rendering(s), {result["exactImmediateRepeats"]} exact immediate repeat(s), {result["mechanicalLegibilityRejections"]} mechanical legibility rejection(s), {result["completeFinderGates"]} complete sampled finder gate(s). Detailed rays, geometry, source hashes and all outcomes are retained in analysis.json and the run directories. Mechanical passing is not owner acceptance.\n\n')
   f.write('No new phone or print tests. The prose goal remains unsolved. Source geometry reaches only rendering and post-return diagnostics; acceptance PNGs remain unchanged. No additional native generation in this phase without a fresh plan/output directory and file-budget check.\n')

"""Reconcile every frozen slot, native capture, reader receipt and owner acceptance."""
from pathlib import Path
from datetime import datetime,timezone
import json,hashlib,collections
base=Path('docs/research/prose-qr/paste-prose-2026-10-11');src=Path('experiments/prose-qr/paste-prose-2026-10-11')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
readings={};reader_rows=[]
for p in sorted(base.glob('read-*/results.json')):
 d=json.loads(p.read_text())
 for row in d['rows']:
  image=Path(row['path']);assert sha(image)==row['pngSha256'];assert row['path'] not in readings
  assert len(row['readings'])==4 and all(r['status']==0 and r['error'] is None for r in row['readings'])
  assert all(all(t==row['payload'] for t in (r['texts'] or [])) for r in row['readings'])
  row={**row,'receipt':str(p.relative_to(base))};readings[row['path']]=row;reader_rows.append(row)
cases=[];batches=[]
for p in sorted(base.glob('corpus-*/manifest.json')):
 d=json.loads(p.read_text());bid=p.parent.name;result=p.parent/'results.json';rows=json.loads(result.read_text())['rows'] if result.exists() else []
 count=0;reject=0
 for row in rows:
  if not row['captured']:reject+=1;continue
  image=p.parent/(row['id']+'.png');r=readings[str(image)];assert row['pngSha256']==r['pngSha256'] and row['repeatExact']
  cases.append({'id':bid+'/'+row['id'],'label':row['id'],'batch':bid,'lane':'browser prose','image':str(image.relative_to(base)),'sha256':r['pngSha256'],'repeatExact':True,'summary':row['summary'],'payload':row['payload'],'readings':r['readings'],'receipt':r['receipt'],'nativePhoneAcceptance':None});count+=1
 batches.append({'id':bid,'plannedCandidateSlots':d['plannedCaptureSlots'],'captures':count,'rejectedBeforeCapture':reject,'unattempted':d['plannedCaptureSlots']-count-reject,'plannedControls':d['plannedControls'],'stopReceipt':str((p.parent/'STOP.json').relative_to(base)) if (p.parent/'STOP.json').exists() else None})
for p in sorted(base.glob('word-*/PLAN.json')):
 d=json.loads(p.read_text());ident=p.parent.name;capture=p.parent/'pdf-96'/'capture.json';planned=d.get('plannedNativePasteTrials',d.get('nativePasteTrials',0));completed=ident!='word-03'
 if capture.exists():
  c=json.loads(capture.read_text());image=p.parent/'pdf-96/native.png';r=readings[str(image)];assert c['pngSha256']==r['pngSha256'] and c['repeatExact'];layout=json.loads((p.parent/'layout.json').read_text());inspection=json.loads((p.parent/'docx-inspection.json').read_text());styles=json.loads((p.parent/'glyph-style-inspection.json').read_text());assert inspection.get('wholeWordSequenceExact',inspection.get('wordSequenceExact',inspection.get('wordsExact'))) and styles['glyphColorsExact']
  owner=ident if ident in ['word-01','word-06','word-09'] else None
  cases.append({'id':ident,'label':ident,'batch':ident,'lane':'native Word PDF','image':str(image.relative_to(base)),'sha256':r['pngSha256'],'repeatExact':True,'summary':layout['summary'],'payload':r['payload'],'readings':r['readings'],'receipt':r['receipt'],'tables':inspection.get('tables',inspection.get('tableCount')),'paperPoints':c['paperPoints'],'nativePaste':bool(planned),'nativeSourceAndGlyphColorsExact':True,'nativePhoneAcceptance':owner,'docx':ident+'/'+ident+'.docx','pdf':ident+'/'+ident+'.pdf'})
 batches.append({'id':ident,'plannedCandidateSlots':1,'captures':int(capture.exists()),'rejectedBeforeCapture':0,'guardStopped':int(ident=='word-10'),'unattempted':int(ident=='word-03'),'plannedNativePasteTrials':planned,'nativePasteTrialsCompleted':planned if completed else 0})
for n in range(1,7):
 bid=f'studio-check-{n:02d}';capture=base/bid/'capture.json';config=json.loads((src/('studio-test.json' if n==1 else f'studio-test-{n:02d}.json')).read_text());planned=config['candidateCaptureSlots']
 if capture.exists():
  c=json.loads(capture.read_text());image=base/bid/'native.png';r=readings[str(image)];assert c['pngSha256']==r['pngSha256'] and c['repeatExact'];layout=json.loads((base/'word-08/layout.json').read_text());layout['summary']['pageCssPixels']=792 if n==3 else 840
  cases.append({'id':bid,'label':bid+' default','batch':bid,'lane':'studio native preview','image':str(image.relative_to(base)),'sha256':r['pngSha256'],'repeatExact':True,'summary':layout['summary'],'payload':r['payload'],'readings':r['readings'],'receipt':r['receipt'],'nativePhoneAcceptance':None})
 batches.append({'id':bid,'plannedCandidateSlots':planned,'captures':int(capture.exists()),'rejectedBeforeCapture':0,'unattempted':planned-int(capture.exists()),'guardStopped':0,'controlChecksPassed':len(json.loads((base/bid/'results.json').read_text())['checks']) if (base/bid/'results.json').exists() else None,'stopReceipt':bid+'/STOP.json' if (base/bid/'STOP.json').exists() else None})
controls=[r for r in reader_rows if '/corpus-01/control-' in r['path']]
assert len(cases)==51 and len(controls)==2 and len(reader_rows)==53
assert len({r['pngSha256'] for r in reader_rows})==53
for row in controls:
 p=Path(row['path']);repeat=p.with_name(p.stem+'-repeat.png');assert p.read_bytes()==repeat.read_bytes()
assert all(all(r['exact'] for r in row['readings']) for row in controls)
counts={e:{'exact':sum(any(r['engine']==e and r['exact'] for r in c['readings']) for c in cases),'total':len(cases)} for e in ['zxing','jsqr','opencv','vision']}
plan=sum(x['plannedCandidateSlots'] for x in batches);captured=sum(x['captures'] for x in batches);rejected=sum(x.get('rejectedBeforeCapture',0) for x in batches);unattempted=sum(x.get('unattempted',0) for x in batches);guard=sum(x.get('guardStopped',0) for x in batches)
assert (plan,captured,rejected,unattempted,guard)==(83,51,3,28,1)
assert plan==captured+rejected+unattempted+guard
assert sum(x.get('nativePasteTrialsCompleted',0) for x in batches)==11
owner=[]
for p in sorted(base.glob('OWNER-*ACCEPTANCE.json')):owner.append({'path':p.name,**json.loads(p.read_text())})
record={'at':datetime.now(timezone.utc).isoformat(),'counting':'Planned slots include harness stops and unattempted work; immediate repeats are not new candidates. All53 native images are byte-distinct. Controls are separate.','plannedCandidateSlots':plan,'candidateCaptures':captured,'rejectedBeforeCapture':rejected,'unattemptedCandidateSlots':unattempted,'nativePaperGuardStops':guard,'unusedCandidateCapSlots':96-plan,'conventionalControls':2,'exactImmediateRepeatPairs':53,'primaryOrdinaryResearchReaderCalls':sum(len(r['readings']) for r in reader_rows),'productRegressionReaderCallMaximum':39,'maximumTotalOrdinaryReaderCalls':251,'nativePasteTrialsCompleted':11,'nativePasteTrialsUnattempted':1,'nativeReopenTrials':1,'resourceCaptures':{'savedCanonicalQaPages':6,'savedStudioUiPages':2,'transcriptOnlyNativeDialogScreenshots':3,'finalGuideCapture':1,'totalIncludingFinalGuide':12},'candidateReaderSuccess':counts,'fullSoftwarePromotions':0,'wrongReturnedPayloads':0,'fontSourceStyleOrRepeatFailures':0,'batches':batches,'cases':cases,'controls':controls,'ownerAcceptances':owner,'untested':['Google Docs actual paste','Browser Copy button through native browser clipboard into Word','Physical print','Other phone hardware','Uniform unformatted plaintext scanning','Missing-font recipient behavior beyond local generation rejection'],'caps':json.loads((base/'START.json').read_text())['caps']}
(base/'LEDGER.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps({k:record[k] for k in ['plannedCandidateSlots','candidateCaptures','rejectedBeforeCapture','unattemptedCandidateSlots','primaryOrdinaryResearchReaderCalls','candidateReaderSuccess','fullSoftwarePromotions']}))

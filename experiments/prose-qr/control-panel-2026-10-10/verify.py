"""Audit saved evidence only. Image loading for RGBA/pixel custody is not a QR reader call."""
from pathlib import Path
import json, hashlib, gzip, math, re, base64, subprocess, datetime, xml.etree.ElementTree as ET
import cv2
ROOT=Path('docs/research/prose-qr/control-panel-2026-10-10'); SRC=Path('experiments/prose-qr/control-panel-2026-10-10')
read=lambda p:json.loads(p.read_text()); sha=lambda b:hashlib.sha256(b).hexdigest()
checks=[]
def check(name,ok,detail=None):
 checks.append({'name':name,'passed':bool(ok),'detail':detail})
 if not ok: raise AssertionError(name+': '+str(detail))
run=read(ROOT/'run-results.json'); prereg=read(ROOT/'preregistration.json'); prov=read(ROOT/'provenance.json'); comp=read(ROOT/'comparison.json'); ledger=read(ROOT/'ledger.json')
check('checkout baseline',subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()==prereg['baselineHead'])
check('checkout branch',subprocess.check_output(['git','branch','--show-current'],text=True).strip()=='codex/aqrobat-foundation')
check('remote',subprocess.check_output(['git','remote','get-url','origin'],text=True).strip()=='https://github.com/ryanjosephkamp/aqrobat.git')
check('tracked tree unchanged',subprocess.run(['git','diff','--quiet']).returncode==0 and subprocess.run(['git','diff','--cached','--quiet']).returncode==0)
status=subprocess.check_output(['git','status','--porcelain'],text=True).splitlines()
check('new paths limited to authorized trees',all(s.startswith('?? '+str(ROOT)+'/') or s.startswith('?? '+str(SRC)+'/') for s in status),status)
for p,h in prov['executedSources'].items(): check('frozen executed script '+p,sha(Path(p).read_bytes())==h)
for p,h in prov['originals'].items(): check('original/reference provenance '+p,sha(Path(p).read_bytes())==h)
for receipt in ['report-script-source.json','verification-script-source.json']:
 x=read(ROOT/receipt);check('additive post-run script frozen '+x['path'],sha(Path(x['path']).read_bytes())==x['sha256'])
for x in read(ROOT/'source-receipt-aliases.json'):
 check('original receipt alias '+x['path'],sha(Path(x['executedBytesSnapshot']).read_bytes())==x['sha256'])
 check('formatted receipt retains semantics '+x['path'],read(Path(x['path']))==read(Path(x['executedBytesSnapshot'])))
check('encoder/license snapshots exact',all((ROOT/(Path(p).name+'.txt')).read_bytes()==Path(p).read_bytes() for p in ['vendor/qrcodegen.mjs','NOTICE.md','LICENSE']))
jsqr=next(p for p in prov['originals'] if p.endswith('/jsQR.js'))
check('stock jsQR source archive exact',gzip.decompress((ROOT/'jsqr-stock-source.js.gz').read_bytes())==Path(jsqr).read_bytes())
check('stock jsQR default is attemptBoth',bool(re.search(r'var defaultOptions =\s*{\s*inversionAttempts: "attemptBoth"',Path(jsqr).read_text())))
check('payload hash',sha(prereg['payload'].encode())==prereg['payloadSha256'] and prereg['payload']=='https://example.com/')
check('matrix hash',sha(json.dumps(prereg['matrix'],separators=(',',':')).lower().encode())==prereg['matrixSha256'])
check('slot ledger fixed and reconciled',len(ledger['slots'])==12 and ledger['slots']==run['slots'] and len({(s['id'],s['engine']) for s in run['slots']})==12)
check('counts within caps and complete',run['captureCount']==4 and run['repeatCount']==4 and run['passiveCount']==4 and run['ordinaryAttempted']==12 and run['ordinaryCompleted']==12 and run['ordinaryUnattempted']==0)
check('no stops/errors/timeouts/wrong payloads',run['stop'] is None and all(s['status']=='completed' and not s['unexpectedText'] for s in run['slots']))
check('endpoint comparison',comp['endpointComparability'] and all(next(s for s in run['slots'] if s['id']==id and s['engine']==e)['exactExpected'] for id,e in [('square','opencv'),('square','zxing'),('square','jsqr'),('circle','zxing'),('circle','jsqr')]))
check('ordinary default syntax', 'await readBarcodes(image)' in (SRC/'reader.mjs').read_text() and 'jsQR(image.data, width, height)' in (SRC/'reader.mjs').read_text() and 'QRCodeDetector().detectAndDecode(image)' in (SRC/'ordinary.py').read_text())
check('old OpenCV script copied exactly',(SRC/'ordinary.py').read_bytes()==Path('experiments/prose-qr/context-letter-counters/ordinary.py').read_bytes())
check('old strict conjunction copied exactly',(SRC/'common.mjs').read_text().split('export const strict = ')[1].strip()==Path('experiments/prose-qr/astra-2026-10-10/common.mjs').read_text().split('export const strict = ')[1].split('export function checkTime')[0].strip())
metrics=0; axes=0; pointrecords=0; profiles=0; branches=0
baseline_pixels=None; common_tags=None
for t in prereg['treatments']:
 name=t['id'];cap=read(ROOT/name/'capture.json')
 check('source SVG frozen '+name,sha(Path(t['svgPath']).read_bytes())==t['svgSha256'])
 check('source HTML frozen '+name,sha(Path(t['htmlPath']).read_bytes())==t['htmlSha256'])
 svg=Path(t['svgPath']).read_text();html=Path(t['htmlPath']).read_text();check('HTML embeds exact SVG '+name,svg in html)
 tags=re.findall(r'<(?:rect|circle)\b[^>]*/>',svg); shared=tags[1:1+prereg['nonFinderDarkModules']];shapes=tags[1+prereg['nonFinderDarkModules']:]
 check('non-finder module string hash '+name,sha(''.join(shared).encode())==t['nonFinderModulesSha256'])
 if common_tags is None:common_tags=shared
 check('non-finder SVG modules identical '+name,shared==common_tags)
 expected=[]
 for y,row in enumerate(prereg['matrix']):
  for x,bit in enumerate(row):
   if bit and not ((x<7 and y<7) or (x>=18 and y<7) or (x<7 and y>=18)):expected.append(f'<rect x="{x+4}" y="{y+4}" width="1" height="1"/>')
 check('all finder modules omitted; all other matrix modules preserved '+name,shared==expected and len(shapes)==9)
 for i,tag in enumerate(shapes):
  el=ET.fromstring(tag);a=el.attrib;half=[3.5,2.5,1.5][i%3];cx,cy=[(7.5,7.5),(25.5,7.5),(7.5,25.5)][i//3]
  check('visible nested shape '+name+'/'+str(i),a['fill']==['black','white','black'][i%3])
  if name=='circle':check('circle radius '+str(i),el.tag=='circle' and float(a['r'])==half and float(a['cx'])==cx and float(a['cy'])==cy)
  else:check('rounded radius and bounds '+name+'/'+str(i),el.tag=='rect' and float(a['width'])==2*half and float(a['height'])==2*half and float(a['x'])==cx-half and float(a['y'])==cy-half and math.isclose(float(a['rx']),half*t['curvature'],abs_tol=1e-14) and a['rx']==a['ry'])
 check('capture input hash '+name,sha(Path(cap['pngPath']).read_bytes())==cap['pngSha256'])
 image=cv2.imread(cap['pngPath']);rgba=cv2.cvtColor(image,cv2.COLOR_BGR2RGBA)
 check('saved input dimensions and RGBA hash '+name,rgba.shape==(396,396,4) and sha(rgba.tobytes())==cap['rgbaSha256'])
 check('immediate PNG/RGBA repeat hashes '+name,cap['repeatExact'] and cap['repeatSha256']==cap['pngSha256'] and cap['repeatRgbaSha256']==cap['rgbaSha256'])
 masked=rgba.copy();masked[48:132,48:132]=255;masked[48:132,264:348]=255;masked[264:348,48:132]=255
 if baseline_pixels is None:baseline_pixels=masked.tobytes()
 check('all rendered pixels outside finder regions identical '+name,masked.tobytes()==baseline_pixels)
 for slot in [s for s in run['slots'] if s['id']==name]:
  raw=Path(slot['rawPath']).read_bytes();result=json.loads(raw)
  check('raw slot mapping '+name+'/'+slot['engine'],sha(raw)==slot['rawSha256'] and result['pngSha256']==cap['pngSha256'])
  texts=([result['text']] if result['text'] else []) if slot['engine']=='opencv' else result['texts']
  check('raw ordinary return '+name+'/'+slot['engine'],texts==slot['texts'])
  if slot['engine']!='opencv':check('ordinary options omitted and RGBA same '+name+'/'+slot['engine'],result['optionsArgumentOmitted'] and result['rgbaSha256']==cap['rgbaSha256'])
 prof=read(ROOT/name/'passive-summary.json');fullraw=gzip.decompress(Path(prof['rawCompressedPath']).read_bytes());full=json.loads(fullraw)
 check('full raw passive archive '+name,sha(fullraw)==prof['rawSha256'])
 check('passive complete return equals stock '+name,full['passiveReturnsMatch'] and full['returnedFull']==full['ordinaryBaseline']==read(ROOT/name/'jsqr.raw.json.txt')['result'])
 check('passive input unchanged '+name,full['pngSha256']==cap['pngSha256'] and full['rgbaSha256']==cap['rgbaSha256'])
 profiles+=1;branches+=len(full['scans'])
 for si,s in enumerate(full['scans']):
  summarized={k:v for k,v in s.items() if k not in ['allScoredRuns','allQuads']};summarized['scoredRuns']=len(s['allScoredRuns']);summarized['quads']=len(s['allQuads'])
  check('full first-location summary mapping '+name+'/'+str(si),summarized==prof['scans'][si] and s['selectedFirstLocation']==(s['locations'][0] if s['locations'] else None))
  for point in s['selected'].values():
   pointrecords+=len(point['records'])
   for m in [point['geometric']]+[rec['metric'] for rec in point['records']]:
    metrics+=1;rms=[];complete=0
    for axis,a in m['axes'].items():
     axes+=1;scale=sum(a['runs'])/7;expected=math.sqrt(sum((x/scale-target)**2 for x,target in zip(a['runs'],[1,1,3,1,1]))/5) if scale>0 else None
     check('metric axis arithmetic '+name+'/'+str(metrics)+'/'+axis,math.isclose(a['scale'],scale,abs_tol=1e-12) and math.isclose(a['normalizedRMS'],expected,abs_tol=1e-12))
     iscomplete=len(a['runs'])==5 and all(x>0 for x in a['runs']);check('complete-axis condition '+name+'/'+str(metrics)+'/'+axis,a['complete']==iscomplete);complete+=iscomplete;rms.append(expected)
    check('metric worst RMS arithmetic '+name+'/'+str(metrics),m['completeAxes']==complete and math.isclose(m['worstRMS'],max(rms),abs_tol=1e-12))
  strict=bool(s['postReturnIntendedGeometry'] and s['postReturnIntendedGeometry'][0]['intendedGeometry']) and len(s['selected'])==3 and all(p['quadBalance']>=.8 and p['nominalSpanFraction']>=.8 and p['stableRows']['fraction']>=.8 and p['records'] and all(rec['metric']['completeAxes']==4 and rec['metric']['worstRMS']<=.35 for rec in p['records']) and p['geometric']['completeAxes']==4 and p['geometric']['worstRMS']<=.35 for p in s['selected'].values())
  check('every-record strict conjunction '+name+'/'+str(si),s['strictPass']==bool(strict))
  compare=next(x for x in comp['rows'] if x['id']==name)['branches'][si]
  check('report branch verdict and first geometry '+name,compare['strictPass']==s['strictPass'] and compare['firstLocation']==s['selectedFirstLocation'] and compare['firstIntendedGeometry']==s['postReturnIntendedGeometry'][0])
  for cp in compare['points']:
   p=s['selected'][cp['point']]
   check('report point values '+name+'/'+cp['point'],cp['balance']==p['quadBalance'] and cp['nominalSpan']==p['nominalSpanFraction'] and cp['stableRows']==p['stableRows'] and cp['scoredWorstRMS']==[r['metric']['worstRMS'] for r in p['records']] and cp['trueWorstRMS']==p['geometric']['worstRMS'])
check('four passive profiles / four actual first branches',profiles==4 and branches==4)
html=(ROOT/'index.html').read_text();embedded=json.loads(re.search(r'<script type="application/json" id="comparison-data">(.*?)</script>',html,re.S).group(1))
check('self-contained report data equals comparison JSON',embedded==comp)
images=re.findall(r'src="data:image/png;base64,([A-Za-z0-9+/=]+)"',html)
check('four embedded original PNGs only',len(images)==4 and [sha(base64.b64decode(x)) for x in images]==[next(c['pngSha256'] for c in run['captures'] if c['id']==id) for id in ['square','rounded-one-third','rounded-two-thirds','circle']])
events=read(ROOT/'events.json');freeze=next(e for e in events if e['type']=='all-four-sources-and-executed-scripts-verified-before-capture');captureevents=[e for e in events if e['type']=='source-capture-invoked'];repeatevents=[e for e in events if e['type']=='immediate-repeat-invoked']
check('all sources frozen before first capture',prereg['frozenAtUtc']<captureevents[0]['atUtc'] and freeze['atUtc']<captureevents[0]['atUtc'])
check('capture and immediate repeat denominator',len(captureevents)==4 and len(repeatevents)==4 and [e['id'] for e in captureevents]==prereg['executionOrder'])
check('event ordinary/passive counts',len([e for e in events if e['type']=='ordinary-slot-invoked'])==12 and len([e for e in events if e['type']=='separate-passive-profile-invoked'])==4)
check('experimental cutoff and cleanup',run['finishedAtUtc']<prereg['cutoffUtc'] and run['browserClosed'] and events[-1]['type']=='owned-browser-closed')
check('full repository format check',read(ROOT/'format-check.json')['exitCode']==0)
for p in SRC.glob('*.mjs'):check('node syntax '+str(p),subprocess.run(['node','--check',str(p)],capture_output=True).returncode==0)
for p in SRC.glob('*.py'):compile(p.read_text(),str(p),'exec');check('python syntax '+str(p),True)
files=sorted(p for base in [ROOT,SRC] for p in base.rglob('*') if p.is_file() and p.name!='final-verification.json')
inventory=[{'path':str(p),'bytes':p.stat().st_size,'sha256':sha(p.read_bytes())} for p in files]
now=datetime.datetime.now(datetime.timezone.utc);start=datetime.datetime.fromisoformat('2026-10-10T19:04:44+00:00')
receipt={'schema':'aqrobat.control-panel-verification.v1','verifiedAtUtc':now.isoformat(),'elapsedMinutesFromAuthorizedStart':(now-start).total_seconds()/60,'counts':{'captures':4,'immediateRepeatReceipts':4,'ordinarySlots':12,'ordinaryCompleted':12,'ordinaryUnattempted':0,'exactRecoveries':9,'emptyReturns':3,'passiveProfiles':profiles,'actualStockBranches':branches,'selectedScoredRecords':pointrecords,'recomputedMetricSets':metrics,'recomputedAxisRMSValues':axes,'nativeProseSources':0,'nativePayloadProposals':0,'phoneTests':0},'endpointComparability':True,'stop':None,'allChecksPassed':True,'checks':checks,'inventory':inventory,'inventoryExcludes':['final-verification.json to avoid a recursive self hash'],'bytesAcrossBothTreesIncludingThisReceipt':0,'byteCap':4000000,'parentReserveAtSeal':0,'checksSkipped':['npm test','npm run build','npm run test:browser','npm run test:text-browser','npm run test:extension','npm run test:native-text'],'skipReason':'Additive research-only artifacts; product/download rebuilds and acceptance tests irrelevant to this finite panel. Not claimed unavailable.','noReaderOrCaptureRerunForVerification':True,'imageReadScope':'cv2.imread/cvtColor used only to recompute retained-PNG RGBA and outside-finder pixel identity; no QR detector/reader/locator invocation.'}
# Prettier-format in memory, then solve the exact final-byte fixed point before writing once.
basebytes=sum(p.stat().st_size for p in files)
for _ in range(8):
 data=json.dumps(receipt,indent=2)+'\n'
 formatted=subprocess.check_output(['node','node_modules/prettier/bin/prettier.cjs','--parser','json'],input=data,text=True)
 total=basebytes+len(formatted.encode())
 if receipt['bytesAcrossBothTreesIncludingThisReceipt']==total and receipt['parentReserveAtSeal']==4000000-total:break
 receipt['bytesAcrossBothTreesIncludingThisReceipt']=total;receipt['parentReserveAtSeal']=4000000-total
else:raise AssertionError('Byte fixed point did not settle')
assert total<3900000 and now.isoformat()<prereg['workerDeadlineUtc']
(ROOT/'final-verification.json').write_text(formatted)
print(json.dumps({'checks':len(checks),'allPassed':True,'bytesAcrossBothTrees':total,'remainingBytes':4000000-total,'elapsedMinutes':receipt['elapsedMinutesFromAuthorizedStart'],'metrics':metrics,'axes':axes}))

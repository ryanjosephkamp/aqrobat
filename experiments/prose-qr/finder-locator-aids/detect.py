import cv2,hashlib,json,time
from pathlib import Path
from datetime import datetime,timezone
root=Path('docs/research/prose-qr/phase-19');out=root/'detector-01';out.mkdir();sha=lambda b:hashlib.sha256(b).hexdigest()
inputs=[]
for phase,count in [('16',4),('17',2),('18',4),('19',2)]:
 for i in range(1,count+1):
  base=Path(f'docs/research/prose-qr/phase-{phase}/run-0{i}');inputs.append((f'p{phase}-run-0{i}',base/'native.png',base/'native-pixels.json',base/'layout.json'))
inputs.append(('control',Path('docs/research/prose-qr/phase-12/run-01/raw/full.png'),Path('docs/research/prose-qr/phase-14/run-01/control-pixels.json'),None))
(out/'manifest.json').write_text(json.dumps({'at':datetime.now(timezone.utc).isoformat(),'opencv':cv2.__version__,'module':cv2.__file__,'planned':13,'inputs':[{'id':name,'path':str(p),'receipt':str(r)} for name,p,r,l in inputs],'sources':{p:sha(Path(p).read_bytes()) for p in [__file__,str(root/'DETECTOR-PLAN.md')]},'inputTransforms':'none; default detector; geometry only after return'},indent=2)+'\n')
rows=[]
for name,p,receipt,layout in inputs:
 r={'id':name,'input':str(p)}
 try:
  source=json.loads(receipt.read_text());r['pngSha256']=sha(p.read_bytes());assert r['pngSha256']==source['pngSha256'];image=cv2.imread(str(p));r['rgbaSha256']=sha(cv2.cvtColor(image,cv2.COLOR_BGR2RGBA).tobytes());assert r['rgbaSha256']==source['rgbaSha256']
  start=time.monotonic();detector=cv2.QRCodeDetector();ok,points=detector.detect(image);r.update(detected=bool(ok),points=None if points is None else points.tolist(),seconds=time.monotonic()-start)
  if layout:
   l=json.loads(layout.read_text());lo=l['pad'];hi=lo+25*l['spec']['unit']-1;expected=[(lo,lo),(hi,lo),(hi,hi),(lo,hi)];r['intendedQuad']=bool(ok) and all(((points[0][i][0]-x)**2+(points[0][i][1]-y)**2)**.5<l['spec']['unit'] for i,(x,y) in enumerate(expected))
  else:
   text,_,_=detector.detectAndDecode(image);r.update(text=text,exact=text=='https://example.com/')
 except Exception as e:r['error']=repr(e)
 rows.append(r);(out/(name+'.json')).write_text(json.dumps(r,indent=2)+'\n');print(json.dumps({k:v for k,v in r.items() if k in ['id','detected','intendedQuad','exact','error']}),flush=True)
(out/'summary.json').write_text(json.dumps({'planned':13,'completed':len(rows),'nativeDetected':sum(r.get('detected',False) and r['id']!='control' for r in rows),'nativeIntended':sum(r.get('intendedQuad',False) for r in rows),'errors':[r for r in rows if 'error'in r],'nativePayloads':0},indent=2)+'\n')

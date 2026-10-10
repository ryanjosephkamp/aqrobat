import cv2,hashlib,json,time
from pathlib import Path
from datetime import datetime,timezone
root=Path('docs/research/prose-qr/phase-15')
sha=lambda b:hashlib.sha256(b).hexdigest()
source=Path(__file__)
for batch,kind in [('detector-01','default'),('alternate-01','aruco')]:
 out=root/batch;out.mkdir();inputs=[]
 if kind=='default':
  for b in ['run-01','run-02']:inputs.append((b,root/b/'native.png',root/b/'native-pixels.json'))
 else:inputs.append(('phase14-native',Path('docs/research/prose-qr/phase-14/run-01/native.png'),Path('docs/research/prose-qr/phase-14/run-01/native-pixels.json')))
 inputs.append(('control',Path('docs/research/prose-qr/phase-12/run-01/raw/full.png'),Path('docs/research/prose-qr/phase-14/run-01/control-pixels.json')))
 (out/'manifest.json').write_text(json.dumps({'at':datetime.now(timezone.utc).isoformat(),'opencv':cv2.__version__,'planned':len(inputs),'reader':kind,'inputTransforms':'none','sources':{str(source):sha(source.read_bytes()),str(root/'REPLAY-PLAN.md'):sha((root/'REPLAY-PLAN.md').read_bytes())}},indent=2)+'\n')
 rows=[]
 for name,p,receipt in inputs:
  r={'id':name,'input':str(p)}
  try:
   record=json.loads(receipt.read_text());r['pngSha256']=sha(p.read_bytes());assert r['pngSha256']==record['pngSha256'];image=cv2.imread(str(p));r['rgbaSha256']=sha(cv2.cvtColor(image,cv2.COLOR_BGR2RGBA).tobytes());assert r['rgbaSha256']==record['rgbaSha256']
   start=time.monotonic()
   if kind=='default':
    ok,points=cv2.QRCodeDetector().detect(image);r['detected']=bool(ok)
   else:
    detector=cv2.QRCodeDetectorAruco();text,points,straight=detector.detectAndDecode(image);r['text']=text;r['exact']=text=='https://example.com/'
    if straight is not None:r['sampledDimensions']=list(straight.shape)
   r['seconds']=time.monotonic()-start;r['points']=None if points is None else points.tolist()
  except Exception as e:r['error']=repr(e)
  rows.append(r);(out/(name+'.json')).write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r),flush=True)
 (out/'summary.json').write_text(json.dumps({'planned':len(inputs),'completed':len(rows),'errors':[r for r in rows if 'error'in r],'results':rows},indent=2)+'\n')

import cv2, hashlib, json, platform
from pathlib import Path
from datetime import datetime, timezone
root=Path('docs/research/prose-qr/phase-14');out=root/'detector-01';out.mkdir()
sha=lambda b:hashlib.sha256(b).hexdigest()
inputs=[('native',root/'run-01/native.png',root/'run-01/native-pixels.json'),('control',Path('docs/research/prose-qr/phase-12/run-01/raw/full.png'),root/'run-01/control-pixels.json')]
(out/'manifest.json').write_text(json.dumps({'at':datetime.now(timezone.utc).isoformat(),'version':cv2.__version__,'module':cv2.__file__,'python':platform.python_version(),'planned':2,'sources':{p:sha(Path(p).read_bytes()) for p in [__file__,str(root/'INDEPENDENT-PLAN.md')]},'inputTransforms':'none; default detectAndDecode'},indent=2)+'\n')
results=[]
for name,p,receipt in inputs:
 r={'id':name,'input':str(p)}
 try:
  source=json.loads(receipt.read_text());r['pngSha256']=sha(p.read_bytes());assert r['pngSha256']==source['pngSha256']
  image=cv2.imread(str(p));r['rgbaSha256']=sha(cv2.cvtColor(image,cv2.COLOR_BGR2RGBA).tobytes());assert r['rgbaSha256']==source['rgbaSha256']
  detector=cv2.QRCodeDetector();text,points,straight=detector.detectAndDecode(image)
  r.update(text=text,exact=text=='https://example.com/',points=None if points is None else points.tolist())
  if straight is not None:
   b=straight.tobytes();(out/(name+'-symbol.bin')).write_bytes(b);r['symbol']={'width':straight.shape[1],'height':straight.shape[0],'sha256':sha(b)}
 except Exception as e:r['error']=repr(e)
 results.append(r);(out/(name+'.json')).write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r),flush=True)
(out/'summary.json').write_text(json.dumps({'planned':2,'completed':len(results),'exact':[r['id'] for r in results if r.get('exact')],'errors':[r for r in results if 'error'in r]},indent=2)+'\n')

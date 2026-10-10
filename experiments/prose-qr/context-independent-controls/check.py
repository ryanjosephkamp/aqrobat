from pathlib import Path
import cv2, json, hashlib, time
from datetime import datetime, timezone
root=Path('docs/research/prose-qr/phase-40');out=root/'run-01';out.mkdir()
sha=lambda b:hashlib.sha256(b).hexdigest()
base=Path('docs/research/prose-qr/phase-10/dense-02');r=json.loads((base/'controls.json').read_text())
manifest={'at':datetime.now(timezone.utc).isoformat(),'planned':2,'options':'default QRCodeDetector.detectAndDecode, no setters or altered pixels','sources':{p:sha(Path(p).read_bytes()) for p in [str(Path(__file__)),str(root/'PLAN.md'),str(base/'controls.json')]}}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
for name in ('solid','full'):
 row={'id':name}
 try:
  receipt=r[name];p=base/receipt['path'];b=p.read_bytes();assert sha(b)==receipt['pngSha256']
  image=cv2.imread(str(p));rgba=cv2.cvtColor(image,cv2.COLOR_BGR2RGBA);assert sha(rgba.tobytes())==receipt['rgbaSha256']
  start=time.monotonic();text,points,straight=cv2.QRCodeDetector().detectAndDecode(image)
  row.update({'pngPath':str(p),'pngSha256':sha(b),'rgbaSha256':sha(rgba.tobytes()),'text':text,'exactURLControl':name=='full' and text=='https://example.com/','points':None if points is None else points.tolist(),'sampledShape':None if straight is None else list(straight.shape),'seconds':time.monotonic()-start,'opencv':cv2.__version__})
 except Exception as e:row['error']=repr(e)
 (out/(name+'.json')).write_text(json.dumps(row,indent=2)+'\n');print(json.dumps(row),flush=True)

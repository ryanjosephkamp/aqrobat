from pathlib import Path
import cv2, json, hashlib, time, math
from datetime import datetime, timezone
root=Path('docs/research/prose-qr/phase-44');out=root/'run-01';out.mkdir()
sha=lambda b:hashlib.sha256(b).hexdigest()
prior=Path('docs/research/prose-qr/phase-43')
record=json.loads((prior/'run-01/native-pixels.json').read_text())
repeat=json.loads((prior/'run-01/capture.json').read_text());assert repeat['repeatExact'] and repeat['pngSha256']==repeat['repeatSha256']==record['pngSha256']
original=json.loads((prior/'opencv-01/run-01.json').read_text());assert original['points'] is not None
reference=original['points'][0];unit=10240/35;lo=5*unit;hi=30*unit
expected=[[lo,lo],[hi,lo],[hi,hi],[lo,hi]]
manifest={'at':datetime.now(timezone.utc).isoformat(),'plannedNative':2,'plannedControl':1,'reader':'default OpenCV QRCodeDetector.detectAndDecode; full unchanged image only','geometryClassification':'After ordinary return only; source geometry never enters reader','sources':{p:sha(Path(p).read_bytes()) for p in [str(Path(__file__)),str(root/'PLAN.md'),str(prior/'run-01/native-pixels.json'),str(prior/'run-01/capture.json'),str(prior/'opencv-01/run-01.json')]}}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
control=json.loads((prior/'run-01/control-pixels.json').read_text())
for name,r in [('native-1',record),('native-2',record),('control',control)]:
 row={'id':name}
 try:
  p=Path(r['path']);b=p.read_bytes();assert sha(b)==r['pngSha256'];image=cv2.imread(str(p));rgba=cv2.cvtColor(image,cv2.COLOR_BGR2RGBA);assert sha(rgba.tobytes())==r['rgbaSha256']
  start=time.monotonic();text,points,straight=cv2.QRCodeDetector().detectAndDecode(image)
  row.update({'path':str(p),'pngSha256':sha(b),'rgbaSha256':sha(rgba.tobytes()),'text':text,'points':None if points is None else points.tolist(),'seconds':time.monotonic()-start,'opencv':cv2.__version__,'exactURLControl':name=='control' and text=='https://example.com/'})
  if name.startswith('native'):
   if points is None:row['stableIntendedOutline']=False
   else:
    q=points[0].tolist();delta=max(math.dist(a,b) for a,b in zip(q,reference));target=max(math.dist(a,b) for a,b in zip(q,expected));edges=[math.dist(q[i],q[(i+1)%4]) for i in range(4)];balance=min(edges)/max(edges)
    row.update({'maxCornerReplayDelta':delta,'maxCornerExpectedDelta':target,'edgeLengths':edges,'edgeBalance':balance,'stableIntendedOutline':delta<=2 and target<=0.25*unit and balance>=0.98})
 except Exception as e:row['error']=repr(e)
 (out/(name+'.json')).write_text(json.dumps(row,indent=2)+'\n');print(json.dumps(row),flush=True)

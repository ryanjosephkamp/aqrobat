import cv2, hashlib, json, time
from pathlib import Path
from datetime import datetime, timezone

root = Path('docs/research/prose-qr/phase-32')
out = root / 'opencv-01'
out.mkdir()
sha = lambda b: hashlib.sha256(b).hexdigest()
inputs = [('control', root / 'run-01/control-pixels.json')] + [(f'run-{i:02}',root / f'run-{i:02}/native-pixels.json') for i in (1,2,3)]
manifest = {'at':datetime.now(timezone.utc).isoformat(), 'opencv':cv2.__version__, 'planned':4, 'options':'default QRCodeDetector.detectAndDecode; no setters/transforms/extraction', 'sources':{p:sha(Path(p).read_bytes()) for p in [str(Path(__file__)),str(root/'PLAN.md')]}, 'inputs':[{'id':i,'receipt':str(p),'sha256':sha(p.read_bytes())} for i,p in inputs]}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
for name,receipt in inputs:
    row = {'id':name}
    try:
        record=json.loads(receipt.read_text()); path=Path(record['path']); b=path.read_bytes(); assert sha(b)==record['pngSha256']
        image=cv2.imread(str(path)); rgba=cv2.cvtColor(image,cv2.COLOR_BGR2RGBA); assert sha(rgba.tobytes())==record['rgbaSha256']
        start=time.monotonic(); text,points,straight=cv2.QRCodeDetector().detectAndDecode(image)
        row.update({'path':str(path),'pngSha256':sha(b),'rgbaSha256':sha(rgba.tobytes()),'seconds':time.monotonic()-start,'text':text,'exactControl':name=='control' and text=='https://example.com/','points':None if points is None else points.tolist(),'sampledShape':None if straight is None else list(straight.shape)})
    except Exception as e:
        row['error']=repr(e)
    (out/(name+'.json')).write_text(json.dumps(row,indent=2)+'\n')
    print(json.dumps(row),flush=True)

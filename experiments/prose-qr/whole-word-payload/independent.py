import cv2,hashlib,json,time
from pathlib import Path
from datetime import datetime,timezone
root=Path('docs/research/prose-qr/phase-28');out=root/'opencv-01';out.mkdir()
sha=lambda b:hashlib.sha256(b).hexdigest()
inputs=[('native',root/'run-01/native.png',root/'decode-01/pixels.json'),('control',Path('docs/research/prose-qr/phase-12/run-01/raw/full.png'),root/'run-01/control-pixels.json')]
(out/'manifest.json').write_text(json.dumps({'at':datetime.now(timezone.utc).isoformat(),'opencv':cv2.__version__,'plannedCalls':4,'inputs':[str(p) for _,p,_ in inputs],'options':'default QRCodeDetector.detectAndDecode and QRCodeDetectorAruco.detectAndDecode, no setters or transforms','sources':{str(Path(__file__)):sha(Path(__file__).read_bytes()),str(root/'PLAN.md'):sha((root/'PLAN.md').read_bytes())}},indent=2)+'\n')
for name,path,receipt in inputs:
 record=json.loads(receipt.read_text());image=cv2.imread(str(path));assert sha(path.read_bytes())==record['pngSha256'];assert sha(cv2.cvtColor(image,cv2.COLOR_BGR2RGBA).tobytes())==record['rgbaSha256']
 for kind,detector in [('default',cv2.QRCodeDetector()),('aruco',cv2.QRCodeDetectorAruco())]:
  row={'id':name,'reader':kind,'input':str(path),'pngSha256':record['pngSha256'],'rgbaSha256':record['rgbaSha256']}
  try:
   start=time.monotonic();text,points,straight=detector.detectAndDecode(image);row.update({'seconds':time.monotonic()-start,'text':text,'exact':text=='https://example.com/','points':None if points is None else points.tolist(),'sampledDimensions':None if straight is None else list(straight.shape)})
  except Exception as e:row['error']=repr(e)
  (out/(name+'-'+kind+'.json')).write_text(json.dumps(row,indent=2)+'\n');print(json.dumps(row),flush=True)

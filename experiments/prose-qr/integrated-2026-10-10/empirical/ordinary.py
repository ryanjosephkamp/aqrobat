import cv2,json,sys,time,hashlib
from pathlib import Path
p=Path(sys.argv[1]);b=p.read_bytes();image=cv2.imread(str(p));start=time.monotonic()
try:
    text,points,straight=cv2.QRCodeDetector().detectAndDecode(image)
    row={'path':str(p),'pngSha256':hashlib.sha256(b).hexdigest(),'opencv':cv2.__version__,'profile':'default detectAndDecode; no setters/options/geometry/transform','seconds':time.monotonic()-start,'text':text,'points':None if points is None else points.tolist(),'exactURL':text=='https://example.com/'}
except Exception as e:row={'path':str(p),'error':repr(e)}
print(json.dumps(row))

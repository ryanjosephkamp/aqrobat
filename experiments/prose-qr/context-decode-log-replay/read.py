import cv2,json,sys,time,hashlib,os
from pathlib import Path
p=Path(sys.argv[1]);b=p.read_bytes();image=cv2.imread(str(p));start=time.monotonic()
row={'path':str(p),'pngSha256':hashlib.sha256(b).hexdigest(),'opencv':cv2.__version__,'loggingEnvironment':os.environ.get('OPENCV_LOG_LEVEL'),'options':'default QRCodeDetector.detectAndDecode, stock DEBUG logging only'}
try:
    text,points,straight=cv2.QRCodeDetector().detectAndDecode(image)
    row.update({'seconds':time.monotonic()-start,'text':text,'points':None if points is None else points.tolist(),'sampledShape':None if straight is None else list(straight.shape)})
except Exception as e:row['error']=repr(e)
print('AQROBAT_RESULT='+json.dumps(row),flush=True)

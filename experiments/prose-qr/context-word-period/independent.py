import cv2, hashlib, json, time, math
from pathlib import Path
from datetime import datetime, timezone

root=Path('docs/research/prose-qr/phase-41')
out=root/'opencv-01'
out.mkdir()
sha=lambda b:hashlib.sha256(b).hexdigest()
inputs=[('control',root/'run-01/control-pixels.json')]+[(f'run-{i:02}',root/f'run-{i:02}/native-pixels.json') for i in (1,)]
source_url='https://raw.githubusercontent.com/opencv/opencv/4.13.0/modules/objdetect/src/qrcode.cpp'
manifest={'at':datetime.now(timezone.utc).isoformat(),'opencv':cv2.__version__,'ordinaryPlanned':2,'nativeInputs':1,'unattemptedNative':[],'options':'default QRCodeDetector.detectAndDecode; no setters, transforms or extraction','diagnosticReplica':{'source':source_url,'resize':'512 square, INTER_AREA','threshold':'ADAPTIVE_THRESH_GAUSSIAN_C, THRESH_BINARY, 83, 2','acceptanceInput':False},'sources':{p:sha(Path(p).read_bytes()) for p in [str(Path(__file__)),str(root/'PLAN.md'),'docs/research/prose-qr/phase-32/REPLICA-PLAN.md','docs/research/prose-qr/phase-32/opencv-source-01/receipt.json']},'inputs':[{'id':i,'receipt':str(p),'sha256':sha(p.read_bytes())} for i,p in inputs]}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')

def rays(binary,point):
    x,y=map(round,point); h,w=binary.shape; result={}
    for name,dx,dy in [('horizontal',1,0),('vertical',0,1),('diagonalDown',1,1),('diagonalUp',1,-1)]:
        if not (0<=x<w and 0<=y<h) or binary[y,x]!=0:
            result[name]={'runs':[0]*5,'complete':False,'rms':None,'centralSpan':0};continue
        halves=[]
        for sign in (-1,1):
            a=[0,0,0];state=0
            for t in range(2*max(w,h)):
                px=x+sign*dx*t;py=y+sign*dy*t
                if not (0<=px<w and 0<=py<h):break
                black=binary[py,px]==0
                if black!=(state%2==0):
                    state+=1
                    if state==3:break
                a[state]+=1
            halves.append(a)
        a,b=halves; runs=[a[2],a[1],a[0]+b[0]-1,b[1],b[2]];scale=sum(runs)/7
        result[name]={'runs':runs,'complete':all(v>0 for v in runs),'rms':math.sqrt(sum((v/scale-r)**2 for v,r in zip(runs,[1,1,3,1,1]))/5) if scale else None,'centralSpan':runs[2]}
    spans=[r['centralSpan'] for r in result.values()]
    return {'point':point,'classification':'Expected source-region replica diagnostic; not selected geometry','axes':result,'balancedCentralSpans':min(spans)/max(spans) if max(spans) else 0,'completeAxes':sum(r['complete'] for r in result.values())}

for name,receipt in inputs:
    row={'id':name}
    try:
        record=json.loads(receipt.read_text());path=Path(record['path']);b=path.read_bytes();assert sha(b)==record['pngSha256']
        image=cv2.imread(str(path));rgba=cv2.cvtColor(image,cv2.COLOR_BGR2RGBA);assert sha(rgba.tobytes())==record['rgbaSha256']
        start=time.monotonic();text,points,straight=cv2.QRCodeDetector().detectAndDecode(image)
        row.update({'path':str(path),'pngSha256':sha(b),'rgbaSha256':sha(rgba.tobytes()),'seconds':time.monotonic()-start,'text':text,'exactControl':name=='control' and text=='https://example.com/','points':None if points is None else points.tolist(),'sampledShape':None if straight is None else list(straight.shape)})
        (out/(name+'.json')).write_text(json.dumps(row,indent=2)+'\n')
        gray=cv2.cvtColor(image,cv2.COLOR_BGR2GRAY)
        small=cv2.resize(gray,(512,512),interpolation=cv2.INTER_AREA)
        binary=cv2.adaptiveThreshold(small,255,cv2.ADAPTIVE_THRESH_GAUSSIAN_C,cv2.THRESH_BINARY,83,2)
        ok, encoded=cv2.imencode('.png',binary);assert ok
        (out/(name+'-replica.png')).write_bytes(encoded.tobytes())
        diagnostic={'classification':'Post-default-return init replica, never input to a reader','sourceURL':source_url,'rgbaInputSha256':sha(rgba.tobytes()),'grayReplicaSha256':sha(small.tobytes()),'binaryReplicaSha256':sha(binary.tobytes()),'pngSha256':sha(encoded.tobytes()),'actualDefaultQuad':row['points'],'expectedRegionRays':[]}
        if name!='control':
            pitch=512/35;lo=5*pitch
            for x,y in [(3.5,3.5),(21.5,3.5),(3.5,21.5)]:
                point=[lo+x*pitch,lo+y*pitch];r=rays(binary,point)
                stable=0;total=0
                for py in range(math.ceil(point[1]-1.5*pitch),math.floor(point[1]+1.5*pitch)):
                    px=round(point[0]);total+=1
                    if binary[py,px]!=0:continue
                    left=right=px
                    while left>0 and binary[py,left-1]==0:left-=1
                    while right<511 and binary[py,right+1]==0:right+=1
                    stable+=right-left+1>=0.8*3*pitch
                r['wideRowFraction']=stable/total if total else 0
                diagnostic['expectedRegionRays'].append(r)
        (out/(name+'-replica.json')).write_text(json.dumps(diagnostic,indent=2)+'\n')
    except Exception as e:
        row['error']=repr(e)
        (out/(name+'-error.json')).write_text(json.dumps(row,indent=2)+'\n')
    print(json.dumps(row),flush=True)

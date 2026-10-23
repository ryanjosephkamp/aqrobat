import cv2, hashlib, json, math
from pathlib import Path
from datetime import datetime, timezone
root=Path('docs/research/prose-qr/phase-47'); out=root/'run-01';out.mkdir()
sha=lambda b:hashlib.sha256(b).hexdigest()
source=Path(__file__)
manifest={'at':datetime.now(timezone.utc).isoformat(),'planned':2,'opencv':cv2.__version__,'decoderCalls':0,'replicaOnly':True,'sources':{str(p):sha(p.read_bytes()) for p in [source,root/'PLAN.md',Path('docs/research/prose-qr/phase-47/reference-01/control.json'),Path('docs/research/prose-qr/phase-32/opencv-source-01/receipt.json'),Path('docs/research/prose-qr/phase-45/opencv-01/run-01.json'),Path('docs/research/prose-qr/phase-45/run-01.json')]}}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
for name in ['native','control']:
 row={'id':name,'classification':'Expected source-region post-return replicas only, never internal selected geometry or acceptance input'}
 try:
  rec=json.loads(Path(f'docs/research/prose-qr/phase-45/run-01/{name}-pixels.json').read_text()); path=Path(rec['path']); assert sha(path.read_bytes())==rec['pngSha256']
  image=cv2.imread(str(path)); assert sha(cv2.cvtColor(image,cv2.COLOR_BGR2RGBA).tobytes())==rec['rgbaSha256']
  gray=cv2.cvtColor(image,cv2.COLOR_BGR2GRAY)
  full=cv2.adaptiveThreshold(gray,255,cv2.ADAPTIVE_THRESH_GAUSSIAN_C,cv2.THRESH_BINARY,83,2)
  small=cv2.resize(gray,(512,512),interpolation=cv2.INTER_AREA)
  init=cv2.adaptiveThreshold(small,255,cv2.ADAPTIVE_THRESH_GAUSSIAN_C,cv2.THRESH_BINARY,83,2)
  prior=Path('docs/research/prose-qr/phase-45/opencv-01')/('run-01-replica.json' if name=='native' else 'control-replica.json')
  assert sha(init.tobytes())==json.loads(prior.read_text())['binaryReplicaSha256']
  matrix=json.loads(Path('docs/research/prose-qr/phase-45/run-01.json').read_text())['specs'][0]['matrix']
  if name=='control':
   # Existing control is M with boost disabled; phase45 native is boosted to Q.
   reference=json.loads(Path('docs/research/prose-qr/phase-47/reference-01/control.json').read_text())
   matrix=reference['matrix']
  unit=gray.shape[0]/35 if name=='native' else 656/33
  quiet=5 if name=='native' else 4
  row.update({'pngSha256':rec['pngSha256'],'rgbaSha256':rec['rgbaSha256'],'path':str(path),'fullBinarySha256':sha(full.tobytes()),'initBinarySha256':sha(init.tobytes()),'matrixReference':'phase45 Q source; conventional control M unboosted reference-01/control.json','replicas':{}})
  for label,binary in [('full',full),('init',init)]:
   scale=binary.shape[0]/gray.shape[0];pitch=unit*scale;lo=quiet*pitch
   errors=[];classes={'dark':[],'light':[]}
   for y in range(25):
    for x in range(25):
     expected=bool(matrix[y][x]);px=round(lo+(x+.5)*pitch);py=round(lo+(y+.5)*pitch)
     if (binary[py,px]==0)!=expected: errors.append([x,y])
     x0=math.ceil(lo+(x+.15)*pitch);x1=math.floor(lo+(x+.85)*pitch)
     y0=math.ceil(lo+(y+.15)*pitch);y1=math.floor(lo+(y+.85)*pitch)
     cell=binary[y0:y1,x0:x1];classes['dark' if expected else 'light'].append(float((cell==0).mean()))
   rays=[]
   for x,y in [(3.5,3.5),(21.5,3.5),(3.5,21.5)]:
    px=round(lo+x*pitch);py=round(lo+y*pitch);axes={}
    for axis,dx,dy in [('H',1,0),('V',0,1),('D+',1,1),('D-',1,-1)]:
     if binary[py,px]!=0: axes[axis]=[0]*5;continue
     halves=[]
     for sign in [-1,1]:
      counts=[0,0,0];state=0
      for t in range(2*max(binary.shape)):
       xx=px+sign*dx*t;yy=py+sign*dy*t
       if not(0<=xx<binary.shape[1] and 0<=yy<binary.shape[0]):break
       black=binary[yy,xx]==0
       if black!=(state%2==0):
        state+=1
        if state==3:break
       counts[state]+=1
      halves.append(counts)
     a,b=halves;axes[axis]=[a[2],a[1],a[0]+b[0]-1,b[1],b[2]]
    rays.append({'point':[px,py],'runs':axes})
   row['replicas'][label]={'centerMismatches':len(errors),'centerDenominator':625,'mismatchCoordinates':errors,'occupancy':{k:{'min':min(v),'max':max(v),'mean':sum(v)/len(v),'cells':len(v)} for k,v in classes.items()},'expectedRegionRays':rays}
 except Exception as e: row['error']=repr(e)
 (out/(name+'.json')).write_text(json.dumps(row,indent=2)+'\n')
 print(json.dumps({'id':name,'error':row.get('error'),'mismatches':{k:v['centerMismatches'] for k,v in row.get('replicas',{}).items()}}),flush=True)

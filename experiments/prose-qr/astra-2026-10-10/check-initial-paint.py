from pathlib import Path
import cv2,json,hashlib,datetime
root=Path('docs/research/prose-qr/astra-2026-10-10')
rows=[]
for phase,expect in [('context-03',False),('context-04',True)]:
 p=root/phase/'continuous-article'; d=json.loads((p/'capture.json').read_text()); a=cv2.imread(str(p/'native.png'),cv2.IMREAD_GRAYSCALE)
 probes=[]
 for para in d['dom']['paragraphs']:
  r=para['firstGlyph']['rect']; x,y,w,h=[r[k] for k in ['x','y','width','height']]
  left,top,right,bottom=int(x),int(y),int(x+w),int(y+h)
  n=int((a[top:bottom,left:right]<128).sum())
  probes.append({'nativeRect':[left,top,right,bottom],'grayBelow128Pixels':n,'declaredComputedStroke':para['firstGlyph']['stroke'],'visibleInkPresent':n>0})
  assert (n>0)==expect
  assert para['selection']==para['text']
 rows.append({'phase':phase,'expectedVisible':expect,'pngSha256':hashlib.sha256((p/'native.png').read_bytes()).hexdigest(),'probes':probes})
out=root/'initial-paint-check.json'
with out.open('x') as f:json.dump({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'passed':True,'classification':'Independent saved-pixel and retained computed-style verification. Regions are post-capture visual diagnostics, never reader inputs. No new render/reader.','rows':rows},f,indent=2);f.write('\n')
print(json.dumps(rows,indent=2))

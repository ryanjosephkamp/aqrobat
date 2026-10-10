from pathlib import Path
import cv2,json,hashlib
r=Path('docs/research/prose-qr/session-2026-10-09')
sha=lambda b:hashlib.sha256(b).hexdigest()
inputs=[('reference',Path('docs/research/prose-qr/phase-27/run-02/native.png')),('mixed',Path('docs/research/prose-qr/phase-29/run-01/native.png')),('ill',Path('docs/research/prose-qr/phase-30/run-01/native.png')),('it',Path('docs/research/prose-qr/phase-30/run-02/native.png'))]
regions=[(840,840),(3864,840),(840,3864)]
rows=[];reference=None
for name,p in inputs:
 a=cv2.imread(str(p),cv2.IMREAD_UNCHANGED);h=[sha(a[y:y+1176,x:x+1176].tobytes()) for x,y in regions]
 if reference is None:reference=h
 record=json.loads((p.parent/'native-zxing-errors-diagnostic.json').read_text())
 native=[]
 for found in record['results']:
  if found.get('width')!=25 or found.get('height')!=25:continue
  s=(p.parent/found['symbolPath']).read_bytes();wrong=[]
  for ox,oy in [(0,0),(18,0),(0,18)]:
   cells=[]
   for y in range(7):
    for x in range(7):
     dark=x in (0,6) or y in (0,6) or (2<=x<=4 and 2<=y<=4)
     if (s[(oy+y)*25+ox+x]==0)!=dark:cells.append([ox+x,oy+y])
   wrong.append(cells)
  native.append({'position':found['position'],'finderWrongCells':wrong,'audit':found['finderAudit']})
 rows.append({'id':name,'input':str(p),'pngSha256':sha(p.read_bytes()),'sourceFinderRegionsBGRASha256':h,'regionsExactToReference':h==reference,'ordinaryReturnedSymbols':native})
result={'at':'post-probe, no acceptance input changes','classification':'Expected coordinates used only for post-render source fidelity diagnostics, never supplied to a reader or used to repair pixels','regions':[{'x':x,'y':y,'width':1176,'height':1176} for x,y in regions],'plannedInputs':4,'results':rows,'sourceSha256':sha(Path(__file__).read_bytes())}
with (r/'context-audit.json').open('x') as f:json.dump(result,f,indent=2);f.write('\n')
for row in rows:print(json.dumps({'id':row['id'],'regionsExact':row['regionsExactToReference'],'wrong':[v['finderWrongCells'] for v in row['ordinaryReturnedSymbols']]}))

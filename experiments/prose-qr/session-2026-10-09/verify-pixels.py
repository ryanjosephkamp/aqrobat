import json,hashlib,cv2
from pathlib import Path
from datetime import datetime,timezone
root=Path('docs/research/prose-qr/session-2026-10-09');plan=json.loads((root/'verification-inputs.json').read_text());sha=lambda b:hashlib.sha256(b).hexdigest();rows=[]
assert len(plan['pngs'])==plan['plannedPNGFiles']
for record in plan['pngs']:
 p=Path(record['path']);row={'path':str(p),'pngSha256':sha(p.read_bytes())}
 try:
  assert row['pngSha256']==record['sha256'];a=cv2.imread(str(p),cv2.IMREAD_UNCHANGED);assert a is not None
  if len(a.shape)==2:a=cv2.cvtColor(a,cv2.COLOR_GRAY2RGBA)
  else:a=cv2.cvtColor(a,cv2.COLOR_BGRA2RGBA if a.shape[2]==4 else cv2.COLOR_BGR2RGBA)
  row.update({'width':a.shape[1],'height':a.shape[0],'rgbaSha256':sha(a.tobytes())});expected=plan['recordedRGBAByPNG'].get(row['pngSha256'],[]);row['priorRGBAReceiptCount']=len(expected);row['priorRGBAMatch']=all(e['rgbaSha256']==row['rgbaSha256'] for e in expected) if expected else None;assert row['priorRGBAMatch'] is not False
 except Exception as e:row['error']=repr(e)
 rows.append(row)
result={'at':datetime.now(timezone.utc).isoformat(),'planned':plan['plannedPNGFiles'],'completed':len(rows),'errors':sum('error'in r for r in rows),'withPriorRGBAReceipt':sum(r.get('priorRGBAMatch') is True for r in rows),'newlyObservedRGBA':sum(r.get('priorRGBAMatch') is None for r in rows),'sourceSha256':sha(Path(__file__).read_bytes()),'inputManifestSha256':sha((root/'verification-inputs.json').read_bytes()),'inputTransforms':'PNG channel decode only; no acceptance reader rerun','results':rows}
with (root/'verification-pixels.json').open('x') as f:json.dump(result,f,indent=2);f.write('\n')
print(json.dumps({k:v for k,v in result.items() if k!='results'}));assert result['completed']==result['planned'] and result['errors']==0

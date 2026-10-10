import json,hashlib,pathlib,cv2
root=pathlib.Path('docs/research/prose-qr/session-2026-10-10-d')
rows=[]
for receipt in json.loads((root/'phase-receipts.json').read_text()):
 c=json.loads(pathlib.Path(receipt['path']).read_text())
 for f in c['inventory']:
  path=pathlib.Path(f['path'])
  if path.name not in ['pixels.json','resource-profile.json']:continue
  j=json.loads(path.read_text());p=pathlib.Path(j['path']) if 'path' in j else path.parent/'glyph.png'
  b=p.read_bytes();a=cv2.imread(str(p));assert a is not None,str(p)
  rgba=cv2.cvtColor(a,cv2.COLOR_BGR2RGBA).tobytes();h=hashlib.sha256(rgba).hexdigest()
  assert hashlib.sha256(b).hexdigest()==j['pngSha256'],str(p)
  assert h==j['rgbaSha256'],str(p)
  rows.append(dict(receipt=str(path),path=str(p),pngSha256=j['pngSha256'],rgbaSha256=h,width=int(a.shape[1]),height=int(a.shape[0])))
result=dict(at='fresh read-only verification; no render or reader calls',passed=True,pairs=len(rows),rows=rows,sourceSha256=hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest())
with (root/'pixel-verification.json').open('x') as f:json.dump(result,f,indent=2);f.write('\n')
print(json.dumps(dict(pairs=len(rows),passed=True)))

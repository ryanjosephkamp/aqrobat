import cv2, json, hashlib, pathlib, datetime
root=pathlib.Path('docs/research/prose-qr/session-2026-10-10-b')
rows=[]
for n in range(49,64):
    for p in sorted(pathlib.Path(f'docs/research/prose-qr/phase-{n}').rglob('*pixels.json')):
        j=json.loads(p.read_text())
        if not isinstance(j,dict) or 'rgbaSha256' not in j: continue
        png=pathlib.Path(j['path']).read_bytes()
        assert hashlib.sha256(png).hexdigest()==j['pngSha256'],str(p)
        a=cv2.imread(j['path'],cv2.IMREAD_COLOR)
        assert a is not None and a.shape[:2]==(j['height'],j['width']),str(p)
        rgba=cv2.cvtColor(a,cv2.COLOR_BGR2RGBA)
        h=hashlib.sha256(memoryview(rgba)).hexdigest()
        assert h==j['rgbaSha256'],str(p)
        rows.append({'receipt':str(p),'path':j['path'],'pngSha256':j['pngSha256'],'rgbaSha256':h,'width':j['width'],'height':j['height']})
        del a,rgba,png
result={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'passed':True,'pngRGBAPairs':len(rows),'classification':'Read-only fresh conversion of retained unchanged PNG bytes; no new native rendering or decoder invocation. Repeated paths remain receipt entries, not independent inputs.','rows':rows,'sources':{__file__:hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest()}}
with (root/'pixel-verification.json').open('x') as f: json.dump(result,f,indent=2);f.write('\n')
print(json.dumps({'passed':True,'pngRGBAPairs':len(rows)}))

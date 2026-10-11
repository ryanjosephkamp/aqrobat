from pathlib import Path
import ast,json,html,gzip,hashlib
r=Path('docs/research/prose-qr/phase-08')
src=Path('experiments/prose-qr/finder-region/report.py').read_text()
template=next(n.value.value for n in ast.parse(src).body if isinstance(n,ast.Assign) and isinstance(n.targets[0],ast.Name) and n.targets[0].id=='page' and isinstance(n.value,ast.Constant))
checkpoint=(r/'CHECKPOINT.md').read_text();prompt=checkpoint.split('## Resume prompt\n\n')[1].strip()
rows=[json.loads(s) for s in (r/'placement-01/results.jsonl').read_text().splitlines()]
audit=json.loads((r/'score-audit-summary.json').read_text())
data={'placements':[{'id':v['id'],'pass':v['probe']['ordinary']['correctFinder'],'components':v['probe']['components'],'corners':v['probe']['ordinary']['locations'][0],'quad':v['probe']['corners']['topLeft']['bestBalancedQuad']} for v in rows],'runs':[v['selected']['topLeft']['runRecords'][0] for v in audit['inputs']]}
sha=lambda b:hashlib.sha256(b).hexdigest()
old=(r/'index.html').read_bytes()
with (r/'source-versions/handback-before-token-repair.html.gz').open('xb') as f:f.write(gzip.compress(old,mtime=0))
assert template.count('const data=DATA,checkpoint=CHECKPOINT')==1
assert template.count('PROMPT')==1
page=template.replace('const data=DATA,checkpoint=CHECKPOINT','const data='+json.dumps(data)+',checkpoint='+json.dumps(checkpoint)).replace('PROMPT',html.escape(prompt))
(r/'index.html').write_text(page)
with (r/'handback-repair.json').open('x') as f:json.dump({'reason':'Broad placeholder replacement also expanded CHECKPOINT inside prompt paths; caught before browser acceptance. Original formatted HTML retained losslessly. Repair fills script variables before inserting prompt.','sourceSha256':sha(Path(__file__).read_bytes()),'originalHTMLSha256':sha(old),'newUnformattedHTMLSha256':sha(page.encode()),'nativeOutputsChanged':False},f,indent=2);f.write('\n')

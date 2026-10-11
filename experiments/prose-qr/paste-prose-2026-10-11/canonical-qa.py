"""Canonical DOCX rendering for the final editable examples; a separate QA lane."""
from pathlib import Path
from datetime import datetime,timezone
import json,hashlib,subprocess,os
base=Path('docs/research/prose-qr/paste-prose-2026-10-11').resolve()
py='/Users/noir/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3'
renderer='/Users/noir/.codex/plugins/cache/openai-primary-runtime/documents/26.1009.11318/skills/documents/render_docx.py'
ids=['word-06','word-08','word-09','word-15']
plan={'at':datetime.now(timezone.utc).isoformat(),'ids':ids,'purpose':'Canonical document QA at native 96DPI using explicitly installed Impact fonts, no scanner tests on these QA images. Native Word PDF/PNG remains primary scan evidence.','resourceCaptureSlots':4,'candidateCaptures':0,'readerCalls':0,'fontconfig':str(base/'fontconfig-task.xml'),'fontconfigSha256':hashlib.sha256((base/'fontconfig-task.xml').read_bytes()).hexdigest(),'renderer':renderer,'rendererSha256':hashlib.sha256(Path(renderer).read_bytes()).hexdigest(),'inputs':[{'id':i,'docxSha256':hashlib.sha256((base/i/(i+'.docx')).read_bytes()).hexdigest()} for i in ids]}
with(base/'canonical-qa-plan.json').open('x')as f:json.dump(plan,f,indent=2);f.write('\n')
records=[]
for ident in ids:
 out=base/ident/'docx-qa-fonts';cmd=[py,renderer,str(base/ident/(ident+'.docx')),'--output_dir',str(out),'--emit_pdf','--dpi','96'];start=datetime.now(timezone.utc);r=subprocess.run(cmd,capture_output=True,timeout=180,env={**os.environ,'FONTCONFIG_FILE':str(base/'fontconfig-task.xml')})
 for n,data in [('stdout.txt',r.stdout),('stderr.txt',r.stderr)]:
  with(base/ident/('canonical-qa-'+n)).open('xb')as f:f.write(data)
 record={'id':ident,'at':datetime.now(timezone.utc).isoformat(),'status':r.returncode,'seconds':(datetime.now(timezone.utc)-start).total_seconds(),'command':cmd,'pages':[p.name for p in out.glob('page-*.png')]};records.append(record)
 with(base/ident/'canonical-qa-receipt.json').open('x')as f:json.dump(record,f,indent=2);f.write('\n')
 print(json.dumps(record),flush=True)
 assert r.returncode==0
 assert record['pages']==['page-1.png']
with(base/'canonical-qa-results.json').open('x')as f:json.dump({'at':datetime.now(timezone.utc).isoformat(),'rows':records},f,indent=2);f.write('\n')

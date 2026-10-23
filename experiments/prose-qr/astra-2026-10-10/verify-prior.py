"""Read saved evidence and Git state; write only one fresh bootstrap receipt.

Run from the Aqrobat root with a new output filename. This never runs a reader,
renderer, experiment, Git mutation, or old sealed script.
"""
from pathlib import Path
import datetime
import gzip
import hashlib
import json
import subprocess
import sys

root = Path.cwd().resolve()
assert root == Path('/Users/noir/Documents/aqrobat')
out = Path(sys.argv[1])
assert out.parent == Path('docs/research/prose-qr/astra-2026-10-10') and not out.exists()
def git(*args):
    return subprocess.check_output(['git', *args], text=True).strip()
def sha(p):
    h = hashlib.sha256()
    with Path(p).open('rb') as f:
        for b in iter(lambda: f.read(1048576), b''):
            h.update(b)
    return h.hexdigest()
def read(p):
    return json.loads(Path(p).read_text())

branch = git('branch','--show-current')
head = git('rev-parse','HEAD')
remote = git('remote','get-url','origin')
assert branch == 'codex/aqrobat-foundation'
assert remote == 'https://github.com/ryanjosephkamp/aqrobat.git'
remote_head = git('ls-remote','origin','refs/heads/'+branch).split()[0]
assert remote_head == head
pr = json.loads(subprocess.check_output(['gh','pr','view','1','--json','state,isDraft,headRefName,headRefOid,baseRefName,url'],text=True))
assert pr['state']=='OPEN' and pr['isDraft'] and pr['headRefOid']==head
assert pr['headRefName']==branch and pr['baseRefName']=='main'
tracked=set(subprocess.check_output(['git','ls-files','-z']).decode().split('\0'))
session='docs/research/prose-qr/session-2026-10-10-d/custody.json'
plan='docs/research/prose-qr/sol-three-hour-plan-2026-10-10/custody.json'
d=read(session)
bootstrap='docs/bootstrap/astra-2026-10-10/custody.json'
receipts=[{'path':bootstrap,'sha256':sha(bootstrap)},{'path':session,'sha256':sha(session)},*d['prior'],*d['phases'],{'path':plan,'sha256':sha(plan)}]
entries=0
files={}
refs=[]
receipt_paths=[]
def collect(origin,j):
    if isinstance(j,dict) and isinstance(j.get('sources'),dict):
        for p,h in j['sources'].items():
            if '/' in p and isinstance(h,str) and len(h)==64:
                refs.append({'origin':origin,'path':p,'sha256':h})
for r in receipts:
    p=Path(r['path'])
    assert sha(p)==r['sha256'], str(p)
    assert p.resolve().relative_to(root).as_posix() in tracked, str(p)
    c=read(p); collect(str(p),c)
    receipt_paths.append({'path':str(p),'sha256':r['sha256']})
    for item in c.get('inventory',[]):
        q=Path(item['path'])
        assert q.resolve().is_relative_to(root), str(q)
        assert q.stat().st_size==item['bytes'], str(q)
        assert sha(q)==item['sha256'], str(q)
        assert str(q) in tracked, str(q)
        entries+=1; files[str(q)]=item['sha256']
        if q.suffix=='.json': collect(str(q),read(q))
catalog={h:p for p,h in files.items()}
for p in files:
    q=Path(p)
    if q.suffix=='.gz' and q.stat().st_size<3000000:
        with gzip.open(q,'rb') as f: b=f.read(33554433)
        if len(b)<=33554432: catalog[hashlib.sha256(b).hexdigest()]=p+' (decompressed)'
matching=0; history=[]
for r in refs:
    p=Path(r['path'])
    if p.is_file() and sha(p)==r['sha256']:
        assert p.resolve().relative_to(root).as_posix() in tracked, str(p)
        matching+=1
    else:
        assert r['sha256'] in catalog, r
        history.append({**r,'retainedSnapshot':catalog[r['sha256']]})
downloads=[]
for item in d['downloads']:
    p=Path('downloads')/item['name']
    assert sha(p)==item['sha256'] and str(p) in tracked
    downloads.append({'path':str(p),'sha256':item['sha256']})
package=read('package.json'); assert package['private'] is True
result={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'passed':True,'type':'read-only backup and custody verification; no experiment replay','head':head,'remoteHead':remote_head,'branch':branch,'remote':remote,'pr':pr,'statusAtCheck':git('status','--short'),'receiptCount':len(receipts),'receipts':receipt_paths,'inventoryEntries':entries,'uniqueInventoryPaths':len(files),'inventoryTrackedInGit':True,'matchingCurrentSourceReferences':matching,'historicalSourceReferences':history,'downloads':downloads,'packageVersion':package['version'],'npmPrivate':package['private'],'planningSource':str(Path(__file__).relative_to(root)),'planningSourceSha256':sha(__file__),'newResearchRenders':0,'newReaderCalls':0,'newPhoneTests':0,'limits':'Verifies saved bytes and source custody, not new reader results or native/device behavior. Does not audit or back up other repositories, owner profiles, external original prototypes, ignored dependencies, or external runtime binaries.'}
with out.open('x') as f: json.dump(result,f,indent=2); f.write('\n')
print(json.dumps({k:result[k] for k in ['passed','head','receiptCount','inventoryEntries','uniqueInventoryPaths','matchingCurrentSourceReferences','npmPrivate']}))

import datetime, gzip, hashlib, json, pathlib, re, subprocess

root = pathlib.Path.cwd()
out = root / 'docs/research/prose-qr/portable-story-2026-10-11'
old = root / 'docs/research/prose-qr/styled-story-2026-10-11'
def run(*args):
    return subprocess.run(args, cwd=root, capture_output=True, text=True, check=True).stdout
def sha(data): return hashlib.sha256(data).hexdigest()
def save(name, value):
    with (out/name).open('x') as f: f.write(json.dumps(value, indent=2)+'\n')

assert run('git','branch','--show-current').strip() == 'codex/aqrobat-foundation'
assert run('git','rev-parse','HEAD').strip() == 'a7ceea7345cbac6d1dec05a9042510508a3dc07a'
assert not run('git','diff','--name-only') and not run('git','diff','--cached','--name-only')
seal = json.loads((old/'delivery-seal.json').read_text())
for f in seal['files']:
    b=(root/f['path']).read_bytes()
    assert len(b)==f['bytes'] and sha(b)==f['sha256'], f['path']
protected = {f['path']:f for f in json.loads((old/'baseline-preservation.json').read_text())['files']}
for f in seal['files']: protected[f['path']]=f
protected[str((old/'delivery-seal.json').relative_to(root))]={'path':str((old/'delivery-seal.json').relative_to(root)), 'bytes':(old/'delivery-seal.json').stat().st_size,'sha256':sha((old/'delivery-seal.json').read_bytes())}
for f in protected.values():
    b=(root/f['path']).read_bytes()
    assert len(b)==f['bytes'] and sha(b)==f['sha256'],f['path']
save('preservation-baseline.json', {'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'anchor':run('git','rev-parse','HEAD').strip(),'files':list(protected.values())})

paths = sorted([str(p.relative_to(root)) for d in [old,root/'experiments/prose-qr/styled-story-2026-10-11'] for p in d.rglob('*') if p.is_file()] + [str((out/n).relative_to(root)) for n in ['OWNER-ACCEPTANCE.json','PLAN.md']])
patterns = [('private-key',rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),('github-token',rb'gh[pousr]_[A-Za-z0-9]{30,}'),('api-key',rb'\bsk-(?:proj-)?[A-Za-z0-9_-]{28,}'),('aws-key',rb'\bAKIA[A-Z0-9]{16}\b')]
findings=[]; largest=[]
for p in paths:
    b=(root/p).read_bytes(); largest.append((len(b),p))
    assert len(b)<50000000,p
    assert not re.search(r'(?:^|/)(?:\.env(?:\.|$)|credentials|auth\.json|id_rsa)',p),p
    if p.endswith('.gz'): b=gzip.decompress(b)
    if not p.endswith('.png'):
        for label,pattern in patterns:
            if re.search(pattern,b): findings.append({'path':p,'rule':label})
assert not findings, json.dumps(findings)
run('git','fetch','origin')
before=run('git','ls-remote','origin')
assert 'a7ceea7345cbac6d1dec05a9042510508a3dc07a\trefs/heads/codex/aqrobat-foundation' in before
pr=json.loads(run('gh','pr','view','1','--json','state,isDraft,headRefName,headRefOid,url'))
assert pr['isDraft'] and pr['state']=='OPEN' and pr['headRefOid']==run('git','rev-parse','HEAD').strip()
save('backup-preflight.json', {'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'authorization':'Owner requested recording acceptance and backups; narrow checkpoint only, existing branch and draft PR preserved. Main synchronization, merge and cleanup from the general skill do not apply.','semantics':'history-retaining','sourceHead':run('git','rev-parse','HEAD').strip(),'sourceTree':run('git','rev-parse','HEAD^{tree}').strip(),'main':run('git','rev-parse','refs/heads/main').strip(),'worktrees':run('git','worktree','list','--porcelain'),'refs':run('git','show-ref'),'remoteBefore':before,'pr':pr,'stagingAllowlist':paths,'exclusions':['AQROBAT-CONTEXT/','Site source and audience','build/dependency artifacts','new research not yet executed'],'secretFindings':findings,'largestArtifacts':[{'path':p,'bytes':n} for n,p in sorted(largest,reverse=True)[:5]],'validation':'Prior functional checks cover identical tracked source; all 1595 sealed research files and 11013 original protected files rehashed. Exact raw evidence formatting exceptions retained.'})
run('git','add','--',*paths)
assert sorted(run('git','diff','--cached','--name-only').splitlines())==paths
check=subprocess.run(['git','diff','--cached','--check'],cwd=root,capture_output=True,text=True)
save('backup-diff-check.json', {'status':check.returncode,'stdout':check.stdout,'stderr':check.stderr,'note':'Frozen raw outputs retain their exact bytes. No style repair is authorized for evidence.'})
assert check.returncode==0, 'Cached diff whitespace check failed; retain staged scope for review'
run('git','commit','-m','Checkpoint owner-accepted all-letter styled-story research','-m','Preserve 75 native candidates, ordinary ZXing/Vision successes, raw failures, exact sources and reviewed handback. Record Ryan\'s scanning acceptance with device/app/payload/scale unspecified. Unit, build, browser, text-browser and research checks passed; frozen format warnings remain documented. Keep PR #1 draft, npm private, owner context and Site untouched.')
head=run('git','rev-parse','HEAD').strip()
assert run('git','ls-remote','origin')==before,'Remote drift before push'
run('git','push','origin','HEAD:refs/heads/codex/aqrobat-foundation')
remote=run('git','ls-remote','origin','refs/heads/codex/aqrobat-foundation').split()[0]
assert remote==head
pr=json.loads(run('gh','pr','view','1','--json','state,isDraft,headRefName,headRefOid,url'))
assert pr['isDraft'] and pr['state']=='OPEN' and pr['headRefOid']==head
save('backup-checkpoint.json', {'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'commit':head,'tree':run('git','rev-parse','HEAD^{tree}').strip(),'remoteHead':remote,'pr':pr,'files':len(paths),'allOldBytesPreserved':True,'merge':False,'mainChanged':False,'siteCalls':0})
print(json.dumps({'checkpoint':head,'remote':remote,'files':len(paths),'draft':pr['isDraft']}))

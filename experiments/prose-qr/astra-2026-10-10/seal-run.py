"""Seal the local report/evidence inventory after checks, before final backup."""
from pathlib import Path
from datetime import datetime, timezone
import gzip
import hashlib
import json
import subprocess

R=Path('docs/research/prose-qr/astra-2026-10-10')
S=Path('experiments/prose-qr/astra-2026-10-10')
assert Path.cwd()==Path('/Users/noir/Documents/aqrobat')
assert not (R/'custody.json').exists() and not (R/'CLOSURE.json').exists()
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def read(p):return json.loads(Path(p).read_text())
def git(*args):return subprocess.check_output(['git',*args],text=True).strip()
start=read(R/'START.json');now=datetime.now(timezone.utc)
assert now<datetime.fromisoformat(start['deadlineUtc'].replace('Z','+00:00'))
scientific=read(R/'verification-final.json');assert scientific['passed']
qa=read(R/'report-qa-final.json');assert qa['passed'] and qa['reportSha256']==sha(R/'index.html')
assert read(R/'analysis.json')['counts']==scientific['counts']
for e in read(R/'closing-sources.json')['entries']:
    raw=gzip.decompress(Path(e['snapshot']).read_bytes())
    assert hashlib.sha256(raw).hexdigest()==e['sha256'] and len(raw)==e['bytes']
history=read(R/'report-history.json');old=gzip.decompress(Path(history['retainedSnapshot']).read_bytes())
assert hashlib.sha256(old).hexdigest()==history['reportSha256']
assert all(read(R/p)['reportSha256']==history['reportSha256'] for p in ['report-qa.json','report-qa-02.json'])
assert not read(R/'report-qa.json')['passed'] and read(R/'report-qa-02.json')['passed']
assert sha(R/'PROJECT-HANDOFF.previous.md')=='306442993ddae41a2e21191a1a904777ee07d02d4bd7ac1bd823b35373df63af'
assert 'All matched files use Prettier code style!' in (R/'checks/format-final.txt').read_text()
assert 'pass 18' in (R/'checks/npm-test.txt').read_text() and 'fail 0' in (R/'checks/npm-test.txt').read_text()
assert read('package.json')['private'] is True
assert git('branch','--show-current')==start['branch'] and git('remote','get-url','origin')==start['remote']
processes=[]
for line in subprocess.check_output(['ps','-axo','pid,ppid,args'],text=True).splitlines()[1:]:
    parts=line.strip().split(None,2)
    if len(parts)<3:continue
    exe=parts[2].split()[0]
    if Path(exe).name in ('node','python3','swift') and str(S)+'/' in parts[2] and 'seal-run.py' not in parts[2]:processes.append({'pid':parts[0],'ppid':parts[1],'command':parts[2]})
assert not processes,processes
closure={'sealedAtUtc':now.isoformat(),'elapsedMinutesAtSeal':(now-datetime.fromisoformat(start['startUtc'].replace('Z','+00:00'))).total_seconds()/60,'originalDeadlineUtc':start['deadlineUtc'],'scientificStatus':'unsolved; no native payload or phone candidate','executionStatus':'sealed incomplete checkpoint; final backup verification follows','stopReason':read(R/'analysis.json')['stopReason'],'counts':scientific['counts'],'reportSha256':sha(R/'index.html'),'reportQaPassed':True,'reportViewports':[v['viewport'] for v in qa['viewports']],'reportQaInitialFailureRetained':True,'earlierReportBytesRecoveredByExactHash':True,'npmTestPassed':18,'formatCheckPassed':True,'productBuildBrowserTextBrowser':'not run; research/report-only changes and downloads preserved','nativePlatformChecks':'not run, not declared unavailable','activeTaskRunnersAtSeal':processes,'taskOwnedBrowsers':'Completed scripts close their browser in finally. Initial stalled QA browser was explicitly closed by verified owned PID; no unrelated process was closed.','headBeforeFinalArtifactCommit':git('rev-parse','HEAD'),'scope':['docs/research/prose-qr/astra-2026-10-10/','experiments/prose-qr/astra-2026-10-10/','docs/PROJECT-HANDOFF.md'],'historicalMutablePathArchive':{'original':'docs/PROJECT-HANDOFF.md','retained':str(R/'PROJECT-HANDOFF.previous.md'),'sha256':sha(R/'PROJECT-HANDOFF.previous.md')},'forbiddenActionsTaken':[]}
(R/'CLOSURE.json').write_text(json.dumps(closure,indent=2)+'\n')
# Format this generated receipt before inventorying its bytes.
subprocess.run(['./node_modules/.bin/prettier','--write',str(R/'CLOSURE.json')],check=True,stdout=subprocess.DEVNULL)
paths=sorted([p for root in [R,S] for p in root.rglob('*') if p.is_file()]+[Path('docs/PROJECT-HANDOFF.md')])
inv=[{'path':str(p),'bytes':p.stat().st_size,'sha256':sha(p)} for p in paths]
phase_bytes={p.name:sum(f.stat().st_size for f in p.rglob('*') if f.is_file()) for p in R.iterdir() if p.is_dir() and p.name!='executed-snapshots'}
assert all(v<=6000000 for v in phase_bytes.values())
logical=sum(e['bytes'] for e in inv)
assert logical<39000000
intake=read(R/'intake-verification.json')
for e in intake['downloads']:assert sha(e['path'])==e['sha256']
result={'at':now.isoformat(),'type':'Sealed run inventory; exact file bytes after scientific/report checks and before final backup','inventory':inv,'inventoryEntries':len(inv),'logicalBytesBeforeThisReceipt':logical,'overallCapBytes':40000000,'phaseBytes':phase_bytes,'excludedFromInventory':[str(R/'custody.json'),'later backup-verification-final.json and its receipt-only Git commit'],'sources':{str(S/'seal-run.py'):sha(S/'seal-run.py'),str(S/'verify-backup.py'):sha(S/'verify-backup.py')},'prior':intake['receipts'],'downloads':[{'name':Path(e['path']).name,'sha256':e['sha256']} for e in intake['downloads']],'checks':{'scientificVerification':sha(R/'verification-final.json'),'reportQa':sha(R/'report-qa-final.json'),'npmTestLog':sha(R/'checks/npm-test.txt'),'formatCheckLog':sha(R/'checks/format-final.txt')},'archivePolicy':'All scientific native outputs and executed bytes retained. One mutable current handoff is updated with exact historical alias. Earlier report QA input retained by exact matching SHA-256.'}
(R/'custody.json').write_text(json.dumps(result,indent=2)+'\n')
subprocess.run(['./node_modules/.bin/prettier','--write',str(R/'custody.json')],check=True,stdout=subprocess.DEVNULL)
print(json.dumps({'passed':True,'inventoryEntries':len(inv),'logicalBytesIncludingCustody':logical+(R/'custody.json').stat().st_size,'elapsedMinutesAtSeal':closure['elapsedMinutesAtSeal'],'activeTaskRunners':len(processes),'reportHash':closure['reportSha256']}))

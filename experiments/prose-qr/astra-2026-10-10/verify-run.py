"""Verify saved run evidence without another render, reader call, or experiment."""
from pathlib import Path
import datetime
import gzip
import hashlib
import json
import math
import subprocess
import sys
import cv2

ROOT = Path('docs/research/prose-qr/astra-2026-10-10')
SOURCE = Path('experiments/prose-qr/astra-2026-10-10')
assert Path.cwd() == Path('/Users/noir/Documents/aqrobat')
out = Path(sys.argv[1])
assert out.parent == ROOT and not out.exists()
def sha(data):
    return hashlib.sha256(data).hexdigest()
def read(path):
    return json.loads(Path(path).read_text())
def close(a, b):
    assert math.isclose(a, b, abs_tol=1e-10), (a,b)
def metric(m):
    complete = 0
    values = []
    for axis in m['axes'].values():
        runs = axis['runs']
        scale = sum(runs) / 7
        close(scale, axis['scale'])
        yes = len(runs) == 5 and all(x > 0 for x in runs)
        assert yes == axis['complete']
        complete += yes
        rms = math.sqrt(sum((x/scale-y)**2 for x,y in zip(runs,[1,1,3,1,1]))/5) if scale > 0 else None
        if rms is None:
            assert axis['normalizedRMS'] is None
        else:
            close(rms, axis['normalizedRMS'])
        values.append(rms if rms is not None else math.inf)
    assert complete == m['completeAxes']
    if math.isfinite(max(values)):
        close(max(values), m['worstRMS'])
    else:
        assert m['worstRMS'] is None
    return complete == 4 and max(values) <= .35

pixels = {}
def pixel_check(path, digest, rgba=None):
    path = Path(path)
    assert sha(path.read_bytes()) == digest, str(path)
    if str(path) not in pixels:
        im = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
        assert im is not None
        if len(im.shape) == 2:
            data = cv2.cvtColor(im, cv2.COLOR_GRAY2RGBA)
        else:
            data = cv2.cvtColor(im, cv2.COLOR_BGRA2RGBA if im.shape[2] == 4 else cv2.COLOR_BGR2RGBA)
        h,w = data.shape[:2]
        assert w*h <= 4000000 and data.nbytes <= 16000000
        pixels[str(path)] = {'path':str(path),'pngSha256':digest,'rgbaSha256':sha(data.tobytes()),'width':w,'height':h,'rgbaBytes':data.nbytes}
    p = pixels[str(path)]
    if rgba:
        assert rgba == p['rgbaSha256'], str(path)
    return p

archive = read(ROOT/'source-archive.json')
snapshots = {}
for e in archive['entries']:
    raw = gzip.decompress(Path(e['snapshot']).read_bytes())
    assert sha(raw) == e['sha256'] and len(raw) == e['bytes']
    snapshots[e['path'],e['sha256']] = e['snapshot']
for e in archive['aliases']:
    assert not Path(e['originalPath']).exists()
    assert sha(Path(e['retainedPath']).read_bytes()) == e['sha256']
refs = set()
for p in ROOT.rglob('*.json'):
    if p.name in ('source-archive.json','intake-verification.json') or p.name.startswith(('verification','backup-verification')):
        continue
    def collect(d):
        if isinstance(d, dict):
            for k,v in d.items():
                if isinstance(v,str) and len(v)==64 and k.startswith(('docs/','experiments/','vendor/','node_modules/','/Users/noir/Documents/aqrobat/')):
                    q=Path(k); current=q.is_file() and sha(q.read_bytes())==v
                    assert current or (k,v) in snapshots, (str(p),k,v)
                    refs.add((k,v))
                collect(v)
        elif isinstance(d,list):
            for v in d: collect(v)
    collect(read(p))

captures=[]
for p in ROOT.glob('*/*/capture.json'):
    c=read(p); c['_path']=str(p); captures.append(c)
    pixel_check(c['pngPath'],c['pngSha256'])
    if 'repeatSha256' in c:
        assert c['repeatExact'] and c['repeatSha256']==c['pngSha256']
native=[c for c in captures if not c.get('control')]
newcontrols=[c for c in captures if c.get('newConventional')]
reused=[c for c in captures if c.get('control') and not c.get('newConventional')]
assert len(native)==10 and len(newcontrols)==2 and len(reused)==4
assert all(c['payload'] is None for c in native)
resources=[]
for phase in ('resources-01','resources-02'):
    for p in (ROOT/phase).glob('*/result.json'):
        d=read(p)
        for c in d['renders']:
            pinfo=pixel_check(p.parent/(c['name']+'.png'),c['pngSha256'])
            assert pinfo['width']<=512 and pinfo['height']<=512
            resources.append(pinfo)
assert len(resources)==14

slots=[]; profiles=[]; branch_rows=[]
for p in sorted(ROOT.glob('*/reader-results.json')):
    r=read(p)
    assert r['plannedPrimarySlots']==len(r['slots'])
    assert r['completedPrimarySlots']==sum(s['status']=='completed' for s in r['slots'])
    for slot in r['slots']:
        row={**slot,'phase':p.parent.name}; slots.append(row)
        assert slot==read(p.parent/slot['id']/(slot['engine']+'-slot.json'))
        assert slot['status']=='completed'
        result=read(p.parent/slot['id']/(slot['engine']+'.json'))
        pixel_check(result['path'],result['pngSha256'],result.get('rgbaSha256'))
        texts=([result['text']] if result['text'] else []) if slot['engine']=='opencv' else result['texts']
        assert texts==slot['texts']
    phase_profiles=[]
    for sp in p.parent.glob('*/passive-summary.json'):
        full=json.loads(gzip.decompress((sp.parent/'passive-full.json.gz').read_bytes()))
        summary=read(sp)
        converted={**full,'scans':[{**{k:v for k,v in s.items() if k not in ('allScoredRuns','allQuads')},'scoredRuns':len(s['allScoredRuns']),'quads':len(s['allQuads'])} for s in full['scans']]}
        assert summary==converted
        stock=read(sp.parent/'jsqr.json')
        assert summary['passiveReturnsMatch'] and summary['returnedPayload']==(stock['result']['data'] if stock['result'] else None)
        assert summary['stockBranchesActuallyExecuted']==len(summary['scans'])
        pixel_check(summary['path'],summary['pngSha256'],summary['rgbaSha256'])
        capture=read(sp.parent/'capture.json')
        unit=capture['geometry']['unit']
        for s in summary['scans']:
            point_checks=[]
            for point in s['selected'].values():
                shape=metric(point['geometric'])
                scored=[metric(x['metric']) for x in point['records']]
                q=point['quad']
                if q:
                    spans=[q['top'],q['bottom'],q['height']]
                    close(min(spans)/max(spans),point['quadBalance'])
                    close(min(spans)/(3*unit),point['nominalSpanFraction'])
                sr=point['stableRows'];close(sr['stable']/sr['total'] if sr['total'] else 0,sr['fraction'])
                point_checks.append(shape and bool(scored) and all(scored) and point['quadBalance']>=.8 and point['nominalSpanFraction']>=.8 and sr['fraction']>=.8)
            intended=bool(s['postReturnIntendedGeometry']) and s['postReturnIntendedGeometry'][0]['intendedGeometry']
            passed=intended and len(point_checks)==3 and all(point_checks)
            assert passed==s['strictPass']
            selected=list(s['selected'].values())
            branch_rows.append({'phase':p.parent.name,'case':sp.parent.name,'control':capture.get('control',False),'branch':s['branch'],'dimension':s['selectedFirstLocation']['dimension'] if s['selectedFirstLocation'] else None,'sourceDimension':capture['geometry']['dimension'],'intendedFirstGeometry':bool(intended),'strictPass':passed,'worstTrueRMS':max((x['geometric']['worstRMS'] if x['geometric']['worstRMS'] is not None else math.inf for x in selected),default=None),'minQuadBalance':min((x['quadBalance'] for x in selected),default=None),'minNominalSpanFraction':min((x['nominalSpanFraction'] for x in selected),default=None),'minStableFraction':min((x['stableRows']['fraction'] for x in selected),default=None)})
        phase_profiles.append({'path':str(sp),'branches':len(summary['scans'])})
    assert r['passiveProfiles']==len(phase_profiles) and r['stockBranches']==sum(x['branches'] for x in phase_profiles)
    profiles.extend(phase_profiles)
assert len(slots)==39 and len(profiles)==13
assert not any(b['strictPass'] for b in branch_rows if not b['control'])
assert not any(s['texts'] for s in slots if not s['control'])
audit=read(ROOT/'audit-01/results.json');auditbranches=0
for row in audit['rows']:
    assert row['savedStockReturnMatches'] and row['passiveReturnMatches']
    p=row['pixels'];pixel_check(p['path'],p['pngSha256'],p['rgbaSha256'])
    raw=json.loads(gzip.decompress((ROOT/'audit-01'/(row['id']+'-passive.json.gz')).read_bytes()))
    assert raw['passiveReturnsMatch'] and raw['returnedPayload']==row['stockPayload']
    auditbranches+=len(raw['scans'])

anchor=read(ROOT/'START.json')['anchor']
changed=subprocess.check_output(['git','diff','--name-only',anchor],text=True).splitlines()
allowed=[str(ROOT)+'/',str(SOURCE)+'/','docs/PROJECT-HANDOFF.md']
assert all(any(p.startswith(a) for a in allowed) for p in changed), changed
assert read('package.json')['private'] is True
for e in read(ROOT/'intake-verification.json')['downloads']:
    assert sha(Path(e['path']).read_bytes())==e['sha256']
files=[p for base in (ROOT,SOURCE) for p in base.rglob('*') if p.is_file()]
logical=sum(p.stat().st_size for p in files)
assert logical < 40000000
phasebytes={p.name:sum(f.stat().st_size for f in p.rglob('*') if f.is_file()) for p in ROOT.iterdir() if p.is_dir() and p.name!='executed-snapshots'}
assert all(b<=6000000 for b in phasebytes.values())
counts={'fullNativeProposals':len(native),'fullNativeImmediateRepeatReceipts':sum('repeatSha256' in c for c in native),'nativeFinderContextProposals':sum('/context-' in c['_path'] for c in native),'nativeBodyDiagnosticProposals':sum('/coupling-' in c['_path'] for c in native),'smallGlyphRenders':len(resources),'newConventionalControls':len(newcontrols),'newControlImmediateRepeatReceipts':len(newcontrols),'reusedConventionalControlProfiles':len(reused),'primaryOrdinarySlots':len(slots),'completedPrimarySlots':sum(s['status']=='completed' for s in slots),'nativePrimarySlots':sum(not s['control'] for s in slots),'conventionalPrimarySlots':sum(s['control'] for s in slots),'conventionalExactSlots':sum(s['control'] and s['exactExpected'] for s in slots),'wrongPayloadSlots':sum(bool(s['unexpectedText']) for s in slots),'errorSlots':sum(s['status']=='error' for s in slots),'timeoutSlots':sum(s['status']=='timeout' for s in slots),'unattemptedSlots':sum(s['status']=='unattempted' for s in slots),'savedSourceStockAuditSlots':audit['stockAuditSlots'],'primaryPassiveProfiles':len(profiles),'primaryStockBranches':sum(p['branches'] for p in profiles),'auditPassiveProfiles':len(audit['rows']),'auditStockBranches':auditbranches,'resourceBinarizerDiagnostics':7,'bodyBinarizerDiagnostics':3,'nativePayloadProposals':0,'nativeStrictPasses':0,'phoneTests':0,'physicalPrintTests':0,'nativeAppPasteTests':0}
result={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'passed':True,'type':'Independent saved-evidence verification; no new renderer, acceptance reader or locator calls','counts':counts,'snapshotEntries':len(archive['entries']),'distinctSnapshots':len(set(e['snapshot'] for e in archive['entries'])),'nativeSourceAliases':len(archive['aliases']),'resolvedSourceReferences':len(refs),'pngAndRgbaVerified':list(pixels.values()),'primaryBranches':branch_rows,'slots':slots,'fileBudgetAtCheck':{'files':len(files),'logicalBytesBeforeThisReceipt':logical,'capBytes':40000000,'phaseBytes':phasebytes},'changedTrackedPathsAtCheck':changed,'verifierSha256':sha(Path(__file__).read_bytes()),'limits':['Exact repeat receipts are verified against retained PNG hashes; no repeat PNG duplication and no fresh recapture.','Saved passive parity was asserted during capture; this verification checks its saved result against stock outputs, not a new locator run.','Metric arithmetic, balances and strict gate conjunctions are recomputed from saved runs; no acceptance gate was relaxed.','This does not establish cross-app paste, owner legibility, phone scanning, physical print or data capacity.']}
# JSON must not encode nonstandard Infinity.
for b in result['primaryBranches']:
    if b['worstTrueRMS'] is not None and not math.isfinite(b['worstTrueRMS']):b['worstTrueRMS']=None
with out.open('x') as f:json.dump(result,f,indent=2,allow_nan=False);f.write('\n')
print(json.dumps({'passed':True,'counts':counts,'logicalBytes':logical,'references':len(refs)}))

"""Independent static verification of saved inputs and deterministic audit outputs."""
import pathlib,json,hashlib,datetime,math,re,subprocess
OUT=pathlib.Path(__file__).resolve().parent
ROOT=OUT.parents[3]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
load=lambda p:json.loads(p.read_text())
checks=[]
def check(label,ok,detail=None):
    checks.append({'check':label,'pass':bool(ok),'detail':detail})
    assert ok,(label,detail)
ledger=load(OUT/'frozen-ledger.json');results=load(OUT/'results.json');receipt=load(OUT/'worker-receipt.json')
check('Preregistered ledger unchanged since arithmetic',sha(OUT/'frozen-ledger.json')==results['frozenLedgerSha256'])
check('Preregistration precedes arithmetic',ledger['frozenAtUtc']<results['computedAtUtc'])
check('Seven rows; fourteen renders',len(ledger['rows'])==7 and sum(len(r['renders']) for r in ledger['rows'])==14)
seen={}
for l in ledger['rows']:
    aggregate=load(ROOT/l['aggregate']['path']);row=load(ROOT/l['receipt']['path'])
    i=int(l['aggregateRowKey'].split('/')[-1])
    check('Aggregate and direct receipt agree '+l['id'],aggregate['rows'][i]==row)
    for s in [l['aggregate'],l['receipt']]+[a[k] for a in l['renders'] for k in ['png','source']]:seen[s['path']]=s
for s in ledger['supportSources']:seen[s['path']]=s
for p,s in seen.items():
    check('Source hash '+p,sha(ROOT/p)==s['sha256'])
    check('Source byte count '+p,(ROOT/p).stat().st_size==s['bytes'])
for actual,l in zip(results['rows'],ledger['rows']):
    original=load(ROOT/l['receipt']['path']);m=original['renders'][1]['model'];b=original['renders'][1]['holes']['inkBounds'];a=actual['arithmetic'];p=m['completeRunPitch']
    check('Raw filled/outline unchanged '+l['id'],actual['filled']==original['renders'][0] and actual['outline']==original['renders'][1])
    check('Recorded pitch '+l['id'],a['pitch']==p)
    check('Pitch definition '+l['id'],math.isclose(p,(sum(m['runs']['horizontal'])+sum(m['runs']['vertical']))/14,abs_tol=1e-12))
    check('Separate anisotropy '+l['id'],math.isclose(a['horizontalOverVertical'],sum(m['runs']['horizontal'])/sum(m['runs']['vertical']),abs_tol=1e-12))
    for name,center,pitch in [('unroundedContourCenter',original['renders'][1]['holes']['selected']['center'],p),('roundedModelPoint',[m['point']['x'],m['point']['y']],p),('L2AtFixed33PixelBox',original['renders'][1]['holes']['selected']['center'],33/7)]:
        v=a[name];cx,cy=center;h=3.5*pitch
        expected=[cx-h-b[0],cy-h-b[1],b[2]-cx-h,b[3]-cy-h]
        check('Reference and nominal box '+l['id']+' '+name,v['center']==center and all(math.isclose(x,y,abs_tol=1e-12) for x,y in zip(v['nominalBox'],[cx-h,cy-h,cx+h,cy+h])))
        for key,e in zip(['left','top','right','bottom'],expected):
            check('Envelope arithmetic '+l['id']+' '+name+' '+key,math.isclose(v['signedOutwardExcess'][key],e,abs_tol=1e-12) and math.isclose(v['halfPixelSupportOutwardExcess'][key],e+.5,abs_tol=1e-12))
        check('Blocked envelope '+l['id']+' '+name,any(e>0 for e in expected) and not v['sampleExtremaFit'] and not v['halfPixelSupportFit'])
    check('Preserve isolated metric failure/pass '+l['id'],actual['standaloneFourAxisMetricPass']==(m['metric']['completeAxes']==4 and m['metric']['worstRMS']<=.35))
    check('No lowercase o invented '+l['id'],original['symbol']!='o' and actual['lowercaseO'].startswith('ABSENT'))
    check('Filled pitch unknown '+l['id'],actual['filled']['model'] is None)
check('Exactly one isolated metric pass; no native promotion',sum(r['standaloneFourAxisMetricPass'] for r in results['rows'])==1 and results['counts']['nativeGatePassesEstablished']==0 and results['counts']['nativePayloadProposalsEstablished']==0)
check('Context per-paragraph selection exact',all(p['selectionEqualsText'] for p in results['context04']['paragraphs']))
saved=load(ROOT/'docs/research/prose-qr/astra-2026-10-10/context-04/continuous-article/passive-summary.json')
for i,branch in enumerate(saved['scans']):
    points=list(branch['selected'].values())
    conjunction=branch['postReturnIntendedGeometry'][0]['intendedGeometry'] is True and len(points)==3 and all(p['quadBalance']>=.8 and p['nominalSpanFraction']>=.8 and p['stableRows']['fraction']>=.8 and len(p['records'])>0 and all(r['metric']['completeAxes']==4 and r['metric']['worstRMS']<=.35 for r in p['records']) and p['geometric']['completeAxes']==4 and p['geometric']['worstRMS']<=.35 for p in points)
    check('Every-record native conjunction branch '+str(i),conjunction==branch['strictPass']==results['context04']['branches'][i]['strictPass'])
check('Both saved native branches remain failed',len(results['context04']['branches'])==2 and not any(s['strictPass'] for s in results['context04']['branches']))
for p in OUT.glob('*.json'):
    load(p);check('JSON syntax '+p.name,True)
text=(OUT/'index.html').read_text();md=(OUT/'README.md').read_text()
for href in re.findall(r'href="([^"]+)"',text):
    check('Local evidence link '+href,(OUT/href.split('#')[0]).is_file() or href=='verification.json')
for href in re.findall(r'\]\(([^)]+)\)',md):
    check('README evidence link '+href,(OUT/href.split('#')[0]).is_file() or href=='verification.json')
check('Report self-contained and passive',not re.search(r'<(?:script|img|iframe|link)\b|https?://|@import|url\(',text,re.I))
check('Progress is visible in HTML and README','Where we are' in text and 'Where we are' in md and 'conditional layout' in text and 'remain zero' in text)
visible=re.sub(r'<style>.*?</style>', '', text, flags=re.S)
check('No percentage or ETA invented',not re.search(r'\d\s*%|\bETA\b|success probability',visible+md))
check('Formatting log passed','All matched files use Prettier code style!' in (OUT/'format-check.log.txt').read_text())
check('HEAD preserved',subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()==ledger['baseline'])
check('Branch preserved',subprocess.check_output(['git','branch','--show-current'],cwd=ROOT,text=True).strip()=='codex/aqrobat-foundation')
check('Remote preserved',subprocess.check_output(['git','remote','get-url','origin'],cwd=ROOT,text=True).strip()=='https://github.com/ryanjosephkamp/aqrobat.git')
check('No tracked edits',not subprocess.check_output(['git','diff','--name-only'],cwd=ROOT,text=True).strip())
check('No staged edits',not subprocess.check_output(['git','diff','--cached','--name-only'],cwd=ROOT,text=True).strip())
status=subprocess.check_output(['git','status','--short'],cwd=ROOT,text=True).strip()
check('Only authorized new directory dirty',status=='?? docs/research/prose-qr/resource-audit-2026-10-10/',status)
bytes_before=sum(p.stat().st_size for p in OUT.rglob('*') if p.is_file())
parent_bytes=sum(s['bytes'] for s in ledger['supportSources'] if s['path'].startswith(str(OUT.relative_to(ROOT))+'/'))
check('Worker reserve and entire cap',bytes_before-parent_bytes<650000 and bytes_before<1000000,{'directoryBytesBeforeVerification':bytes_before,'workerBytesBeforeVerification':bytes_before-parent_bytes})
now=datetime.datetime.now(datetime.timezone.utc)
check('Before worker deadline',now<datetime.datetime.fromisoformat('2026-10-10T20:58:17+00:00'),now.isoformat())
v={'schema':'aqrobat.resource-audit-static-verification.v1','checkedAtUtc':now.isoformat(),'status':'passed','checkCount':len(checks),'checks':checks,'sourcesVerified':len(seen),'format':'npm run format:check passed; formatting scoped to new documents','scientificCalls':0,'unrunByScope':receipt['unrunByScope'],'unavailableChecks':[],'bytesBeforeVerification':bytes_before,'selfHashPolicy':'verification.json excludes its own hash; final file inventory/bytes are recorded separately after formatting.','artifactHashesExcludingVerification':{p.name:{'bytes':p.stat().st_size,'sha256':sha(p)} for p in OUT.iterdir() if p.is_file() and p.name!='verification.json'}}
with (OUT/'verification.json').open('x') as f:json.dump(v,f,ensure_ascii=False,indent=2);f.write('\n')
print(json.dumps({'status':'passed','checks':len(checks),'sources':len(seen),'bytesBeforeVerification':bytes_before,'at':now.isoformat()}))

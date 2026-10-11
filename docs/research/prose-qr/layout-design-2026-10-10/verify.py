"""Static document and retained-coordinate verification; no renderer or reader."""
from pathlib import Path
from html.parser import HTMLParser
from datetime import datetime, timezone
import hashlib
import json
import math
import re
import subprocess

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parent
BASE = ROOT / 'docs/research/prose-qr/astra-2026-10-10'
checks = []

def check(name, condition, detail=None):
    checks.append({'check': name, 'pass': bool(condition), 'detail': detail})
    assert condition, name

def read(path):
    return json.loads(Path(path).read_text())

def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

spec = read(OUT / 'layout-spec.json')
con = read(OUT / 'constraints.json')
receipt = read(OUT / 'worker-receipt.json')
for p in sorted(OUT.glob('*.json')):
    read(p)
    check('JSON syntax: ' + p.name, True)
for p, data in con['sources'].items():
    check('Source hash: ' + p, digest(ROOT / p) == data['sha256'])
    check('Source bytes: ' + p, (ROOT / p).stat().st_size == data['bytes'])
for p, expected in receipt['protectedParentFiles'].items():
    check('Parent file unchanged: ' + p, digest(OUT / p) == expected)
def keyed_values(value, expression):
    tokens = re.sub(r"\[(\*|\d+)\]", r".\1", expression).split('.')
    values = [value]
    for token in tokens:
        following = []
        for item in values:
            if token == '*':
                following.extend(item.values() if isinstance(item, dict) else item)
            elif isinstance(item, list):
                following.append(item[int(token)])
            else:
                following.append(item[token])
        values = following
    return values
for entry in con['constraints']:
    for source in entry['sources']:
        if source['path'].endswith('.json'):
            document = read(ROOT / source['path'])
            for expression in source['keys']:
                check('Evidence key '+entry['id']+' '+expression, len(keyed_values(document, expression)) > 0)

recipe = read(BASE / 'context-04/continuous-article/recipe.json')
capture = read(BASE / 'context-04/continuous-article/capture.json')
audit = read(BASE / 'layout-audit-01/results.json')
u = recipe['unit']
n = recipe['dimension']
check('Pitch equals 33/7', math.isclose(u, 33/7, abs_tol=1e-12))
check('Retained declared geometry', spec['symbol']['dimension'] == n and spec['symbol']['pitch'] == u)
check('Symbol side', math.isclose(spec['symbol']['rectangle']['width'], n*u, abs_tol=1e-12))
check('Quiet width four modules', math.isclose(spec['quietZone']['widthCssPixels'], 4*u, abs_tol=1e-12))
check('Finder separation', math.isclose(spec['symbol']['finderCenterDistance'], (n-7)*u, abs_tol=1e-12))
for i, (p, saved) in enumerate(zip(spec['paragraphs'], capture['dom']['paragraphs'])):
    check('Exact text P' + str(i+1), p['text'] == recipe['texts'][i] == saved['text'] == saved['selection'])
    check('Initial remains same text codepoint P' + str(i+1), p['text'][0] == saved['firstGlyph']['ch'] == 'O')
    box = p['paragraphAdvanceBox']
    delta = p['translationFromSavedParagraph']
    for axis in ['x', 'y']:
        check(f'Translated paragraph P{i+1} {axis}', math.isclose(box[axis], saved['rect'][axis]+delta['d'+axis], abs_tol=1e-10))
        check(f'Translated center P{i+1} {axis}', math.isclose(p['initialCenter'][axis], saved['counter'][axis]+delta['d'+axis], abs_tol=1e-10))
    check(f'Unchanged box P{i+1}', box['width']==330 and box['height']==258)
p2=capture['dom']['paragraphs'][1]
u_ink=p2['glyphs'][1]['ink']; center=p2['counter']['x']
left=u_ink['left']-center; right=u_ink['right']-center
check('u exact identity', p2['glyphs'][1]['ch']=='u')
check('u horizontal interval within ring', 3.5*u < left < right < 7.5*u, {'offsets':[left,right], 'ring':[3.5*u,7.5*u]})
check('Saved u line box is in outer-ring vertical extent', audit['nominalQuietOuterRectangle']['y'] < p2['glyphs'][1]['rect']['y'] < p2['glyphs'][1]['rect']['y']+p2['glyphs'][1]['rect']['height'] < audit['nominalQuietOuterRectangle']['y']+audit['nominalQuietOuterRectangle']['height'])
for key, value in [('upperRightUInkOffsets',[left,right]),('upperRightInitialInkExcessPastSymbol',p2['firstGlyph']['ink']['right']-center-3.5*u),('upperRightParagraphRightOverflow',330-(center-p2['rect']['x'])-3.5*u)]:
    recorded=spec['witness'][key]
    check('Witness '+key, recorded==value)
# Fixed-point sampling of the symbolic invariant is a numeric cross-check, not a native source panel.
for count in [21,85,125,177]:
    check('Dimension-cancellation arithmetic N='+str(count), math.isclose((64+count*u)-(64+(count-3.5)*u),3.5*u,abs_tol=1e-10))
for i,p in enumerate(capture['dom']['paragraphs']):
    source_box=audit['nominalSymbolRectangle']; outer=audit['nominalQuietOuterRectangle']
    def hit(a,b):
        return a['x']<b['x']+b['width'] and b['x']<a['x']+a['width'] and a['y']<b['y']+b['height'] and b['y']<a['y']+a['height']
    def inside(a,b):
        return a['x']>=b['x'] and a['y']>=b['y'] and a['x']+a['width']<=b['x']+b['width'] and a['y']+a['height']<=b['y']+b['height']
    glyphs=[g for g in p['glyphs'][1:] if not g['ch'].isspace()]
    counts=[len(glyphs),sum(hit(g['rect'],source_box) for g in glyphs),sum(inside(g['rect'],source_box) for g in glyphs),sum(hit(g['rect'],outer) and not inside(g['rect'],source_box) for g in glyphs)]
    row=audit['paragraphs'][i]
    check('Saved body-box recount P'+str(i+1),counts==[row['visibleBodyGlyphs'],row['bodyGlyphBoxesIntersectSymbol'],row['bodyGlyphBoxesWhollyInsideSymbol'],row['bodyGlyphBoxesIntersectQuietRing']],counts)
check('Saved quiet dark fraction',math.isclose(1286/31844,audit['quietRingSourcePixelAccounting']['gray128DarkFraction'],abs_tol=1e-12))
def strict(scan):
    return scan['postReturnIntendedGeometry'][0]['intendedGeometry'] is True and len(scan['selected'])==3 and all(p['quadBalance']>=.8 and p['nominalSpanFraction']>=.8 and p['stableRows']['fraction']>=.8 and len(p['records'])>0 and all(r['metric']['completeAxes']==4 and r['metric']['worstRMS']<=.35 for r in p['records']) and p['geometric']['completeAxes']==4 and p['geometric']['worstRMS']<=.35 for p in scan['selected'].values())
for i,s in enumerate(read(BASE/'context-04/continuous-article/passive-summary.json')['scans']):
    check('Saved native every-record gate branch '+str(i),strict(s)==s['strictPass']==False)
for row in read(ROOT/'docs/research/prose-qr/control-panel-2026-10-10/comparison.json')['rows']:
    check('D1 retained gate classification '+row['id'], row['branches'][0]['strictPass']==(row['id']=='square'))
    texts={r['engine']:r['texts'] for r in row['readers']}
    check('D1 saved ordinary returns '+row['id'],texts['zxing']==texts['jsqr']==['https://example.com/'] and texts['opencv']==(['https://example.com/'] if row['id']=='square' else []))
class Doc(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True); self.links=[]; self.assets=[]; self.prompt=''; self.collect=False; self.details=0; self.prompt_collapsed=False; self.scripts=0
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if tag=='details': self.details+=1
        if tag=='textarea' and attrs.get('id')=='continuation-prompt': self.collect=True; self.prompt_collapsed=self.details>0
        if tag=='a' and 'href' in attrs:self.links.append(attrs['href'])
        if tag in ['img','script','iframe','video','audio','source','link']:self.assets.append((tag,attrs))
        if tag=='script':self.scripts+=1
    def handle_endtag(self,tag):
        if tag=='textarea':self.collect=False
        if tag=='details':self.details-=1
    def handle_data(self,data):
        if self.collect:self.prompt+=data
html_text=(OUT/'index.html').read_text(); doc=Doc(); doc.feed(html_text)
check('Exact visible prompt equals CONTINUE.txt',doc.prompt==(OUT/'CONTINUE.txt').read_text())
check('Prompt is not collapsed',not doc.prompt_collapsed)
check('Prompt appears before evidence content',html_text.index('id="continuation-prompt"')<html_text.index('What the existing evidence supports'))
check('Direct visible CONTINUE.txt link','CONTINUE.txt' in doc.links)
check('No report asset dependencies or scripts',not doc.assets and doc.scripts==0)
check('No remote CSS dependencies',not re.search(r'@import|url\(',html_text))
for href in doc.links:
    path=href.split('#',1)[0]
    check('Local link exists: '+href, bool(path) and '://' not in path and (OUT/path).resolve().is_file())
check('JSON explicitly rejects accepted layout',spec['acceptedNativeLayout'] is False and spec['candidateSourcesCreated']==0)
check('One subsequent proposal only',spec['oneNextProposal']['id']=='R1' and not spec['oneNextProposal']['selected'])
for field in ['captures','immediateRepeats','screenshots','readerLocatorBinarizerCalls','newNativeSources']:
    check('R1 zero cap '+field,spec['oneNextProposal']['budget'][field]==0)
for cmd, expected in [(['git','rev-parse','HEAD'],'5d3251418ce2867c33b8eca9dfa00ea538822964'),(['git','branch','--show-current'],'codex/aqrobat-foundation'),(['git','remote','get-url','origin'],'https://github.com/ryanjosephkamp/aqrobat.git')]:
    result=subprocess.run(cmd,cwd=ROOT,text=True,capture_output=True)
    check('Read-only custody '+ ' '.join(cmd),result.returncode==0 and result.stdout.strip()==expected)
result=subprocess.run(['git','diff','--name-only'],cwd=ROOT,text=True,capture_output=True)
check('No tracked working changes',result.returncode==0 and result.stdout.strip()=='')
result=subprocess.run(['git','diff','--cached','--name-only'],cwd=ROOT,text=True,capture_output=True)
check('No staged changes',result.returncode==0 and result.stdout.strip()=='')
result=subprocess.run(['git','status','--short'],cwd=ROOT,text=True,capture_output=True)
check('Only authorized new output directory dirty',result.stdout.strip()=='?? docs/research/prose-qr/layout-design-2026-10-10/',result.stdout.strip())
format_logs={}
for p in ['format-new.log.txt','format-new-final.log.txt','format-check.log.txt','format-check-final.log.txt']:
    text=(OUT/p).read_text()
    format_logs[p]={'sha256':digest(OUT/p),'successMarker':('All matched files use Prettier code style!' in text) if p.startswith('format-check') else 'error' not in text.lower()}
    check('Formatting log '+p,format_logs[p]['successMarker'])
files=sorted(p for p in OUT.iterdir() if p.is_file())
size=sum(p.stat().st_size for p in files)
check('Byte cap with 100KB parent reserve',size<1900000,{'observedBytesBeforeFinalReceiptUpdate':size,'workerCeiling':1900000})
result={'schema':'aqrobat.layout-static-verification.v1','checkedAtUtc':datetime.now(timezone.utc).isoformat(),'status':'passed','checkCount':len(checks),'checks':checks,'sourceHashCount':len(con['sources']),'sourceHashes':{p:d['sha256'] for p,d in con['sources'].items()},'formatLogs':format_logs,'artifactInventoryExcludingThisMutableReceipt':{p.name:{'bytes':p.stat().st_size,'sha256':digest(p)} for p in files if p.name!='verification.json'},'currentBytesBeforeThisReceiptWrite':size,'selfInventoryPolicy':'verification.json is excluded from its own hash inventory; worker-receipt final timing/bytes are updated after this check and verified in final-stat.json.','acceptance':'Static contradiction verified, no native layout accepted.','skipped':['npm test','npm run build','npm run test:browser','npm run test:text-browser','npm run test:extension','npm run test:native-text','report rendering/screenshot QA'],'skippedReason':'Design-only scope forbids experimental/product execution; not claimed unavailable.','errorsPreservedIn':'worker-receipt.json deviations','experimentalCalls':0}
(OUT/'verification.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'passed':len(checks),'sourceHashes':len(con['sources']),'bytesBeforeVerification':size,'finishedUtc':result['checkedAtUtc']}))

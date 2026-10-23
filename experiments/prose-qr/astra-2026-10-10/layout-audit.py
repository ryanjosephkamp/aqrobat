"""Post-capture source feasibility; never invokes a browser or reader."""
from pathlib import Path
import cv2
import json
import math
import hashlib
import statistics
from datetime import datetime, timezone
r=Path('docs/research/prose-qr/astra-2026-10-10')
p=r/'context-04/continuous-article/capture.json'
c=json.loads(p.read_text()); g=c['geometry']; u=g['unit']; n=g['dimension']
left=g['counters'][0]['x']-3.5*u;top=g['counters'][0]['y']-3.5*u
rect={'x':left,'y':top,'width':n*u,'height':n*u}
def intersects(a,b):return a['x']<b['x']+b['width'] and a['x']+a['width']>b['x'] and a['y']<b['y']+b['height'] and a['y']+a['height']>b['y']
def inside(a,b):return a['x']>=b['x'] and a['y']>=b['y'] and a['x']+a['width']<=b['x']+b['width'] and a['y']+a['height']<=b['y']+b['height']
outer={'x':left-4*u,'y':top-4*u,'width':(n+8)*u,'height':(n+8)*u}
body=[x for para in c['dom']['paragraphs'] for x in para['glyphs'] if x['font']=='18px Body' and not x['ch'].isspace()]
rows=[]
for i,para in enumerate(c['dom']['paragraphs']):
    glyphs=[x for x in para['glyphs'] if x['font']=='18px Body' and not x['ch'].isspace()]
    ys=sorted(set(x['rect']['y'] for x in glyphs));steps=[b-a for a,b in zip(ys,ys[1:])]
    rows.append({'paragraph':i+1,'visibleBodyGlyphs':len(glyphs),'bodyGlyphBoxesIntersectSymbol':sum(intersects(x['rect'],rect) for x in glyphs),'bodyGlyphBoxesWhollyInsideSymbol':sum(inside(x['rect'],rect) for x in glyphs),'bodyGlyphBoxesIntersectQuietRing':sum(intersects(x['rect'],outer) and not inside(x['rect'],rect) for x in glyphs),'lineStepCssPixels':steps,'lineStepInSourceModules':[v/u for v in steps]})
im=cv2.imread(c['pngPath'],cv2.IMREAD_GRAYSCALE);assert im is not None
import numpy as np
yy,xx=np.indices(im.shape);symbol=(xx>=left)&(xx<left+n*u)&(yy>=top)&(yy<top+n*u);ring=(xx>=outer['x'])&(xx<outer['x']+outer['width'])&(yy>=outer['y'])&(yy<outer['y']+outer['height'])&~symbol
def values(mask):return {'nativePixels':int(mask.sum()),'gray128DarkPixels':int(((im<128)&mask).sum()),'gray128DarkFraction':float(((im<128)&mask).sum()/mask.sum())}
paths=[str(p),c['pngPath'],str(r/'layout-audit-01/PLAN.md'),str(Path(__file__))]
result={'at':datetime.now(timezone.utc).isoformat(),'sources':{x:hashlib.sha256(Path(x).read_bytes()).hexdigest() for x in paths},'newRenders':0,'readerCalls':0,'binarizerCalls':0,'sourceGeometry':g,'nominalSymbolRectangle':rect,'nominalQuietOuterRectangle':outer,'paragraphs':rows,'visibleBodyGlyphs':len(body),'medianBodyAdvanceCssPixels':statistics.median(x['rect']['width'] for x in body),'medianBodyAdvanceInModules':statistics.median(x['rect']['width'] for x in body)/u,'medianBodyInkHeightCssPixels':statistics.median(x['ascent']+x['descent'] for x in body),'medianBodyInkHeightInModules':statistics.median(x['ascent']+x['descent'] for x in body)/u,'symbolSourcePixelAccounting':values(symbol),'quietRingSourcePixelAccounting':values(ring),'classification':'Source-aligned saved native gray128/DOM diagnostic only; no reader input transformation, QR matrix, capacity proof, conformance claim or change to acceptance gates.'}
with (r/'layout-audit-01/results.json').open('x') as f:json.dump(result,f,indent=2);f.write('\n')
print(json.dumps(result))

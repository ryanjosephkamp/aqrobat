"""Read-only visible glyph geometry for native Word and canonical QA PDFs."""
from pathlib import Path
from datetime import datetime,timezone
import json,hashlib
import fitz
b=Path('docs/research/prose-qr/paste-prose-2026-10-11');rows=[]
inputs=[(i,'native',b/i/(i+'.pdf')) for i in ['word-01','word-02','word-04','word-05','word-06','word-07','word-08','word-09','word-10','word-11','word-12','word-13','word-14','word-15']]
inputs += [(i,'canonical',b/i/'docx-qa-fonts'/(i+'.pdf')) for i in ['word-06','word-08','word-09','word-15']]
for ident,lane,p in inputs:
 d=fitz.open(p);pages=[]
 for page in d:
  spans=[s for block in page.get_text('dict')['blocks'] if block['type']==0 for line in block['lines'] for s in line['spans'] if s['text'].strip()]
  ys=sorted(set(round(s['origin'][1],3) for s in spans));fonts=sorted(set(s['font'] for s in spans));bounds=[min(s['bbox'][0] for s in spans),min(s['bbox'][1] for s in spans),max(s['bbox'][2] for s in spans),max(s['bbox'][3] for s in spans)]
  pages.append({'paperPoints':[page.rect.width,page.rect.height],'visibleRows':len(ys),'rowBaselineIntervals':sorted(set(round(y-x,3) for x,y in zip(ys,ys[1:]))),'visibleFonts':fonts,'fontPoints':sorted(set(round(s['size'],3) for s in spans)),'visibleGlyphBounds':bounds,'imageObjects':len(page.get_images()),'drawingObjects':len(page.get_drawings())})
 r={'id':ident,'lane':lane,'path':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'pages':pages};rows.append(r)
 assert len(pages)==1 and pages[0]['visibleRows']==50,(ident,lane,pages[0]['visibleRows'])
 assert pages[0]['visibleFonts']==['Impact'] and pages[0]['imageObjects']==0 and pages[0]['drawingObjects']==0
record={'at':datetime.now(timezone.utc).isoformat(),'tool':'Read-only PyMuPDF '+fitz.VersionBind,'method':'Exclude whitespace-only spans, so empty paragraphs do not count as visible prose rows. No pixels produced or altered.','rows':rows,'allOnePageFiftyRowsImpactOnlyNoImagesOrDrawings':True}
with(b/'visible-pdf-check.json').open('x')as f:json.dump(record,f,indent=2);f.write('\n')
print(json.dumps({'inputs':len(rows),'allPassed':True,'visibleRows':50,'fonts':['Impact']}))

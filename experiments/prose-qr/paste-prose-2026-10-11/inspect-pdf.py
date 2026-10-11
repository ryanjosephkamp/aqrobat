"""Read-only PDF geometry and font analysis. No image transform or rasterization."""
import sys,json,hashlib
from pathlib import Path
from datetime import datetime,timezone
import fitz
path,out=map(Path,sys.argv[1:3]);doc=fitz.open(path)
pages=[]
for page in doc:
 lines=[l for b in page.get_text('dict')['blocks'] if b['type']==0 for l in b['lines']]
 spans=[s for l in lines for s in l['spans']]
 origins=sorted(set(round(s['origin'][1],3) for s in spans))
 pages.append({'paperPoints':list(page.rect),'textLines':len(lines),'distinctBaselines':len(origins),'baselinePoints':origins,'baselineIntervals':sorted(set(round(b-a,3) for a,b in zip(origins,origins[1:]))),'inkTextBounds':list(fitz.Rect([min(s['bbox'][0] for s in spans),min(s['bbox'][1] for s in spans),max(s['bbox'][2] for s in spans),max(s['bbox'][3] for s in spans)])) if spans else None,'fonts':sorted(set(s['font'] for s in spans)),'fontPoints':sorted(set(round(s['size'],4) for s in spans)),'colors':sorted(set(s['color'] for s in spans)),'imageObjects':len(page.get_images()),'drawingObjects':len(page.get_drawings()),'fontObjects':page.get_fonts(full=True),'lineText':[''.join(s['text'] for s in l['spans']) for l in lines]})
record={'at':datetime.now(timezone.utc).isoformat(),'input':str(path),'inputSha256':hashlib.sha256(path.read_bytes()).hexdigest(),'tool':'Read-only PyMuPDF '+fitz.VersionBind,'pixelsProduced':0,'readerCalls':0,'pages':pages}
with out.open('x') as f:json.dump(record,f,indent=2);f.write('\n')
print(json.dumps({'file':str(path),'pages':[{k:p[k] for k in ['paperPoints','distinctBaselines','baselineIntervals','inkTextBounds','fonts','fontPoints','imageObjects','drawingObjects']} for p in pages]}))

"""Compare actual recipient glyph sequence and color with its frozen layout."""
from pathlib import Path
from zipfile import ZipFile
import json,sys,hashlib
import xml.etree.ElementTree as E
from datetime import datetime,timezone
b=Path('docs/research/prose-qr/paste-prose-2026-10-11');records=[]
n={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'};w='{'+n['w']+'}'
for ident in sys.argv[1:]:
 p=b/ident;layout=json.loads((p/'layout.json').read_text());expected=[(c['text'],c['color']) for row in layout['runs'] for c in row if not c['text'].isspace()]
 with ZipFile(p/(ident+'.docx')) as z:r=E.fromstring(z.read('word/document.xml'))
 actual=[]
 for run in r.findall('.//w:r',n):
  color=run.find('w:rPr/w:color',n);value=color.get(w+'val') if color is not None else '000000'
  if value=='auto':value='000000'
  assert len(value)==6
  rgb=tuple(int(value[i:i+2],16) for i in [0,2,4]);assert len(set(rgb))==1
  text=''.join(e.text or '' for e in run.findall('w:t',n));actual.extend((c,rgb[0]) for c in text if not c.isspace())
 record={'id':ident,'at':datetime.now(timezone.utc).isoformat(),'glyphCount':len(expected),'actualGlyphCount':len(actual),'nonWhitespaceGlyphSequenceExact':[c for c,_ in actual]==[c for c,_ in expected],'glyphColorsExact':actual==expected,'sourceLayoutSha256':hashlib.sha256((p/'layout.json').read_bytes()).hexdigest(),'recipientDocxSha256':hashlib.sha256((p/(ident+'.docx')).read_bytes()).hexdigest(),'whitespace':'Whole-word fidelity checked separately; whitespace has no visible ink here.'}
 with(p/'glyph-style-inspection.json').open('x')as f:json.dump(record,f,indent=2);f.write('\n')
 records.append(record);assert record['glyphColorsExact'],'Recipient glyph styles differ'
print(json.dumps(records))

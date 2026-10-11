"""Read-only OOXML fidelity evidence for a real recipient save, not a renderer."""
import sys,json,hashlib
from pathlib import Path
from zipfile import ZipFile
from collections import Counter
from datetime import datetime,timezone
import xml.etree.ElementTree as E
p=Path(sys.argv[1]); stem=sys.argv[2]
ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}; w='{'+ns['w']+'}'
with ZipFile(p/(stem+'.docx')) as z:
 r=E.fromstring(z.read('word/document.xml'))
 actual=''.join((e.text or '') if e.tag==w+'t' else '\n' if e.tag==w+'br' else '' for e in r.iter())
 expected=(p/'expected.txt').read_text()
 d={'at':datetime.now(timezone.utc).isoformat(),'inputDocxSha256':hashlib.sha256((p/(stem+'.docx')).read_bytes()).hexdigest(),'wholeWordSequenceExact':actual.split()==expected.split(),'explicitBreaks':len(r.findall('.//w:br',ns)),'paragraphs':len(r.findall('.//w:p',ns)),'tables':len(r.findall('.//w:tbl',ns)),'fontHalfPoints':dict(Counter(e.get(w+'val') for e in r.findall('.//w:sz',ns))),'fontAttributes':[e.attrib for e in r.findall('.//w:rFonts',ns)[:5]],'fonts':dict(Counter(e.get(w+'ascii') for e in r.findall('.//w:rFonts',ns))),'colors':dict(Counter(e.get(w+'val') for e in r.findall('.//w:color',ns))),'spacing':[e.attrib for e in r.findall('.//w:spacing',ns)],'indents':[e.attrib for e in r.findall('.//w:ind',ns)],'paper':[e.attrib for e in r.findall('.//w:pgSz',ns)],'margins':[e.attrib for e in r.findall('.//w:pgMar',ns)],'media':[n for n in z.namelist() if n.startswith('word/media/')],'drawings':len(r.findall('.//w:drawing',ns)),'hiddenRuns':len(r.findall('.//w:vanish',ns)),'shading':[e.attrib for e in r.findall('.//w:shd',ns)],'tableProperties':[E.tostring(e,encoding='unicode') for e in r.findall('.//w:tblPr',ns)]}
with (p/'docx-inspection.json').open('x') as f:json.dump(d,f,indent=2);f.write('\n')
with (p/'native-text.txt').open('x') as f:f.write(actual)
assert d['wholeWordSequenceExact'],'Recipient text changed'
assert not d['media'] and not d['drawings'] and not d['hiddenRuns'],'Hidden/image paint found'
print(json.dumps({k:d[k] for k in ['wholeWordSequenceExact','explicitBreaks','tables','fontHalfPoints','fonts','colors','spacing','media']}))

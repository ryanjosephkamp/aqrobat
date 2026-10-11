"""A fresh A4 receiving document; run with the bundled document Python."""
from docx import Document
from docx.shared import Inches,Pt
from pathlib import Path
from datetime import datetime,timezone
import json,hashlib,shutil
b=Path('docs/research/prose-qr/paste-prose-2026-10-11');out=b/'word-10';out.mkdir()
d=Document();s=d.sections[0];s.page_width=Pt(595.3);s.page_height=Pt(841.9)
s.left_margin=s.right_margin=s.top_margin=s.bottom_margin=Inches(1)
normal=d.styles['Normal'];normal.font.name='Aptos';normal.font.size=Pt(12);normal.paragraph_format.line_spacing=1.08;normal.paragraph_format.space_after=Pt(8)
d.core_properties.author='Aqrobat research';d.core_properties.title='A4 paste receiver';d.add_paragraph('');d.save(out/'input.docx');shutil.copyfile(out/'input.docx',out/'word-10.docx')
for name in ['source.txt','expected.txt','layout.json']:shutil.copyfile(b/'word-09'/name,out/name)
plan={'at':datetime.now(timezone.utc).isoformat(),'id':'word-10','hypothesis':'Native Word-to-Word copy of the fixed-width 6.25in table also fits an A4 receiver with one-inch margins, with complete words and visible styles intact.','route':'Native Cmd+A twice and Cmd+C from saved task-owned word-09; native Cmd+V into fresh word-10 A4 receiver.','paperPoints':[595.3,841.9],'plannedNativePasteTrials':1,'plannedPdfRasterDpi':[96],'plannedCandidateCaptureSlots':1,'plannedImmediateRepeats':1,'expectedTableTwips':9000,'payload':'https://example.com/','inputDocxSha256':hashlib.sha256((out/'input.docx').read_bytes()).hexdigest()}
(out/'PLAN.json').write_text(json.dumps(plan,indent=2)+'\n')
print(json.dumps(plan))

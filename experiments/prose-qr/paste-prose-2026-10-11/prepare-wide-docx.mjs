import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {proseDocx} from './docx.mjs';
const base='docs/research/prose-qr/paste-prose-2026-10-11/';
const layout=JSON.parse(await readFile(base+'word-06/layout.json'));
const sha=b=>createHash('sha256').update(b).digest('hex');
for(const id of ['word-14','word-15']){
 const out=base+id+'/';await mkdir(out);
 const bytes=id==='word-14'?proseDocx(layout):await readFile(base+'blank-receiver.docx');
 for(const name of ['input.docx',id+'.docx'])await writeFile(out+name,bytes,{flag:'wx'});
 for(const [name,value]of [['source.txt',layout.source],['expected.txt',layout.plainText],['layout.json',JSON.stringify(layout,null,2)+'\n']])await writeFile(out+name,value,{flag:'wx'});
 await writeFile(out+'PLAN.json',JSON.stringify({at:new Date().toISOString(),id,hypothesis:'Transfer the phone-accepted word06 8.5pt / 6.5in complete-source recipe into generated fixed-width OOXML and actual native Word-to-Word paste. Tests the wider, more readable Letter option in the local studio.',route:id==='word-14'?'Open generated editable Letter DOCX; native local PDF export.':'Native Cmd+A twice/Cmd+C from task word-14, then native Cmd+V into fresh Letter word-15; Save and local PDF export.',inputDocxSha256:sha(bytes),payload:layout.spec.payload,nativePasteTrials:id==='word-15'?1:0,candidateCaptureSlots:1,immediateRepeats:1,pdfDpi:96,expectedTableTwips:9360,summary:layout.summary},null,2)+'\n',{flag:'wx'});
}

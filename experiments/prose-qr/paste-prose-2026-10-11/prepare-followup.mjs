import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {compactClipboardHtml} from './compact.mjs';
const root='docs/research/prose-qr/paste-prose-2026-10-11/';
const sha=b=>createHash('sha256').update(b).digest('hex');
const profiles=[
 ['word-04',root+'word-01/layout.json','Adjacent equal styles coalesced into larger spans; baseline words and letter styles unchanged.'],
 ['word-05',root+'corpus-02/dialogue-layout.json','Different mixed-case dialogue, including curly quotes, actual Word paste of compact HTML.'],
 ['word-06',root+'corpus-04/long-single-65in-layout.json','Single complete long source, including paragraphs, punctuation and accents, at explicit 8.5pt font across a 6.5in Letter text measure.'],
 ['word-07',root+'corpus-04/accents-9pt-65in-layout.json','Precomposed Latin accents, explicit 9pt font across 6.5in, complete-source repetition disclosed.'],
];
for(const[id,layoutPath,hypothesis]of profiles){
 const l=JSON.parse(await readFile(layoutPath)),html=compactClipboardHtml(l),out=root+id+'/';await mkdir(out);
 await copyFile(root+'blank-receiver.docx',out+'input.docx');await copyFile(root+'blank-receiver.docx',out+id+'.docx');
 for(const[n,b]of[['source.txt',l.source],['expected.txt',l.plainText],['clipboard.html.txt',html],['layout.json',JSON.stringify(l,null,2)+'\n']])await writeFile(out+n,b,{flag:'wx'});
 await writeFile(out+'PLAN.json',JSON.stringify({at:new Date().toISOString(),id,hypothesis,layoutPath,htmlBytes:Buffer.byteLength(html),htmlSha256:sha(html),inputDocxSha256:sha(await readFile(out+'input.docx')),route:'Actual macOS CUA HTML clipboard paste into default Letter Word receiver; browser Copy button remains untested.',payload:l.spec.payload,summary:l.summary,plannedNativePasteTrials:1,plannedPdfRasterDpi:[96],plannedCandidateCaptureSlots:1,plannedImmediateRepeats:1},null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({id,bytes:Buffer.byteLength(html),summary:l.summary}));
}

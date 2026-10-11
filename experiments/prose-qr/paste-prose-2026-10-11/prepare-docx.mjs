import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {proseDocx} from './docx.mjs';
const base='docs/research/prose-qr/paste-prose-2026-10-11/';
const layout=JSON.parse(await readFile(base+'corpus-04/long-single-8pt-layout.json'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const source=await readFile('experiments/prose-qr/paste-prose-2026-10-11/docx.mjs');
for(const id of ['word-08','word-09']){
 const out=base+id+'/';await mkdir(out);
 const docx=id==='word-08'?proseDocx(layout):await readFile(base+'blank-receiver.docx');
 await writeFile(out+'input.docx',docx,{flag:'wx'});await writeFile(out+id+'.docx',docx,{flag:'wx'});
 await writeFile(out+'source.txt',layout.source,{flag:'wx'});await writeFile(out+'expected.txt',layout.plainText,{flag:'wx'});await writeFile(out+'layout.json',JSON.stringify(layout,null,2)+'\n',{flag:'wx'});
 await writeFile(out+'PLAN.json',JSON.stringify({at:new Date().toISOString(),id,hypothesis:id==='word-08'?'A locally generated, fixed-width one-cell DOCX carries complete source and formatting when opened by native Word.':'Real Word Select All/Copy then Paste from generated Word document into a fresh default Letter receiver keeps the table measure and scan.',route:id==='word-08'?'Open generated OOXML DOCX in Word; no paste in this source document.':'Native Word Cmd+A, Cmd+C from task-owned word-08; open task-owned word-09, native Cmd+V; actual native rich clipboard, no CUA HTML conversion.',inputDocxSha256:sha(docx),generatorSourceSha256:sha(source),summary:layout.summary,payload:layout.spec.payload,plannedNativePasteTrials:id==='word-09'?1:0,plannedNativeOpenTrials:1,plannedNativeExports:1,plannedPdfRasterDpi:[96],plannedCandidateCaptureSlots:1,plannedImmediateRepeats:1,expectedTableTwips:9000,fontsEmbedded:0,images:0},null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({id,docxBytes:docx.length,sha256:sha(docx),summary:layout.summary}));
}
await writeFile(base+'word-08/docx-generator-frozen.txt',source,{flag:'wx'});

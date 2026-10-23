import {readFile,writeFile} from 'node:fs/promises';
const root='docs/research/prose-qr/portable-story-2026-10-11/';
const w=JSON.parse(await readFile(root+'workbench-test-03/summary.json'));
await writeFile('experiments/prose-qr/portable-story-2026-10-11/vision-09.json',JSON.stringify({id:'vision-09',hypothesis:'Read every distinct new whole-copy generator export, with ordinary Vision; byte-exact baseline replays were already read and are excluded.',inputs:w.rows.filter(r=>!r.replayExact).map(r=>({id:r.id,path:root+'workbench-test-03/'+r.id+'.png',payload:r.spec.payload}))},null,2)+'\n',{flag:'wx'});

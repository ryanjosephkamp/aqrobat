import {readFile,writeFile} from 'node:fs/promises';
const root='docs/research/prose-qr/portable-story-2026-10-11/';
const rows=JSON.parse(await readFile(root+'batch-07/summary.json','utf8')).rows.filter(r=>!r.spec.control);
const inputs=rows.map(r=>({id:r.id,path:root+'batch-07/'+r.id+'.png',payload:r.spec.payload}));
inputs.push({id:'scale-10-2',path:root+'batch-01/scale-10-2.png',payload:'https://example.com/'});
await writeFile('experiments/prose-qr/portable-story-2026-10-11/vision-07.json',JSON.stringify({id:'vision-07',hypothesis:'Default Vision on all completed batch07 candidates and the single previously unread 500px uppercase proportional-scale capture; no duplicate Vision input calls.',inputs},null,2)+'\n',{flag:'wx'});

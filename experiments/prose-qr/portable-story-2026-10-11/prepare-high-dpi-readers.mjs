import {readFile,writeFile} from 'node:fs/promises';
const root='docs/research/prose-qr/portable-story-2026-10-11/';
const browser=JSON.parse(await readFile(root+'high-dpi-01/browser-summary.json')).rows,pdf=JSON.parse(await readFile(root+'high-dpi-01/pdf-summary.json')).rows;
const inputs=[...browser,...pdf].map(r=>({id:r.id,path:root+'high-dpi-01/'+r.id+'.png',payload:'https://example.com/',control:!!r.control}));
for(const id of ['read-high-dpi-01','vision-10']) await writeFile('experiments/prose-qr/portable-story-2026-10-11/'+id+'.json',JSON.stringify({id,hypothesis:'Ordinary exact-payload reads of all unchanged new native high-DPI captures, including the conventional control. Compare device-pixel resolution while CSS and PDF physical dimensions remain fixed.',inputs},null,2)+'\n',{flag:'wx'});

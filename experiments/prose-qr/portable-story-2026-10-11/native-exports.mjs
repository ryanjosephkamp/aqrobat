import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root='docs/research/prose-qr/portable-story-2026-10-11/',out=root+'native-exports-01/';await mkdir(out);
const sha=b=>createHash('sha256').update(b).digest('hex'),specs=['accepted-replay','new-prose-complete','black-complete','accented-complete'];
await writeFile(out+'manifest.json',JSON.stringify({at:new Date().toISOString(),hypothesis:'Verify real RTF exports made by the offline UI through AppKit. Actual native source rows, complete words, fonts and document fit gate capture. This tests four particular native documents; it is not generic paste acceptance.',specs,plannedCandidates:4,plannedRepeats:4,containerPoints:[450,459],nativeLetterPixels:[816,1056],sourceInspectorSha256:sha(await readFile('experiments/prose-qr/portable-story-2026-10-11/inspect-rtf.swift'))},null,2)+'\n',{flag:'wx'});
await writeFile(out+'source.mjs.txt.gz',gzipSync(await readFile(new URL('native-exports.mjs',import.meta.url))),{flag:'wx'});await writeFile(out+'source.swift.txt.gz',gzipSync(await readFile('experiments/prose-qr/portable-story-2026-10-11/inspect-rtf.swift')),{flag:'wx'});
const rows=[];
for(const id of specs){const dir=out+id+'/';await mkdir(dir);const input=root+'workbench-test-03/'+id+'.rtf',expected=root+'workbench-test-03/'+id+'.txt';await writeFile(dir+'input.rtf',await readFile(input),{flag:'wx'});await writeFile(dir+'expected.txt',await readFile(expected),{flag:'wx'});const raw=spawnSync('swift',['experiments/prose-qr/portable-story-2026-10-11/inspect-rtf.swift',input,dir,expected,'--capture'],{encoding:'utf8',timeout:30000});await writeFile(dir+'stdout.txt',raw.stdout??'',{flag:'wx'});await writeFile(dir+'stderr.txt',raw.stderr??'',{flag:'wx'});const result=JSON.parse(await readFile(dir+'native-results.json'));rows.push({id,path:dir+'native.png',payload:'https://example.com/',result});console.log(raw.stdout.trim());}
await writeFile(out+'summary.json',JSON.stringify({at:new Date().toISOString(),rows},null,2)+'\n',{flag:'wx'});
const inputs=rows.filter(r=>r.result.captured).map(r=>({id:r.id,path:r.path,payload:r.payload}));
for(const id of ['read-native-exports-01','vision-11']) await writeFile('experiments/prose-qr/portable-story-2026-10-11/'+id+'.json',JSON.stringify({id,hypothesis:'Ordinary exact-payload reads of every successfully gated native RTF export, no image transforms. Failed native sources receive no substitute image or read.',inputs},null,2)+'\n',{flag:'wx'});

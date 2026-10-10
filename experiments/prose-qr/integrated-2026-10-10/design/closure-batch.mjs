import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {immutableClosureBound} from './immutable-closure.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const path='docs/research/prose-qr/integrated-2026-10-10/empirical/construction-02/native-input.json';
const raw=await readFile(path),hash=sha(raw);
assert.equal(hash,'7c6f6ef13be741047d05d1212d402a5291f74c0d43f40406ec25a859feb4fb30');
const input=JSON.parse(raw),out='docs/research/prose-qr/integrated-2026-10-10/design/measured-03-closure';
const sources={};for(const p of ['experiments/prose-qr/integrated-2026-10-10/design/closure-batch.mjs','experiments/prose-qr/integrated-2026-10-10/design/immutable-closure.mjs','experiments/prose-qr/integrated-2026-10-10/design/padding-solver.mjs','vendor/qrcodegen.mjs']) sources[p]=sha(await readFile(p));
const cases=[];for(const ecc of ['L','M','Q','H'])for(let mask=0;mask<8;mask++)cases.push({ecc,mask});
await mkdir(out);
await writeFile(out+'/preregistration.json',JSON.stringify({schema:'aqrobat.pure-closure-batch.v1',frozenAtUtc:new Date().toISOString(),input:{path,sha256:hash},sources,cases,denominator:32,adapter:'No quiet-ring inspection in this diagnostic; original native sample objects used unchanged.',captures:0,readers:0,reason:'Add whole-fixed-block parity closure to earlier data-only prefix bound without changing sealed measured-02 or its solver.'},null,2)+'\n',{flag:'wx'});
const rows=[];
for(const {ecc,mask}of cases){const r=immutableClosureBound({...input,ecc,mask});await writeFile(`${out}/case-${ecc}-${mask}.json`,JSON.stringify(r,null,2)+'\n',{flag:'wx'});rows.push({ecc,mask,wholeFixedDataBlocks:r.wholeFixedDataBlocks,blocks:r.blocks.map(({words,...b})=>b),exceedsDeclaredRadius:r.exceedsDeclaredRadius});}
await writeFile(out+'/summary.json',JSON.stringify({denominator:32,attempted:rows.length,unattempted:[],rows,captures:0,readers:0},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({attempted:rows.length,exceeds:rows.filter(r=>r.exceedsDeclaredRadius).length,H:rows.filter(r=>r.ecc==='H')}));

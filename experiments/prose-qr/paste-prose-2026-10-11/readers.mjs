import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import assert from "node:assert/strict";
const base = resolve("docs/research/prose-qr/paste-prose-2026-10-11");
const configPath = process.argv[2], configBytes = await readFile(configPath), config = JSON.parse(configBytes);
assert(Date.now() < Date.parse("2026-10-11T21:40:45Z"));
assert(/^[a-z0-9-]+$/.test(config.id));
const out = resolve(base,config.id); await mkdir(out);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const save = (n,v) => writeFile(resolve(out,n), typeof v === "string" || Buffer.isBuffer(v) ? v : JSON.stringify(v,null,2)+"\n",{flag:"wx"});
const sources = [
  "experiments/prose-qr/paste-prose-2026-10-11/readers.mjs",
  "experiments/prose-qr/styled-story-2026-10-11/reader.mjs",
  "experiments/prose-qr/styled-story-2026-10-11/opencv.py",
  "experiments/prose-qr/styled-story-2026-10-11/vision.swift",
];
const provenance=[];
for (const [i,path] of sources.entries()) { const b=await readFile(path);await save(`source-${i}.txt.gz`,gzipSync(b));provenance.push({path,sha256:sha(b)}); }
const inputs=[];
for (const input of config.inputs) inputs.push({...input,pngSha256:sha(await readFile(input.path))});
await save("manifest.json",{at:new Date().toISOString(),configPath,configSha256:sha(configBytes),sources:provenance,inputs,engines:config.engines,plannedCalls:inputs.length*config.engines.length,inputTransforms:"none",expectedPayloadNotSuppliedToReader:true});
const rows=[];
for (const input of inputs) {
 const readings=[];
 for (const engine of config.engines) {
  let command,args;
  if (engine==="vision") {command="swift";args=[sources[3],input.path];}
  else if (engine==="opencv") {command="python3";args=["-B",sources[2],input.path];}
  else {command=process.execPath;args=[sources[1],engine,input.path];}
  const result=spawnSync(command,args,{encoding:"utf8",timeout:45000,maxBuffer:12000000});
  await save(`${input.id}-${engine}.stdout.txt`,result.stdout??"");await save(`${input.id}-${engine}.stderr.txt`,result.stderr??"");
  let parsed=null;try {parsed=JSON.parse(result.stdout);} catch {}
  const r=engine==="vision"?parsed?.rows?.[0]:parsed;
  const texts=r?.texts??null;
  const row={engine,status:result.status,error:result.error?.message??r?.error??null,texts,exact:texts?texts.includes(input.payload):null};
  if (r?.pngSha256) assert.equal(r.pngSha256,input.pngSha256);
  readings.push(row);await save(`${input.id}-${engine}.receipt.json`,row);
  assert(!texts || texts.every(t=>t===input.payload),"Wrong returned payload: stop batch");
 }
 rows.push({...input,readings});console.log(JSON.stringify({id:input.id,readings}));
}
await save("results.json",{at:new Date().toISOString(),rows});

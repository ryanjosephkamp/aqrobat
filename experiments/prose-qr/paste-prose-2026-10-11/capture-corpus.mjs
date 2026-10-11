import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {DEFAULT_RECIPE,composePortable} from '../portable-story-2026-10-11/generator.mjs';
import {compactClipboardHtml} from './compact.mjs';
import {corpus} from './corpus.mjs';
import {positiveControl} from '../layout.mjs';

const cutoff=Date.parse('2026-10-11T21:40:45Z');
assert(Date.now()<cutoff);
const configPath=process.argv[2],configBytes=await readFile(configPath),config=JSON.parse(configBytes);
assert(/^[a-z0-9-]+$/.test(config.id));
const root=resolve('docs/research/prose-qr/paste-prose-2026-10-11'),out=resolve(root,config.id);
await mkdir(out);
const sha=b=>createHash('sha256').update(b).digest('hex');
const save=(n,v)=>writeFile(resolve(out,n),typeof v==='string'||Buffer.isBuffer(v)?v:JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const paths=['experiments/prose-qr/paste-prose-2026-10-11/capture-corpus.mjs','experiments/prose-qr/paste-prose-2026-10-11/corpus.mjs','experiments/prose-qr/paste-prose-2026-10-11/compact.mjs','experiments/prose-qr/portable-story-2026-10-11/generator.mjs','src/core.mjs','vendor/qrcodegen.mjs','experiments/prose-qr/layout.mjs'];
const sources=[];
for(const [i,path] of paths.entries()){const b=await readFile(path);await save(`source-${i}.txt.gz`,gzipSync(b));sources.push({path,sha256:sha(b)});}
await save('manifest.json',{at:new Date().toISOString(),config,configPath,configSha256:sha(configBytes),sources,plannedCaptureSlots:config.specs.length,plannedControls:(config.controls??[]).length,repeats:'one exact immediate repeat for every captured input',postCaptureTransforms:'none',readerCalls:0});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const rows=[],network=[],errors=[];
try{
 const context=await browser.newContext({viewport:{width:1600,height:1600},deviceScaleFactor:1});const page=await context.newPage();
 page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});page.on('pageerror',e=>errors.push(e.message));
 const cdp=await context.newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');
 await save('environment.json',{browser:browser.version(),node:process.version,viewport:{width:1600,height:1600},deviceScaleFactor:1,freshBrowserContext:true});
 const inputs=[...(config.controls??[]).map((payload,i)=>({id:`control-${i+1}`,payload,control:true})),...config.specs];
 for(const input of inputs){
  assert(Date.now()<cutoff);assert(/^[a-z0-9-]+$/.test(input.id));
  let layout=null,measurement=null;
  if(!input.control){
   const source=corpus.find(c=>c.id===input.corpusId);assert(source,'Unknown frozen corpus input');
   const spec={...DEFAULT_RECIPE,text:source.text,repeat:source.repeat,...input.recipe};
   await save(`${input.id}-source.txt`,source.text);await save(`${input.id}-recipe.json`,spec);
   measurement=await page.evaluate(({spec})=>{
    const c=document.createElement('canvas').getContext('2d');c.fontKerning='none';const glyphs={},weights=[...new Set([spec.darkWeight,spec.lightWeight])];
    for(const char of [...new Set(spec.text+' ')]){if(/\s/u.test(char)&&char!==' ')continue;
     const ms=weights.map(w=>{c.font=`${w} ${spec.fontSize}px '${spec.font}'`;const m=c.measureText(char);return{advance:m.width,ascent:m.actualBoundingBoxAscent,descent:m.actualBoundingBoxDescent,left:m.actualBoundingBoxLeft,right:m.actualBoundingBoxRight};});
     glyphs[char]={advance:Math.max(...ms.map(m=>m.advance)),ascent:Math.max(0,...ms.map(m=>m.ascent)),descent:Math.max(0,...ms.map(m=>m.descent)),weights:ms};
    }return{font:spec.font,size:spec.fontSize,weights,glyphs};
   },{spec});
   await save(`${input.id}-metrics.json`,measurement);
   try{layout=composePortable(spec,measurement);}catch(e){const r={id:input.id,corpusId:input.corpusId,stage:'compose',captured:false,rejected:e.message};rows.push(r);await save(`${input.id}-rejection.json`,r);console.log(JSON.stringify(r));continue;}
   await save(`${input.id}-layout.json`,layout);await save(`${input.id}-wrapped.txt`,layout.plainText);await save(`${input.id}-clipboard.html`,compactClipboardHtml(layout));
  }
  const html=input.control?`<!doctype html><html><body style="margin:0">${positiveControl(input.payload,656)}</body></html>`:layout.html;
  await save(`${input.id}.html`,html);await page.setContent(html);await page.evaluate(()=>document.fonts.ready);
  let fonts=null,selection=null,paint=null;
  if(layout){
   selection=await page.locator('#text-body').evaluate(e=>{const r=document.createRange(),s=getSelection();r.selectNodeContents(e);s.removeAllRanges();s.addRange(r);const t=s.toString();s.removeAllRanges();return t;});
   await save(`${input.id}-selection.json`,{actual:selection,exact:selection===layout.plainText,wordSequenceExact:selection.split(/\s+/u).join(' ')===layout.plainText.split(/\s+/u).join(' ')});assert.equal(selection,layout.plainText);
   const d=await cdp.send('DOM.getDocument'),node=await cdp.send('DOM.querySelector',{nodeId:d.root.nodeId,selector:'#text-body'});fonts=(await cdp.send('CSS.getPlatformFontsForNode',{nodeId:node.nodeId})).fonts;
   assert(fonts.length>0&&fonts.every(f=>f.familyName===layout.spec.font),'Unexpected native font substitution');
   paint=await page.locator('#artifact').evaluate(e=>{const bad=[];for(const n of [e,...e.querySelectorAll('*')]){const s=getComputedStyle(n);if(['IMG','SVG','CANVAS'].includes(n.tagName)||s.opacity!=='1'||s.visibility!=='visible'||s.display==='none'||s.filter!=='none'||s.textShadow!=='none'||s.backgroundImage!=='none'||!['rgba(0, 0, 0, 0)','rgb(255, 255, 255)'].includes(s.backgroundColor))bad.push(n.tagName);}return{bad,elements:e.querySelectorAll('*').length};});assert.deepEqual(paint.bad,[]);
  }
  const png=await page.locator('#artifact').screenshot();await save(`${input.id}.png`,png);const repeat=await page.locator('#artifact').screenshot();await save(`${input.id}-repeat.png`,repeat);
  const result={id:input.id,corpusId:input.corpusId??null,control:input.control??false,payload:input.payload??layout.spec.payload,captured:true,pngSha256:sha(png),repeatSha256:sha(repeat),repeatExact:png.equals(repeat),pixels:[png.readUInt32BE(16),png.readUInt32BE(20)],summary:layout?.summary??null,fonts,paint};await save(`${input.id}-capture.json`,result);assert(result.repeatExact);rows.push(result);console.log(JSON.stringify({id:input.id,captured:true,summary:layout?.summary}));
 }
 assert.deepEqual(network,[]);assert.deepEqual(errors,[]);await save('results.json',{at:new Date().toISOString(),rows,network,errors});
}finally{await browser.close();}

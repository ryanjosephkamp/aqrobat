import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {DEFAULT_RECIPE} from '../portable-story-2026-10-11/generator.mjs';
import {corpus} from './corpus.mjs';
import {WORD_FONT_POINTS,chooseAutoFit} from './autofit.mjs';
const root='docs/research/prose-qr/paste-prose-2026-10-11/',out=root+'fit-01/';await mkdir(out);
const paths=['experiments/prose-qr/paste-prose-2026-10-11/fit-corpus.mjs','experiments/prose-qr/paste-prose-2026-10-11/autofit.mjs','experiments/prose-qr/paste-prose-2026-10-11/corpus.mjs'];
const sources=[];for(const path of paths){const b=await readFile(path);sources.push({path,sha256:createHash('sha256').update(b).digest('hex')});}
await writeFile(out+'manifest.json',JSON.stringify({at:new Date().toISOString(),sources,fontPoints:WORD_FONT_POINTS,field:624,prose:corpus.map(c=>({id:c.id,text:c.text,repeat:c.repeat})),imageCaptures:0,readerCalls:0,selectionRule:'Maximize measured horizontal letter advance fraction times glyph envelope / row leading. No scanner used to choose.'},null,2)+'\n',{flag:'wx'});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const specs=[],results=[];
try{
 const page=await browser.newPage();
 for(const source of corpus){
  const input={...DEFAULT_RECIPE,text:source.text,repeat:source.repeat,field:624};const measurements=[];
  for(const points of WORD_FONT_POINTS){const size=points/0.75;
   measurements.push(await page.evaluate(({input,size})=>{const c=document.createElement('canvas').getContext('2d');c.fontKerning='none';c.font=`400 ${size}px '${input.font}'`;const glyphs={};for(const char of [...new Set(input.text+' ')]){if(/\s/u.test(char)&&char!==' ')continue;const m=c.measureText(char);const g={advance:m.width,ascent:m.actualBoundingBoxAscent,descent:m.actualBoundingBoxDescent};glyphs[char]={advance:g.advance,ascent:Math.max(0,g.ascent),descent:Math.max(0,g.descent),weights:[g]};}return{font:input.font,size,weights:[400],glyphs};},{input,size}));
  }
  try{const fit=chooseAutoFit(input,measurements);results.push({id:source.id,attempts:fit.attempts,selected:fit.layout.spec});
   // This exact source/size/measure was already captured and read in corpus-04.
   if(source.id==='long-single-copy'&&fit.layout.spec.fontSize===11.333333333333334){results.at(-1).reuse='corpus-04/long-single-65in';}
   else specs.push({id:'fit-'+source.id,corpusId:source.id,recipe:{field:624,fontSize:fit.layout.spec.fontSize}});
   console.log(JSON.stringify({id:source.id,points:fit.layout.summary.fontPoints,copies:fit.layout.summary.completeCopies,spacing:fit.layout.summary.spacingRatio,reuse:results.at(-1).reuse??null}));
  }catch(e){results.push({id:source.id,error:e.message,attempts:e.attempts??[]});}
 }
 await writeFile(out+'results.json',JSON.stringify({at:new Date().toISOString(),results},null,2)+'\n',{flag:'wx'});
 await writeFile('experiments/prose-qr/paste-prose-2026-10-11/corpus-05.json',JSON.stringify({id:'corpus-05',hypothesis:'A source-specific geometric choice within 8–10pt and the default 6.5in Letter text measure may give denser glyph coverage than a fixed 9pt recipe. Scanner results are not used to select type size.',controls:[],specs},null,2)+'\n',{flag:'wx'});
}finally{await browser.close();}

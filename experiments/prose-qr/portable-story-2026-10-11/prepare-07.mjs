import { writeFile } from 'node:fs/promises';
import { generate } from '../../../src/core.mjs';
const base={payload:'https://example.com/',font:'Impact',fontSize:12,pitch:24,linesPerModule:2,quiet:4,ecc:'Q',repeat:true,case:'preserve',gray:180};
const specs=[];
const add=(id,s)=>specs.push({...base,id,...s});
add('small-10-500',{fontSize:10,pitch:20});
add('small-12-550',{pitch:22});
add('small-12-550-gray200',{pitch:22,gray:200});
add('avenir-black-11',{font:'Avenir Next Condensed',fontSize:11,gray:0,darkWeight:900,lightWeight:100,expectedPostScriptName:'AvenirNextCondensed-Heavy'});
for(const content of ['mixed','narrow','broad']) add('avenir-black-'+content,{font:'Avenir Next Condensed',fontSize:10,gray:0,darkWeight:900,lightWeight:100,expectedPostScriptName:'AvenirNextCondensed-Heavy',content});
add('pt-sans-narrow',{font:'PT Sans Narrow',fontSize:12,darkWeight:700,lightWeight:700,gray:200});
add('arial-black-gray200',{font:'Arial Black',gray:200});
add('arial-black-upper-gray160',{font:'Arial Black',case:'upper',gray:160});
add('accented-words',{gray:200,text:'At the café, Ana reads a résumé and orders tea. Her naïve first sketch becomes a useful design. The words stay in order, with accents intact; no one needs to type in capitals. A small printed page should leave enough room to read, share, and test the exact link.'});
for(const [id,payload,fontSize] of [['short-payload','AQROBAT2026',12],['longer-url','https://example.com/aqrobat?size=small',10],['unicode-payload','café 2026',12]]) {
 const modules=generate(payload,{ecc:'Q',boost:false,stroke:0}).modules;
 add(id,{payload,pitch:600/modules,fontSize,gray:200});
}
await writeFile('experiments/prose-qr/portable-story-2026-10-11/batch-07.json',JSON.stringify({id:'batch-07',hypothesis:'Use earned recipes to test a narrower body, a slightly larger black-only Avenir face, four differing word streams, two further fonts, precomposed Latin accents, and exact different payloads. No source rewording after results and no universal-text inference.',controls:['https://example.com/'],specs},null,2)+'\n',{flag:'wx'});

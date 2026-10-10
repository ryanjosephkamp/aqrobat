import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {construct,verifyCanonical,PAYLOAD} from './padding-solver.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const out='docs/research/prose-qr/integrated-2026-10-10/design/v5-short-prose';
const root='docs/research/prose-qr/integrated-2026-10-10/empirical';
const texts=['One word or two can tell a story.','We read the words. A camera reads the ink.','Our words, too, should survive.'];
const version=5,dimension=37,unit=6.5,origin=64,side=dimension*unit;
const counters=[{x:86.75,y:86.75},{x:281.75,y:86.75},{x:86.75,y:281.75}];
const alignment={x:262.25,y:262.25};
const resourcePaths={O:root+'/resources-02/futura-O-64/result.json',o:root+'/resources-02/avenir-o-100/result.json',body:root+'/resources-02/body-3/result.json'};
const resources={},sourceHashes={};
for(const [k,p]of Object.entries(resourcePaths)){const raw=await readFile(p);sourceHashes[p]=sha(raw);resources[k]=JSON.parse(raw);}
for(const p of ['experiments/prose-qr/integrated-2026-10-10/design/prepare-v5.mjs','experiments/prose-qr/integrated-2026-10-10/design/padding-solver.mjs','vendor/qrcodegen.mjs'])sourceHashes[p]=sha(await readFile(p));
const positions=[];
function put(p,index,x,y,size=17,role='body',stroke=0,font='Menlo-Regular') {positions.push({p,index,ch:texts[p][index],x,y,size,role,font,stroke});}
function finder(p,index,center,kind){const r=resources[kind];put(p,index,center.x-(r.model.point.x-48),center.y-(r.model.point.y-24),r.size,'finder-'+kind,r.stroke,r.font);}
finder(0,0,counters[0],'O');finder(0,14,counters[1],'o');finder(2,0,counters[2],'O');
assert.equal(texts[0].slice(0,15),'One word or two');
// Ordinary first-row reading order: drop capital, native small words, enlarged final o.
const firstLeft=123,firstRight=counters[1].x-38,step=(firstRight-firstLeft)/12;
for(let i=1;i<14;i++)put(0,i,firstLeft+(i-1)*step,counters[0].y-5,12);
const advance=17*0.60205078125;
for(let i=15;i<texts[0].length;i++)put(0,i,origin+(i-15)*advance,132);
// Two ordinary text rows. Word spacing and source spaces are explicit characters.
const middleBreak=texts[1].indexOf('camera');
for(let i=0;i<middleBreak;i++)put(1,i,origin+i*advance,174);
for(let i=middleBreak;i<texts[1].length;i++)put(1,i,origin+(i-middleBreak)*advance,194);
// A second drop-cap paragraph; the final o in too is a visible larger letter,
// hypothesized as the one alignment pattern. It remains in its word and paragraph.
for(let i=1;i<13;i++)put(2,i,123+(i-1)*advance,249);
const bodyResource=resources.body;
const measuredGlyph=bodyResource.native.glyphs[5];
assert.equal(measuredGlyph.ch,'o');
const measuredHole=bodyResource.holes.holes.find(h=>h.id===15);
assert(measuredHole);
const alignSize=28,scale=alignSize/24;
const assumedDx=(measuredHole.center[0]-measuredGlyph.rect.x)*scale;
const assumedDy=(measuredHole.center[1]-24)*scale;
put(2,13,alignment.x-assumedDx,alignment.y-assumedDy,alignSize,'alignment-o',1,'Menlo-Regular');
assert.equal(texts[2][13],'o');
for(let i=14;i<texts[2].length;i++)put(2,i,123+(i-14)*advance,277);
positions.sort((a,b)=>a.p-b.p||a.index-b.index);
for(let p=0;p<texts.length;p++){assert.equal(positions.filter(a=>a.p===p).map(a=>a.ch).join(''),texts[p]);assert.equal(new Set(positions.filter(a=>a.p===p).map(a=>a.index)).size,texts[p].length);}
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
await mkdir(out);
const specs=[];
for(const weight of ['regular','bold']){
 const id='v5-reverse-'+weight,dir=out+'/'+id;await mkdir(dir);
 const glyphs=positions.map(g=>({...g,font:g.role==='body'&&weight==='bold'?'Menlo-Bold':g.font}));
 const paragraphs=texts.map((text,p)=>`<p id="p${p}" class="prose">${glyphs.filter(g=>g.p===p).map(g=>`<span id="g-${g.p}-${g.index}" data-role="${g.role}" data-index="${g.index}" data-font="${g.font}" style="left:${g.x}px;top:${g.y}px;font-family:'${g.font}';font-size:${g.size}px;color:${g.role.startsWith('finder-')?'black':'white'};-webkit-text-stroke:${g.stroke}px white">${escape(g.ch)}</span>`).join('')}</p>`).join('');
 const fonts=[...new Set(glyphs.map(g=>g.font))];
 const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Words and ink</title><style>${fonts.map(f=>`@font-face{font-family:'${f}';src:local('${f}')}`).join('')}html,body{margin:0;background:white}#artifact{position:relative;width:512px;height:512px;background:linear-gradient(black,black) 54px 54px/260.5px 260.5px no-repeat}p{margin:0}span{position:absolute;line-height:1.4;white-space:pre;font-kerning:none;font-variant-ligatures:none;letter-spacing:0}</style></head><body><article id="artifact">${paragraphs}</article></body></html>`;
 const htmlPath=dir+'/source.html.txt';await writeFile(htmlPath,html,{flag:'wx'});
 specs.push({id,kind:'native',purpose:'Changed short-prose V5 geometry and honest native-style baseline, not constructed payload',payloadTrial:false,theme:'reverse',weight,dir,htmlPath,htmlSha256:sha(html),width:512,height:512,geometry:{unit,dimension,origin,version,counters,alignment},texts,fullText:texts.join('\n\n'),separatorPolicy:'Exactly two LF between semantic paragraphs; soft wraps do not insert LF; every actual source character appears once in paragraph/source order.',glyphs,expectedFonts:fonts,allowReadWithoutStrictGate:true,classification:'Unmeasured new source hypothesis; empirical preregistration required before any captures/readers.'});
}
const targets=[];for(let mask=0;mask<8;mask++){verifyCanonical(version,'H',mask);const b=construct(version,'H',mask);targets.push({mask,matrix:b.matrix,dataCodewords:b.code.dataCodewords,interleavedCodewords:b.code.interleavedCodewords,ownership:b.ownership,canonical:b.canonical,matrixSha256:sha(JSON.stringify(b.matrix))});}
const b=construct(version,'H',0);
const functionCounts={};for(const row of b.map)for(const m of row)if(m.kind==='function')functionCounts[m.role]=(functionCounts[m.role]??0)+1;
const plan={schema:'aqrobat.changed-prose-design.v1',frozenAtUtc:new Date().toISOString(),payload:PAYLOAD,payloadSha256:sha(PAYLOAD),version,dimension,unit,origin,side,texts,sourceCharacters:texts.join('').length,fullTextCharacters:texts.join('\n\n').length,specs,sourceHashes,functionCounts,uniformField:{left:54,top:54,width:260.5,height:260.5,claim:'One uniform visible article field. No matrix, module cells, per-cell backgrounds, images, duplicates or hidden text. It extends10px outside nominal symbol to retain complete large glyph ink; quiet-zone consequences must be measured.'},degreesOfFreedom:'Whole body glyph Menlo-Regular/Menlo-Bold states only; real source-character identity ties all affected samples. Finder and alignment role glyphs fixed.',immutableClosure:b.ownership.blocks.map(v=>({...v,allDataImmutable:v.offset+v.dataLength<=b.canonical.prefixBytes,immutableParityCodewords:v.offset+v.dataLength<=b.canonical.prefixBytes?v.eccLength:0,symbolRadius:Math.floor(v.eccLength/2)})),geometryAssumptions:['Existing64px Futura O and100px Avenir o source-center offsets reused at their original font/stroke/pitch. Reverse contrast still requires actual capture; no transfer acceptance claim.','New12/17px body layout and28px Menlo o with1px white stroke are unmeasured. Alignment center scales saved24px Menlo lower-o counter centroid linearly; font hinting/stroke can invalidate it.','Native glyphs must be complete, visibly readable and nonoverlapping in actual rendered ink; a failed visual/source/selection/quiet gate remains a rejection, not a reason to clip or hide characters.'],comparisonToV10:{nominalModuleCenters:1369,prior:3249,alignmentPatterns:1,priorAlignmentPatterns:6,versionInformationCells:0,priorVersionInformationCells:36,claim:'Exact counts only. Capacity and smaller function layout do not establish improved native feasibility. V5H first2blocks contain11fixed data+22fixed parity codewords each, radius11; measured closure required.'},finiteEmpiricalHandoff:{baselineStates:specs.map(s=>s.id),baselineCaptures:'Empirical worker owns preregistration, counts and captures; these source files are not a capture plan authorization expansion.',pureSelectionBatch:'Once one frozen complete honest native sample map exists: H masks0..7 canonical fit, exact canonical, exact post-terminator affine, immutable closure, bounded radius. Select by residual rule only; no target image behind prose.',control:'Wait until final target selected. Canonical exact-URL control at same V5 geometry before any exploratory native payload ordinary-reader trial. Mask/ECC change must be handled by empirical custody/control contract; design does not spend any controls.',reject:['font substitution, clipping, hidden source, overlap affecting actual ink, wrong source/paragraph/full selection','invalid canonical control or wrong payload','any within-radius claim when closure exceeds radius','geometry assumed from resource but contradicted by actual capture'],readerResult:'At least2 independent ordinary readers must recover EXACT https://example.com/ for task acceptance; strict surrogate gate remains separately unchanged.'}};
await writeFile(out+'/source-spec.json',JSON.stringify(plan,null,2)+'\n',{flag:'wx'});
await writeFile(out+'/canonical-targets.json',JSON.stringify({payload:PAYLOAD,version,ecc:'H',padding:'canonical',purpose:'Pure target/codeword references. Never part of native article source or painted behind it.',targets},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({out,texts,characters:plan.sourceCharacters,sourceSpecSha256:sha(JSON.stringify(plan,null,2)+'\n'),functionCounts,immutableClosure:plan.immutableClosure,specs:specs.map(s=>({id:s.id,sha256:s.htmlSha256}))}));

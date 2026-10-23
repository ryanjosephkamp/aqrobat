from pathlib import Path
s=Path('experiments/prose-qr/integrated-2026-10-10/empirical');p=(s/'resources.mjs').read_text();p=p.replace("out=root+'/resources-01'","out=root+'/resources-02'")
a=p.index('const fonts=');b=p.index('const save=',a)
p=p[:a]+'''const specs=[];
for(const size of [64,80,96])specs.push({id:'futura-O-'+size,font:'Futura-Bold',symbol:'O',size,stroke:size*14/128,fill:'white',width:320,height:256});
for(const size of [100,126,150])specs.push({id:'avenir-o-'+size,font:'Avenir-Black',symbol:'o',size,stroke:size*10/128,fill:'white',width:320,height:256});
for(const [i,font] of ['ArialMT','Arial-BoldMT','HelveticaNeue','Menlo-Regular'].entries())specs.push({id:'body-'+i,font,symbol:'Once our honest words remain readable. ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789.',size:24,stroke:0,fill:'black',width:1800,height:128});
''' +p[b:]
p=p.replace("['resources.mjs','common.mjs'","['resources-02.mjs','common.mjs'")
p=p.replace("hypothesis:'New heavy native", "amendment:'resources-01 stopped after57 captures on Skia descriptor mismatch; remove descriptor-dependent font, retain all failures. Resource01 canvas fields rejected because computed shorthand failed. This batch constructs explicit font syntax and retains per-character metrics. Remaining allowance39 resources before this10-resource batch.',hypothesis:'Calibrate measured Futura O and Avenir o to common pitches; body phrase was unattempted in stopped batch. New heavy native")
p=p.replace("c.font=getComputedStyle(e).font;const m=c.measureText(e.textContent);", "const st=getComputedStyle(e);c.font=`${st.fontStyle} ${st.fontWeight} ${st.fontSize} ${st.fontFamily}`;const m=c.measureText(e.textContent);const glyphs=[];for(let i=0;i<e.textContent.length;i++){range.setStart(e.firstChild,i);range.setEnd(e.firstChild,i+1);const b=range.getBoundingClientRect(),g=c.measureText(e.textContent[i]);glyphs.push({ch:e.textContent[i],rect:{x:b.x,y:b.y,width:b.width,height:b.height},advance:g.width,ascent:g.actualBoundingBoxAscent,descent:g.actualBoundingBoxDescent,left:g.actualBoundingBoxLeft,right:g.actualBoundingBoxRight})}range.selectNodeContents(e);")
p=p.replace("advance:m.width,ascent", "canvasFont:c.font,glyphs,advance:m.width,ascent")
(s/'resources-02.mjs').write_text(p)

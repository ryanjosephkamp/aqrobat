import {composePortable} from '../portable-story-2026-10-11/generator.mjs';

export const WORD_FONT_POINTS=Object.freeze([10,9.5,9,8.5,8]);

// Geometry chooses a layout before any scanner is called. It does not predict scans.
export function chooseAutoFit(input,measurements){
 const attempts=[],accepted=[];
 for(const points of WORD_FONT_POINTS){
  const spec={...input,fontSize:points/0.75};
  const measurement=measurements.find(m=>Math.abs(m.size-spec.fontSize)<1e-9);
  try{
   const layout=composePortable(spec,measurement);
   const letterAdvance=layout.runs.flat().filter(c=>c.text!==' ').reduce((n,c)=>n+c.advance,0);
   const horizontalFill=letterAdvance/(layout.summary.rows*spec.field);
   const verticalEnvelopeFill=layout.summary.envelope/layout.leading;
   const score=horizontalFill*verticalEnvelopeFill;
   attempts.push({points,accepted:true,score,horizontalFill,verticalEnvelopeFill,summary:layout.summary});
   accepted.push({layout,score,points});
  }catch(e){attempts.push({points,accepted:false,error:e.message});}
 }
 accepted.sort((a,b)=>b.score-a.score||b.points-a.points);
 if(!accepted.length){const error=new Error('No complete source fits this page at 8–10pt. Supply more text, explicitly allow complete-source repetition, or use a different page measure. Nothing was shortened.');error.attempts=attempts;throw error;}
 return {layout:accepted[0].layout,attempts,selectionRule:'Highest measured letter-cell fill proxy among valid 8–10pt half-point choices; tie goes to larger type. No reader result used for selection.'};
}

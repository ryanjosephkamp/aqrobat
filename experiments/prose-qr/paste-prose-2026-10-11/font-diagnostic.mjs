import {chromium} from 'playwright';
import {readFile,writeFile} from 'node:fs/promises';
const base='docs/research/prose-qr/paste-prose-2026-10-11/';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{
 const page=await browser.newPage();await page.setContent(await readFile(base+'corpus-01/dialogue.html','utf8'));await page.evaluate(()=>document.fonts.ready);
 const cdp=await page.context().newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');const d=await cdp.send('DOM.getDocument'),rows=[];
 for(const selector of ['#text-body','.line','.word','.word span']){const n=await cdp.send('DOM.querySelector',{nodeId:d.root.nodeId,selector});rows.push({selector,...await cdp.send('CSS.getPlatformFontsForNode',{nodeId:n.nodeId})});}
 await writeFile(base+'font-diagnostic.json',JSON.stringify({at:new Date().toISOString(),imageCaptures:0,readerCalls:0,rows},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(rows));
}finally{await browser.close();}

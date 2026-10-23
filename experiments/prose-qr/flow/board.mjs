import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { format } from "prettier";

const root = resolve("docs/research/prose-qr/phase-02");
const choices = [
  {
    id: "band-023",
    batch: "batch-02",
    title: "Readable story · native reader success",
    note: "Courier New; RGB 120 regular / black bold; 63 lines, up to 126 characters. This exact native layout recovered AQROBAT-TEST with configured ZXing. Baseline readers failed. The story repeats to fill the field.",
  },
  {
    id: "flow-011",
    batch: "batch-01",
    title: "Shorter lines · black weight only",
    note: "Menlo; black regular / bold; 21 lines, up to 42 characters. More usual line length and no gray text. All tested readers failed. This is an appearance comparison, not a scannable result.",
  },
  {
    id: "rect-1",
    batch: "rectangles",
    title: "Ordinary rectangle · reader failure",
    note: "Courier New; 21 lines, up to 63 characters, 1.25-em spacing. Native frame 1117 × 775 px. This more usual paragraph shape failed both baseline and configured readers.",
  },
  {
    id: "word-1",
    batch: "word-style",
    title: "Whole-word emphasis · reader failure",
    note: "Courier New; gray 120; each complete word has one ink state. Four whole-word/corner-preserving variants all failed baseline and configured readers. Better-looking emphasis alone has not preserved decoding.",
  },
];
const cases = [];
for (const c of choices) {
  const layout = JSON.parse(
    await readFile(resolve(root, c.batch, `${c.id}-layout.json`), "utf8"),
  );
  const gzip = await readFile(resolve(root, c.batch, `${c.id}.html.gz`));
  const rows = (await readFile(resolve(root, c.batch, "results.jsonl"), "utf8"))
    .trim()
    .split("\n")
    .map(JSON.parse);
  const row = rows.find((x) => x.id === c.id);
  const frame = row.raw ? row.raw[0] : row;
  cases.push({
    ...c,
    font: layout.spec.font,
    width: frame.width,
    height: frame.height,
    pad: layout.spec.quiet * (layout.unit || frame.width / (21 + 10)),
    plainText: layout.plainText,
    gzip: gzip.toString("base64"),
    htmlGzipSha256: createHash("sha256").update(gzip).digest("hex"),
    nativePng: `${c.batch}/${frame.path}`,
    nativePngSha256: frame.pngSha256,
  });
}
const png = await readFile(resolve(root, "batch-02/raw/band-023-640.png"));
const data = JSON.stringify(cases).replaceAll("<", "\\u003c");
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Aqrobat · continuous prose investigation</title><style>
*{box-sizing:border-box}body{margin:0;background:#f4f0e8;color:#282c34;font:17px/1.55 system-ui,sans-serif}main{max-width:1040px;margin:auto;padding:24px 20px 64px}h1{font:500 clamp(2rem,6vw,3.4rem)/1.1 Georgia,serif;margin:18px 0}h2{font:500 1.65rem Georgia,serif;margin:0 0 14px}.eyebrow{font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#65553f}.lead{max-width:800px;font-size:20px}.panel{background:white;border:1px solid #d5ccbd;border-radius:14px;padding:22px;margin:22px 0;min-width:0}.status{border-left:4px solid #687467;padding:12px 18px;background:#edf0e8}label{display:block;font-weight:650}select{width:100%;font:inherit;padding:12px;margin:8px 0 14px;border:1px solid #b9b2a7;background:white;border-radius:8px}button,.button{display:inline-block;font:inherit;font-weight:600;background:#eee5d6;color:#282c34;border:1px solid #b9a78a;padding:10px 14px;border-radius:8px;text-decoration:none;cursor:pointer}.buttons{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0}a{color:#4d5230;text-underline-offset:3px}small,.muted{color:#60636b;font-size:15px}.reading{margin:18px 0;background:white;border:1px solid #dedbd5;border-radius:8px;padding:18px;overflow-wrap:anywhere;white-space:normal;font:20px/1.55 'Courier New',monospace;letter-spacing:0;font-variant-ligatures:none;color:black}.reading span{white-space:normal}summary{font-weight:650;cursor:pointer;padding:12px 0}details{margin:16px 0;border-top:1px solid #dedbd5}.scroller{width:100%;height:450px;overflow:auto;background:white;border:1px solid #bbb;overscroll-behavior:contain}iframe{display:block;border:0;max-width:none}figure{margin:16px 0}img{display:block;max-width:100%;height:auto;background:white;border:1px solid #dedbd5}figcaption{margin-top:12px;color:#60636b;font-size:15px}.table-wrap{overflow:auto}table{border-collapse:collapse;width:100%;font-size:15px}td,th{text-align:left;border-bottom:1px solid #ddd;padding:10px;vertical-align:top}pre{background:#f4f2ef;padding:16px;overflow:auto;font-size:14px}code{font-family:ui-monospace,monospace}.review li{margin:10px 0}#notice:empty{display:none}@media(max-width:480px){main{padding:18px 12px 48px}.panel{padding:16px}.reading{padding:12px}.lead{font-size:18px}}
</style></head><body><main>
<div class="eyebrow">Aqrobat research · October 8, 2026 · phase 02</div>
<h1>Readable letters.<br>Continuous paragraphs.</h1>
<p class="lead">Your review changed the approach: every part of the field now contains ordinary text, with single word spaces and natural letter spacing. No internal white QR holes or miniature word tiles.</p>
<p class="status"><strong>A real decoding lead:</strong> configured ZXing recovered <code>AQROBAT-TEST</code> from six unchanged native frames with 20-pixel letters. Baseline readers failed every tested text frame. The prose goal remains open.</p>
<section class="panel"><h2>Read the text first</h2>
<label for="choice">Example</label><select id="choice">${choices.map((c) => `<option value="${c.id}">${c.title}</option>`).join("")}</select>
<p id="case-note"></p>
<p class="muted"><strong>Reading excerpt:</strong> actual characters and their original ink styling, at 20 pixels. Words reflow to your screen here, so <strong>this excerpt has no assigned scan result</strong>. The complete tested geometry is available below.</p>
<p id="reading" class="reading" aria-label="Selectable reading excerpt"></p>
<p id="notice" role="status"></p>
<div class="buttons"><button id="save-html">Save exact styled HTML</button><button id="save-text">Save words as TXT</button><a id="original-png" class="button" target="_blank" rel="noopener">Open recorded native PNG</a></div>
<p class="muted">HTML retains the encoding styles and fixed lines; it relies on the recorded font. TXT retains the words and line breaks, but loses weight and gray, so it does not retain this QR signal. The PNG link opens the retained evidence online.</p>
<details id="native-details"><summary>See the exact selectable layout at its native 20-pixel type size</summary><p class="muted">Scroll within this frame. It starts at the text; the complete white margin is still present outside the visible area. The recorded scan result applies to the <em>full</em> native PNG, not a cropped or reflowed view.</p><div id="native-holder" class="scroller"></div><p id="geometry" class="muted"></p></details>
</section>
<section class="panel"><h2>What is actually encoded?</h2><p>A normal QR matrix chooses which regions need darker average ink. Every region gets letters. Dark regions use black bold letters; light regions use regular gray letters. No background blocks, invisible QR, solid overlay, custom distorted glyphs, or runtime AI are involved.</p>
<p>The best successful story has 63 lines and 1,490 words, with up to 126 characters per line. That is a large, repetitive field. The story is repeated only to test typography; it is not an accepted article or an inconspicuous final design. You can still notice the ink pattern when you step back.</p>
<p>Shorter lines, black-only type, ordinary rectangles, and whole-word emphasis looked more natural but did not decode in this investigation. Those failures are retained alongside the successes.</p>
<details><summary>Recorded overview of the successful story</summary><figure><img src="data:image/png;base64,${png.toString("base64")}" width="640" height="640" alt="Recorded 640-pixel browser view of band-023"><figcaption>band-023 at 640 pixels: native letters were reduced to about 5.7 pixels in this recorded view. Both baseline readers failed this exact image. The six native successes refer to the full-size frames, not this small overview.</figcaption></figure></details>
</section>
<section class="panel"><h2>Results without mixing the evidence</h2><div class="table-wrap"><table><thead><tr><th>Check</th><th>Outcome</th></tr></thead><tbody>
<tr><td>64 completed layouts; 148 initial raw frames</td><td>0 exact with either baseline reader</td></tr>
<tr><td>72 extra display views of four retained layouts</td><td>0 exact with either baseline reader</td></tr>
<tr><td>24 native second-batch frames; 3 ZXing configurations each</td><td><strong>6 exact recoveries from 6 native frames</strong></td></tr>
<tr><td>72 small display views; 3 ZXing configurations each</td><td>13 exact attempts across 12 unique views</td></tr>
<tr><td>136 externally processed diagnostic probes</td><td>jsQR 6 exact; ZXing 15 exact</td></tr>
<tr><td>Exported HTML for the 6 native successes</td><td>All native PNG hashes and payloads reproduced exactly</td></tr>
<tr><td>Ordinary paragraph controls with QR styling removed</td><td>Neither of the 2 paragraphs recognized</td></tr>
<tr><td>Phone, physical print, other fonts, Gmail/native paste</td><td>Not tested for this continuation</td></tr>
</tbody></table></div>
<p class="muted">jsQR 1.4.0 and zxing-wasm 3.1.5 are pinned. The configured-reader successes use unchanged PNG input. ZXing performs its own downscaling and thresholding internally. The decoder receives neither the source matrix nor the expected payload; exact matching happens after decoding.</p>
<details><summary>Exact successful native reader settings</summary><pre>{
  formats: ["QRCode"],
  tryHarder: true,
  maxNumberOfSymbols: 1,
  binarizer: "GlobalHistogram",
  downscaleThreshold: 50,
  downscaleFactor: 2
}</pre><p><a href="https://github.com/Sec-ant/zxing-wasm/blob/v3.1.5/src/bindings/readerOptions.ts">Pinned reader option definitions</a> · <a href="https://ryanjosephkamp.github.io/aqrobat/docs/research/prose-qr/phase-02/calibration/receipts.json">Replay/control receipts</a></p></details>
</section>
<section class="panel"><h2>Review and work remaining</h2><p>You can review appearance while AFK. Voice feedback is enough; there is no form or file to export. Describe whether the letters are readable, whether the lines look like ordinary text, and whether the weight/gray pattern still gives the QR away. No scan is required for that review.</p>
<p>The next technical work is to shorten the lines and field, reduce conspicuous styling, investigate stronger black-only contrast, and test multiple payloads and independent readers. Phone and print results remain separate. QR evidence is not an acceptance judgment about prose.</p>
<p>The existing workbench and extension remain version 0.4.2. PR #1 remains a draft; npm remains private and unpublished. Splashery, prior prototypes, the first pilot, and the private PDF archive are preserved.</p>
<div class="buttons"><a class="button" href="https://github.com/ryanjosephkamp/aqrobat/tree/codex/aqrobat-foundation/docs/research/prose-qr/phase-02">Report and frozen data</a><a class="button" href="https://github.com/ryanjosephkamp/aqrobat/pull/1">Draft PR #1</a></div></section>
</main><script id="data" type="application/json">${data}</script><script>
const cases=JSON.parse(document.getElementById('data').textContent);
const choice=document.getElementById('choice');
const reading=document.getElementById('reading');
const holder=document.getElementById('native-holder');
let active=null,html='',revision=0;
async function unpack(base64){const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));const s=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));return new Response(s).text()}
function save(bytes,type,name){const url=URL.createObjectURL(new Blob([bytes],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function nativeView(){if(!active||!html)return;holder.replaceChildren();const frame=document.createElement('iframe');frame.title='Exact native paragraph layout';frame.setAttribute('sandbox','allow-same-origin');frame.width=active.width;frame.height=active.height;frame.srcdoc=html;holder.append(frame);frame.addEventListener('load',()=>{holder.scrollLeft=active.pad;holder.scrollTop=active.pad;},{once:true})}
async function render(){const ticket=++revision;const c=cases.find(c=>c.id===choice.value);document.getElementById('save-html').disabled=true;reading.textContent='Loading retained text…';holder.replaceChildren();try{const source=await unpack(c.gzip);if(ticket!==revision)return;active=c;html=source;document.getElementById('case-note').textContent=c.note;document.getElementById('geometry').textContent=c.width+' × '+c.height+' px full native frame; original 20 px type. Exact tested font: '+c.font+'.';const doc=new DOMParser().parseFromString(source,'text/html');const body=doc.getElementById('text-body');reading.style.fontFamily="'"+c.font+"',monospace";reading.replaceChildren();let count=0;let stop=false;for(const line of body.querySelectorAll('.line')){for(const span of line.children){if(count>=420&&span.textContent===' '){stop=true;break}reading.append(span.cloneNode(true));count+=span.textContent.length}if(stop)break;reading.append(document.createTextNode(' '));count++}document.getElementById('original-png').href='https://ryanjosephkamp.github.io/aqrobat/docs/research/prose-qr/phase-02/'+c.nativePng;document.getElementById('save-html').disabled=false;document.getElementById('notice').textContent='';if(document.getElementById('native-details').open)nativeView()}catch(e){document.getElementById('notice').textContent='This browser could not unpack the retained HTML. Use the online report and PNG links. '+e.message}}
choice.addEventListener('change',render);document.getElementById('native-details').addEventListener('toggle',e=>{if(e.target.open)nativeView();else holder.replaceChildren()});document.getElementById('save-html').addEventListener('click',()=>{if(active&&html)save(html,'text/html;charset=utf-8',active.id+'-exact.html')});document.getElementById('save-text').addEventListener('click',()=>{if(active)save(active.plainText,'text/plain;charset=utf-8',active.id+'-words.txt')});render();
</script></body></html>`;
await writeFile(
  resolve(root, "index.html"),
  await format(html, { parser: "html" }),
);
console.log(
  JSON.stringify({
    cases: cases.map((c) => c.id),
    htmlBytes: Buffer.byteLength(html),
  }),
);

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { format } from "prettier";
import { sha } from "./capture.mjs";

const root = resolve("docs/research/prose-qr/phase-03");
const choices = [
  {
    id: "refine-005",
    batch: "refine-01",
    proof: "txt-url-proof",
    title: "Real URL · plain TXT verified",
    note: "The exact native text and saved TXT recovered https://example.com/ with configured ZXing. The words are fabricated. Menlo, regular 400, black, 20 px; 50 lines, up to 100 characters.",
  },
  {
    id: "refine-001",
    batch: "refine-01",
    proof: "txt-varied-proof",
    title: "More varied word forms · plain TXT verified",
    note: "More varied fabricated words, still conspicuous and nonsensical. Exact native text and TXT recovered AQROBAT-TEST with a different standard ZXing downscaling configuration. Menlo, regular 400, black, 20 px.",
  },
  {
    id: "plain-003",
    batch: "plain-02",
    proof: "txt-proof",
    title: "First regular black result · plain TXT verified",
    note: "The first verified regular-weight, black ASCII result. Exact native text and TXT recovered AQROBAT-TEST with configured ZXing. Fabricated and repetitive word forms; 42 lines, up to 84 characters.",
  },
  {
    id: "words-2",
    batch: "words-01",
    title: "Real words only · decoding failed",
    note: "Actual English word forms in both light and dark regions, with no empty internal regions. Random word order, not coherent prose. All tested baseline and configured readers failed this native frame.",
  },
  {
    id: "compact-4",
    batch: "compact-01",
    title: "Shorter URL field · decoding failed",
    note: "Shorter lines and fewer rows: Menlo, 20 px, 25 lines, up to 50 characters, more varied fabricated words. All tested readers failed, including ten additional standard ZXing configurations.",
  },
];
const cases = [];
for (const c of choices) {
  const layout = JSON.parse(
    await readFile(resolve(root, c.batch, `${c.id}-layout.json`), "utf8"),
  );
  const rows = (await readFile(resolve(root, c.batch, "results.jsonl"), "utf8"))
    .trim()
    .split("\n")
    .map(JSON.parse);
  const r = rows.find((x) => x.id === c.id);
  const source = c.proof
    ? await readFile(resolve(root, c.proof, `${c.id}-from-txt.html`), "utf8")
    : gunzipSync(
        await readFile(resolve(root, c.batch, `${c.id}.html.gz`)),
      ).toString("utf8");
  const receipts = c.proof
    ? JSON.parse(
        await readFile(resolve(root, c.proof, "receipts.json"), "utf8"),
      )
    : null;
  cases.push({
    ...c,
    plainText: layout.plainText,
    html: source,
    recipe: layout.spec,
    width: r.width,
    height: r.height,
    pad: layout.spec.quiet * layout.unit,
    sourceTXTSha256: sha(layout.plainText),
    sourceHTMLSha256: sha(source),
    nativePNGSha256: r.pngSha256,
    nativePNG: `${c.batch}/${r.path}`,
    receipts,
  });
}
const png = await readFile(resolve(root, cases[0].nativePNG));
const data = JSON.stringify(cases).replaceAll("<", "\\u003c");
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Aqrobat · regular black text QR</title><style>
*{box-sizing:border-box}body{margin:0;background:#f4f0e8;color:#262c34;font:17px/1.55 system-ui,sans-serif}main{max-width:1040px;margin:auto;padding:28px 20px 64px}h1{font:500 clamp(2.2rem,6vw,3.5rem)/1.1 Georgia,serif;margin:16px 0}h2{font:500 1.65rem Georgia,serif;margin:0 0 16px}.eyebrow{font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#62523e}.lead{font-size:20px;max-width:850px}.panel{background:white;border:1px solid #d5ccbd;border-radius:14px;padding:22px;margin:22px 0;min-width:0}.status{background:#e8efe8;border-left:4px solid #526b59;padding:16px}.muted{color:#60636b;font-size:15px}a{color:#4c5235;text-underline-offset:3px}label{display:block;font-weight:650}select{width:100%;font:inherit;padding:12px;margin:8px 0;border:1px solid #b9b2a7;border-radius:8px;background:white}button,.button{font:inherit;font-weight:600;display:inline-block;border:1px solid #b9a78a;background:#eee5d6;color:#262c34;border-radius:8px;padding:10px 14px;text-decoration:none;cursor:pointer}.buttons{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0}.reading{font:400 20px/1.5 Menlo,monospace;color:black;background:white;border:1px solid #dedbd5;padding:16px;white-space:normal;overflow-wrap:anywhere;letter-spacing:0;font-variant-ligatures:none}.scroller{height:420px;width:100%;overflow:auto;border:1px solid #bbb;background:white;overscroll-behavior:contain}iframe{display:block;border:0;max-width:none}summary{font-weight:650;cursor:pointer;padding:12px 0}details{margin-top:16px;border-top:1px solid #ddd}textarea{display:block;width:100%;height:340px;resize:vertical;white-space:pre;overflow:auto;font:400 16px/1.2 Menlo,monospace;color:black;background:white;padding:16px;border:1px solid #bbb}pre{font:14px/1.5 ui-monospace,monospace;overflow:auto;background:#f3f1ee;padding:16px}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;font-size:15px}td,th{text-align:left;vertical-align:top;padding:10px;border-bottom:1px solid #ddd}figure{margin:16px 0}img{max-width:100%;height:auto;display:block}figcaption{font-size:15px;color:#60636b;margin-top:12px}li{margin:8px 0}#notice:empty{display:none}@media(max-width:480px){main{padding:18px 12px 48px}.panel{padding:16px}.lead{font-size:18px}.reading{padding:12px}}
</style></head><body><main><div class="eyebrow">Aqrobat research · October 9, 2026 · phase 03</div><h1>A QR signal in<br>regular black text.</h1>
<p class="lead">The next step works at a feasibility level: a real URL survives a saved ASCII text file, with one font, one regular weight, and black ink throughout. The signal comes from which letters and word forms occupy each region.</p>
<p class="status"><strong>What is verified:</strong> six generated native frames decode with specified standard ZXing settings. Three saved TXT examples reproduce their original pixels and exact payloads in one ordinary text element. <strong>What is still open:</strong> meaningful prose, baseline readers, phones, print, and arbitrary copy/paste destinations.</p>
<section class="panel"><h2>Read it before scanning it</h2><label for="choice">Example</label><select id="choice">${choices.map((c) => `<option value="${c.id}">${c.title}</option>`).join("")}</select><p id="case-note"></p>
<p class="muted">This selectable excerpt uses the actual characters at regular weight 400, in black. It reflows for your phone, so <strong>the excerpt has no assigned scan result</strong>. These are fabricated words or word salad, not an accepted article.</p><p id="reading" class="reading"></p>
<p id="notice" role="status"></p><div class="buttons"><button id="copy-text">Copy plain TXT</button><button id="save-text">Save TXT</button><button id="save-html">Save exact text HTML</button><button id="save-recipe">Save recipe</button><a id="original-png" class="button" target="_blank" rel="noopener">Recorded native PNG</a></div>
<p class="muted">TXT contains the encoding characters and line breaks; there is no per-letter formatting to lose. Keep its capitalization, single spaces, fixed lines, monospaced font, and outer white margin. Another font or automatic wrapping changes the pixels. The exact HTML records the tested geometry and requires the recorded font.</p>
<details id="native-details"><summary>Exact selectable layout · original 20 px type</summary><p class="muted">Scroll inside this frame. It starts at the letters; the complete outer white margin remains present. Decoding receipts refer to the full native frame, not a cropped view.</p><div id="native-holder" class="scroller"></div><p id="geometry" class="muted"></p></details>
<details id="text-details"><summary>Plain TXT and copy fallback</summary><p class="muted">This field is an export inspector, not a tested scanning surface. If clipboard access is unavailable, select the entire field or save TXT.</p><button id="select-text">Select full text</button><textarea id="plain" readonly wrap="off" aria-label="Complete plain text export"></textarea></details>
<details><summary>Exact successful reader configuration for this example</summary><pre id="config"></pre></details></section>
<section class="panel"><h2>How the two techniques differ</h2><p><strong>Styled prose:</strong> the preserved October 8 approach uses a continuous story, with individual letters assigned black bold or gray regular styling. It needs styled HTML. It was not a successful whole-word-only bolding method.</p><p><strong>Plain ASCII:</strong> this new method uses letters whose ordinary shapes naturally put more or less black ink on the page. An optimizer chooses complete fabricated word forms and normal spaces to match a QR matrix's regional ink pattern. It changes whole-word capitalization, while all letters retain the same weight and color. Generation needs no AI or server. There are no hidden QR blocks, unusual spacing characters, empty internal QR holes, or distorted glyphs.</p>
<p>The strongest native examples use Menlo at 20 px, four characters and two lines per QR region, with roughly 1.2-em line spacing. The contrast can still reveal the QR pattern, and the vocabulary is artificial. Removing capitalization or rearranging the words erased recovery in all six tested negative controls.</p><div class="buttons"><a class="button" href="https://ryanjosephkamp.github.io/aqrobat/docs/research/prose-qr/phase-02/">Preserved styled-prose demo</a><a class="button" href="https://github.com/ryanjosephkamp/aqrobat/tree/codex/aqrobat-foundation/docs/research/prose-qr/techniques">Separate technique records</a></div>
<details><summary>Recorded URL frame · scaled overview</summary><figure><img src="data:image/png;base64,${png.toString("base64")}" width="1686" height="1686" alt="Recorded native regular black URL text frame, scaled to fit this page"><figcaption>This is the retained native PNG displayed smaller for an overview. The native result does not certify this scaled display; open the original PNG for its full geometry.</figcaption></figure></details></section>
<section class="panel"><h2>Results with the limits intact</h2><div class="table-wrap"><table><thead><tr><th>Check</th><th>Outcome</th></tr></thead><tbody><tr><td>65 completed generated native frames</td><td>0 exact with either baseline reader</td></tr><tr><td>22 regular-weight color/story comparisons</td><td>0 configured recoveries</td></tr><tr><td>43 regular black letter/word-choice frames</td><td>3 primary configured successes; 3 additional unique successes in the option sweep</td></tr><tr><td>Additional standard ZXing settings on retained PNGs</td><td>500 attempts; 7 exact attempts across 3 additional frames</td></tr><tr><td>3 TXT round trips</td><td>Exact payloads and original PNG hashes reproduced; 6 rearranged/lowercased negatives failed</td></tr><tr><td>Same two TXT files, four fonts, 20/24 px, ordinary 1.2-em leading</td><td>16 native renderings; 9 configured successes across 7 renderings; 0 baseline</td></tr><tr><td>8 real-word-only and 8 smaller-field trials</td><td>No recovery with any tested reader setting</td></tr><tr><td>Phone / physical print / TextEdit / email</td><td>Not tested for these new examples</td></tr></tbody></table></div><p class="muted">jsQR 1.4.0 and zxing-wasm 3.1.5. Each configured reader receives unchanged pixels and standard options. ZXing internally downsamples and thresholds; no external crop, repair, or thresholding is used in this phase. Neither the expected payload nor the source matrix goes to the decoder. Exact comparison happens afterward.</p>
<details><summary>Font portability · at least one of three configured settings</summary><div class="table-wrap"><table><thead><tr><th>Font / size</th><th>AQROBAT TXT</th><th>URL TXT</th></tr></thead><tbody><tr><td>Menlo 20 / 24 px</td><td>Pass / pass</td><td>Pass / pass</td></tr><tr><td>Monaco 20 / 24 px</td><td>Fail / pass</td><td>Fail / pass</td></tr><tr><td>Courier New 20 / 24 px</td><td>Fail / fail</td><td>Pass / fail</td></tr><tr><td>Courier 20 / 24 px</td><td>Fail / fail</td><td>Fail / fail</td></tr></tbody></table></div><p class="muted">These are measured browser font/size conditions, not a portable-paste guarantee. Actual platform fonts and PNG hashes are retained in the report.</p></details></section>
<section class="panel"><h2>Your review and the next boundary</h2><p>You can review the appearance now from your phone; voice notes are enough. Compare the URL, varied-word, and failed real-word examples. When you can scan, report the <strong>case name, exact decoded content, phone app, and whether you used exact HTML, original PNG, TXT in another app, or a scaled page view</strong>. Record failures too. No scan is required while AFK.</p><p>The next research target is better vocabulary and less conspicuous capitalization while retaining an independently decoded signal. Meaningful paragraphs, smaller fields, more payloads, phone behavior, and print remain open. The emoji atlas and Gmail extension review remain separate product work.</p><p>Both techniques are backed up on existing draft PR #1. The workbench and extension remain 0.4.2; npm is private and unpublished. No new project, chat, agent, host, release, or changes to Splashery or the private PDF archive.</p><div class="buttons"><a class="button" href="https://github.com/ryanjosephkamp/aqrobat/tree/codex/aqrobat-foundation/docs/research/prose-qr/phase-03">Full report and raw evidence</a><a class="button" href="https://github.com/ryanjosephkamp/aqrobat/pull/1">Draft PR #1</a></div><details><summary>Safe continuation prompt</summary><pre>Resume Aqrobat from docs/research/prose-qr/phase-03/CHECKPOINT.md. Verify the checkpoint first. Preserve the styled-prose and plain-ASCII methods as separate deliverables. Continue regular-weight black text research toward less conspicuous capitalization and real-word paragraph structure. Use fixed bounded batches, unchanged-output independent decoding, and separate phone/print receipts. Keep PR #1 draft, npm private and unpublished, and the product, extension, old prototypes, Splashery, PDF archive, other jobs and chats unchanged. Do not launch agents or new chats. Do not treat configured-reader feasibility as coherent prose or portable phone scanning.</pre></details></section>
</main><script id="data" type="application/json">${data}</script><script>
const cases=JSON.parse(document.getElementById('data').textContent),choice=document.getElementById('choice'),holder=document.getElementById('native-holder');let active;
function save(value,type,name){const u=URL.createObjectURL(new Blob([value],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
function nativeView(){holder.replaceChildren();if(!active)return;const c=active,f=document.createElement('iframe');f.title='Exact regular black text layout';f.setAttribute('sandbox','allow-same-origin');f.width=c.width;f.height=c.height;f.srcdoc=c.html;f.addEventListener('load',()=>{holder.scrollLeft=c.pad;holder.scrollTop=c.pad},{once:true});holder.append(f)}
function render(){active=cases.find(c=>c.id===choice.value);document.getElementById('case-note').textContent=active.note;document.getElementById('reading').style.fontFamily="'"+active.recipe.font+"',monospace";document.getElementById('reading').textContent=active.plainText.slice(0,600).replaceAll('\\n',' ');document.getElementById('plain').value=active.plainText;document.getElementById('geometry').textContent=active.width+' × '+active.height+' px full frame; '+active.recipe.font+' 20 px, weight 400, black throughout.';document.getElementById('config').textContent=active.receipts?JSON.stringify(active.receipts.configuredReader,null,2):'No successful configuration recorded for this example.';document.getElementById('original-png').href='https://ryanjosephkamp.github.io/aqrobat/docs/research/prose-qr/phase-03/'+active.nativePNG;document.getElementById('notice').textContent='';holder.replaceChildren();if(document.getElementById('native-details').open)nativeView()}
choice.addEventListener('change',render);document.getElementById('native-details').addEventListener('toggle',e=>e.target.open?nativeView():holder.replaceChildren());document.getElementById('save-text').addEventListener('click',()=>save(active.plainText,'text/plain;charset=utf-8',active.id+'.txt'));document.getElementById('save-html').addEventListener('click',()=>save(active.html,'text/html;charset=utf-8',active.id+'-exact.html'));document.getElementById('save-recipe').addEventListener('click',()=>save(JSON.stringify({spec:active.recipe,sourceTXTSha256:active.sourceTXTSha256,sourceHTMLSha256:active.sourceHTMLSha256,nativePNGSha256:active.nativePNGSha256,reader:active.receipts?.configuredReader||null},null,2)+'\\n','application/json',active.id+'-recipe.json'));
function selectFull(){document.getElementById('text-details').open=true;const t=document.getElementById('plain');t.focus();t.select()}
document.getElementById('select-text').addEventListener('click',selectFull);document.getElementById('copy-text').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(active.plainText);document.getElementById('notice').textContent='Plain TXT copied. Keep its case and line breaks; use the recorded font and geometry.'}catch{selectFull();document.getElementById('notice').textContent='Clipboard access unavailable. Full TXT selected below; use Copy or Save TXT.'}});render();
</script></body></html>`;
const rendered = await format(html, { parser: "html" });
await writeFile(
  resolve(root, "index.html"),
  await format(rendered, { parser: "html" }),
  { flag: "wx" },
);
console.log(
  JSON.stringify({
    cases: cases.map((c) => c.id),
    bytes: Buffer.byteLength(html),
  }),
);

"""Build a local, self-contained planning handoff. No research is executed."""
from pathlib import Path
import html
import re

root = Path(__file__).resolve().parent

def inline(s):
    s = html.escape(s)
    s = re.sub(r'`([^`]+)`', r'<code>\1</code>', s)
    s = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', s)
    return re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', s)

def render(s):
    blocks, para, kind = [], [], None
    def flush():
        nonlocal para, kind
        if para:
            tag = 'li' if kind else 'p'
            blocks.append(f'<{tag}>' + inline(' '.join(para)) + f'</{tag}>')
            para = []
    def close():
        nonlocal kind
        flush()
        if kind:
            blocks.append(f'</{kind}>')
            kind = None
    for line in s.splitlines():
        if not line.strip():
            close()
        elif re.match(r'^#{1,6} ', line):
            close()
            n = len(line.split(' ')[0])
            blocks.append(f'<h{n}>' + inline(line[n+1:]) + f'</h{n}>')
        elif re.match(r'^(?:- |\d+\. )', line):
            new = 'ul' if line.startswith('- ') else 'ol'
            if kind != new:
                close(); kind = new; blocks.append(f'<{kind}>')
            else:
                flush()
            para.append(re.sub(r'^(?:- |\d+\. )', '', line))
        else:
            para.append(line.strip())
    close()
    return '\n'.join(blocks)

ideas = (root/'IDEAS.md').read_text()
prompt = (root/'RUN-PROMPT.md').read_text()
readme = (root/'README.md').read_text()
priority = {'01','02','03','04','07','15','16','17','18'}
groups = []
for group in re.split(r'^## ', ideas, flags=re.M)[1:]:
    title, _, rest = group.partition('\n')
    if not re.search(r'^### ', rest, re.M):
        continue
    cards = []
    for card in re.split(r'^### ', rest, flags=re.M)[1:]:
        heading, _, body = card.partition('\n')
        ident = heading[:2]
        cards.append('<details class="idea" data-priority="'+str(ident in priority).lower()+'"><summary><span class="number">'+ident+'</span><span>'+inline(heading[5:])+'</span></summary><div class="idea-body">'+render(body)+'</div></details>')
    groups.append('<section class="idea-group"><h3>'+inline(title)+'</h3><div class="cards">'+''.join(cards)+'</div></section>')

readme_sections = re.split(r'^## ', readme, flags=re.M)
method_sections = []
for s in readme_sections[1:]:
    title, _, body = s.partition('\n')
    if title in ['What is known, and what is only a hypothesis','Run limits','Planning verification and custody','Primary sources consulted']:
        method_sections.append('<details class="note"><summary>'+inline(title)+'</summary><div>'+render(body)+'</div></details>')

html_source = '''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Aqrobat · Sol's three-hour research plan</title>
<style>
:root{color-scheme:light;--ink:#202638;--muted:#525d71;--paper:#f8f6f0;--card:#fffdf8;--line:#d9d9d1;--accent:#51458b;--wash:#eeebfa;--teal:#185f59}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);font:17px/1.6 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}a{color:var(--accent);text-underline-offset:3px}button,input,textarea{font:inherit}button,.button{display:inline-block;border:1px solid var(--accent);border-radius:10px;padding:11px 17px;cursor:pointer;background:var(--accent);color:white;font-weight:650;text-decoration:none}button.secondary,.button.secondary{background:transparent;color:var(--accent)}button:focus-visible,a:focus-visible,input:focus-visible,summary:focus-visible,textarea:focus-visible{outline:3px solid #ab6d16;outline-offset:4px}header{border-bottom:1px solid var(--line);padding:16px max(20px,calc((100vw - 1080px)/2));display:flex;gap:14px;justify-content:space-between;align-items:center;font-size:14px}.brand{font-weight:800;letter-spacing:.08em}.status{color:var(--teal);font-weight:650}main{max-width:1120px;padding:38px 20px 65px;margin:auto}h1,h2{font-family:Georgia,"Times New Roman",serif;letter-spacing:-.035em;line-height:1.08}h1{font-size:clamp(38px,6vw,66px);max-width:850px;margin:12px 0 22px}h2{font-size:clamp(30px,4vw,42px);margin:0 0 18px}h3{font-size:21px;line-height:1.3}p{margin:0 0 16px}.eyebrow{font-size:13px;text-transform:uppercase;letter-spacing:.1em;font-weight:750;color:var(--teal)}.lead{font-size:21px;max-width:810px;color:var(--muted)}.actions{display:flex;gap:12px;flex-wrap:wrap;margin:22px 0 10px}.small{font-size:14px;color:var(--muted)}.hero{padding-bottom:30px}.band{display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin:25px 0}.band article{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:22px}.band h3{margin:5px 0 12px}.band p{font-size:16px}.band .num{color:var(--accent);font-size:13px;font-weight:800}.panel{border:1px solid var(--line);border-radius:18px;background:var(--card);padding:26px;margin:26px 0}.callout{background:var(--wash);border-left:4px solid var(--accent);padding:19px 21px;border-radius:0 12px 12px 0;margin:20px 0}.callout p:last-child{margin:0}.chain{display:flex;gap:10px;align-items:stretch;flex-wrap:wrap}.chain span{background:#f1f3ee;border-radius:9px;padding:12px 14px;flex:1;min-width:175px;font-size:15px}.chain b{display:block;color:var(--teal)}.timeline{display:grid;grid-template-columns:1fr 1fr;gap:15px}.timeline p{margin:0}.toolbar{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:20px 0}.toolbar label{font-size:15px}.toolbar input[type=search]{padding:11px 14px;border:1px solid #aab0ba;border-radius:10px;flex:1;min-width:170px;background:white;color:var(--ink);width:100%}.toolbar input[type=checkbox]{accent-color:var(--accent);width:18px;height:18px;vertical-align:middle}.cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;align-items:start}.idea-group{margin:28px 0}.idea{border:1px solid var(--line);border-radius:12px;background:var(--card);overflow:hidden}.idea summary{display:flex;gap:12px;padding:17px;cursor:pointer;line-height:1.45;font-size:16px;font-weight:650;list-style:none}.idea summary:after{content:'+';margin-left:auto;color:var(--accent)}.idea[open] summary:after{content:'−'}.number{color:var(--teal);font:700 14px/1.7 ui-monospace,monospace}.idea-body{padding:0 18px 5px;font-size:16px}.note{border-top:1px solid var(--line);padding:17px 0}.note summary{cursor:pointer;font-weight:700}.note>div{padding-top:17px}.note p,.note li{font-size:16px}code{font: .88em ui-monospace,SFMono-Regular,Menlo,monospace;background:#ecebe7;padding:1px 4px;border-radius:4px;overflow-wrap:anywhere}textarea{display:block;width:100%;min-height:390px;resize:vertical;background:#fff;color:var(--ink);border:1px solid #aab0ba;border-radius:10px;padding:16px;font:14px/1.6 ui-monospace,Menlo,monospace;white-space:pre-wrap;overflow-wrap:break-word}#notice{min-height:24px;color:var(--teal);font-weight:600}#prompt-region{scroll-margin-top:20px}ul,ol{padding-left:23px}li{margin:7px 0}footer{padding:22px 0;border-top:1px solid var(--line);margin-top:35px;font-size:14px;color:var(--muted)}[hidden]{display:none!important}a,p,li,summary{overflow-wrap:break-word}@media(max-width:650px){main{padding-top:26px}.band,.cards,.timeline{grid-template-columns:1fr}.panel{padding:20px}.lead{font-size:19px}header{align-items:flex-start}.status{max-width:135px;text-align:right}h1{margin-top:9px}.band{gap:10px}.band article{padding:19px}.toolbar{align-items:flex-start}.toolbar input[type=search]{flex-basis:100%}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}@media print{body{background:white;font-size:11pt}.actions,.toolbar,#notice,textarea{display:none}main{max-width:none;padding:0}.band,.cards{display:block}.idea,.panel{break-inside:avoid;margin-bottom:10px}details:not([open])>.idea-body{display:block}header{padding:10px 0}.small{font-size:10pt}}
</style></head><body>
<header><span class="brand">AQROBAT / RESEARCH</span><span class="status">Planning only · goal unsolved</span></header>
<main>
<section class="hero"><p class="eyebrow">October 10, 2026 · A handoff for GPT-6.1 Sol</p><h1>Three hours.<br>Several better questions.</h1><p class="lead">Forty ideas and checks, organized around a practical shift: connect the finder research to the readable paragraph that must carry the actual message.</p>
<div class="actions"><button id="copy-top">Copy Sol's run prompt</button><a class="button secondary" href="#idea-bank">Explore the 40 ideas</a></div><p class="small">Switch to GPT-6.1 Sol in this chat, keep extra-high effort, then send the prompt. No experiment or timer has started. No new chat, project, or goal mode is needed.</p></section>
<section aria-labelledby="routes"><h2 id="routes">The three priority routes</h2><div class="band"><article><span class="num">01 / DIAGNOSE</span><h3>Check the scale</h3><p>Why does the reader return 113 where the source expects 125? Can readable body text carry enough detail at that same scale?</p></article><article><span class="num">02 / CHANGE THE STRUCTURE</span><h3>Try a different native shape</h3><p>Select a few genuinely different letter contours or letter combinations that address the failing diagonal. Avoid another broad font sweep.</p></article><article><span class="num">03 / MAKE IT PROSE</span><h3>Build an article layout</h3><p>Try larger initials with smaller readable body text, or a finder formed from several words. Check the whole paragraph early.</p></article></div></section>
<div class="callout"><p><strong>A concrete lead, not a solved problem.</strong> Saved PILL stroke measurements predict a dimension near 113. That may explain the source-model mismatch. Its actual diagonal still fails. Sol should investigate both, then keep going toward real payload recovery.</p></div>
<section class="panel"><h2>What counts as ready?</h2><div class="chain"><span><b>1 · Structure</b>Intended first-selected geometry and complete native runs pass.</span><span><b>2 · Readable prose</b>Visible words form a readable paragraph at its declared page size.</span><span><b>3 · Exact decoding</b>At least two independent ordinary readers recover the fixed payload.</span><span><b>4 · Your phone</b>Only then ask for your later Samsung review.</span></div><p class="small" style="margin-top:17px">A finder-only pass is progress, not a phone candidate. Styled success stays separate from unstyled prose. Automated evidence never becomes a claimed phone result.</p></section>
<section class="panel"><h2>Autonomy with a real end time</h2><div class="timeline"><p><strong>Keep moving.</strong> Sol can preregister and run several small phases without asking after each failure. The ideas are options, not a checklist to exhaust.</p><p><strong>Finish by three hours.</strong> Stop starting experiments at minute 160. Reserve the final 20 minutes for evidence, backup, and a clean handback.</p><p><strong>Keep the run modest.</strong> At most 24 full native proposals, four conditional payload proposals, and 40 MB of new files; one owned browser and one heavy job.</p><p><strong>Stop earlier for a credible result.</strong> Deliver a readable, reproducible automated candidate. Otherwise report the remaining obstacle honestly.</p></div></section>
<section id="idea-bank"><p class="eyebrow">A menu, not a sweep</p><h2>40 ideas and checks</h2><p>Start with the recommended routes. Conditional payload ideas remain behind the existing structure gate. Lower-priority ideas are fallbacks, not reasons to expand the run.</p><div class="toolbar"><input id="search" type="search" aria-label="Search ideas" placeholder="Search: paragraph, diagonal, mask…"><label><input id="priority" type="checkbox"> Priority ideas only</label><button class="secondary" id="expand">Expand visible ideas</button></div><p id="count" class="small" role="status">40 ideas visible</p>@@IDEAS@@</section>
<section class="panel"><h2>Evidence, limits, and references</h2>@@NOTES@@<p class="small">The full <a href="README.md">planning notes</a> and <a href="IDEAS.md">idea bank</a> are saved beside this HTML. Prior sealed research remains unchanged.</p></section>
<section class="panel" id="prompt-region"><p class="eyebrow">Send after switching models</p><h2>The execution prompt</h2><p>The prompt authorizes the bounded run and carries forward the preservation rules. You can copy it directly or download the Markdown file.</p><div class="actions"><button id="copy">Copy full prompt</button><button class="secondary" id="select">Select prompt</button><button class="secondary" id="download">Download prompt</button></div><p id="notice" role="status" aria-live="polite"></p><textarea id="prompt" readonly aria-label="Full Sol execution prompt" spellcheck="false">@@PROMPT@@</textarea><p class="small" style="margin-top:12px">Clipboard unavailable? Select prompt highlights the full text for manual copying. The three-hour clock begins when Sol starts executing, not when you open this file.</p></section>
<footer>Prepared from session D at research baseline <code>227eaff</code>. Research remains unsolved. No new native QR captures or phone results were produced by this planning handoff.</footer>
</main><script>
const promptBox=document.getElementById('prompt'), notice=document.getElementById('notice');
function selectPrompt(){document.getElementById('prompt-region').scrollIntoView();promptBox.focus();promptBox.select();promptBox.setSelectionRange(0,promptBox.value.length);notice.textContent='Full prompt selected. Use your device’s Copy command.';}
async function copyPrompt(){try{if(!navigator.clipboard)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(promptBox.value);notice.textContent='Full prompt copied. Switch to Sol and paste it into this chat.';}catch{selectPrompt();}}
document.getElementById('copy').addEventListener('click',copyPrompt);document.getElementById('copy-top').addEventListener('click',async()=>{await copyPrompt();document.getElementById('notice').scrollIntoView({block:'center'});});document.getElementById('select').addEventListener('click',selectPrompt);
document.getElementById('download').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([promptBox.value],{type:'text/markdown;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='aqrobat-sol-three-hour-run.md';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
const cards=[...document.querySelectorAll('.idea')], search=document.getElementById('search'), priority=document.getElementById('priority');
function filterIdeas(){const q=search.value.trim().toLowerCase();let n=0;for(const c of cards){c.hidden=!(c.textContent.toLowerCase().includes(q)&&(!priority.checked||c.dataset.priority==='true'));if(!c.hidden)n++;}for(const g of document.querySelectorAll('.idea-group'))g.hidden=![...g.querySelectorAll('.idea')].some(c=>!c.hidden);document.getElementById('count').textContent=n+' of 40 ideas visible';}
search.addEventListener('input',filterIdeas);priority.addEventListener('change',filterIdeas);document.getElementById('expand').addEventListener('click',()=>{const visible=cards.filter(c=>!c.hidden),open=visible.some(c=>!c.open);for(const c of visible)c.open=open;document.getElementById('expand').textContent=open?'Collapse visible ideas':'Expand visible ideas';});
</script></body></html>'''
html_source = html_source.replace('@@IDEAS@@','\n'.join(groups)).replace('@@NOTES@@','\n'.join(method_sections)).replace('@@PROMPT@@',html.escape(prompt))
(root/'index.html').write_text(html_source)
print('Built planning HTML; no experiments executed.')

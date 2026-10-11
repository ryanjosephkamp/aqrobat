import { readFile, writeFile } from "node:fs/promises";
import { format } from "prettier";
const root = "docs/research/prose-qr/session-2026-10-10/",
  a = JSON.parse(await readFile(root + "analysis.json")),
  escape = (s) =>
    String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;"),
  png = async (p) =>
    "data:image/png;base64," + (await readFile(p)).toString("base64"),
  prompt = (await readFile(root + "CHECKPOINT.md", "utf8"))
    .split("<!-- RESUME START -->")[1]
    .split("<!-- RESUME END -->")[0]
    .trim();
const exact = a.exactOrdinaryNativeReturns,
  rows = a.fullPayloadOrdinaryProfiles
    .map(
      (r) =>
        `<tr><th>${escape(r.reader)}</th><td>${r.exact === true ? "Exact URL" : r.exact === false ? "No exact URL" : "Unknown / see error"}</td></tr>`,
    )
    .join("");
const labels = {
  32: "Continuous context and source guards",
  33: "Staggered word spaces",
  34: "Saved trace replay",
  35: "Denser Monaco words",
  36: "Intrinsically heavy Impact — separate lane",
  37: "Lossless numerical trace storage",
  38: "Page / row-period alignment",
  39: "Saved Impact trace replay",
  40: "Ordinary reader controls",
  41: "Native word-period model",
  42: "Flat cell-density words",
  43: "Glyph-position source model and full context",
  44: "Ordinary outline repeat",
  45: "One full URL confirmation",
  46: "Two more ordinary reader implementations",
  47: "Read-only scale diagnosis",
  48: "Fresh complete Vision profile after harness timeout",
};
const phaseRows = a.phases
  .map(
    (r) =>
      `<tr><th><a href="../phase-${r.phase}/README.md">${r.phase}</a></th><td>${labels[r.phase]}</td></tr>`,
  )
  .join("");
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Aqrobat · October 10 research checkpoint</title><style>
:root{color-scheme:light dark;--bg:#f4f2ec;--paper:#fffefa;--ink:#242e38;--muted:#5b6470;--line:#d7d9d7;--accent:#215f69;--soft:#e5efec}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.6 system-ui,sans-serif}main{max-width:1000px;margin:auto;padding:28px 18px 60px}h1{font-size:clamp(30px,5vw,50px);line-height:1.14;letter-spacing:-.025em}h2{font-size:23px;line-height:1.3}h3{font-size:18px}a{color:var(--accent);overflow-wrap:anywhere}p{margin:1em 0}.eyebrow{letter-spacing:.09em;text-transform:uppercase;font-size:12px;font-weight:750}.card{padding:24px;background:var(--paper);border:1px solid var(--line);border-radius:16px;margin:20px 0}.status{display:inline-block;padding:5px 11px;background:var(--soft);border-radius:7px;font-weight:700}.muted,figcaption{color:var(--muted);font-size:14px}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.stat{padding:16px;border:1px solid var(--line);border-radius:10px}.stat b{display:block;font-size:28px}.scroll{max-width:100%;overflow:auto}img{display:block;max-width:100%;height:auto;background:white}figure{margin:20px 0}figure.native img{max-width:none;width:720px}table{border-collapse:collapse;width:100%;font-size:15px}th,td{text-align:left;padding:10px;border-bottom:1px solid var(--line);vertical-align:top}th{font-weight:650}textarea{display:block;resize:vertical;width:100%;min-height:340px;padding:14px;font:14px/1.5 ui-monospace,monospace;background:var(--bg);color:var(--ink);border:1px solid var(--line);border-radius:8px}button{padding:11px 16px;font:inherit;border:1px solid var(--accent);border-radius:8px;background:var(--soft);color:var(--ink);cursor:pointer;margin-top:12px}code{font-size:.92em;overflow-wrap:anywhere}li{margin:8px 0}.pair{display:grid;grid-template-columns:1fr 1fr;gap:14px}.pair img{max-width:100%}@media(max-width:600px){.stats,.pair{grid-template-columns:1fr}.card{padding:18px}main{padding:18px 14px 50px}}@media(prefers-color-scheme:dark){:root{--bg:#121c23;--paper:#1a2730;--ink:#e7efef;--muted:#b2c2c8;--line:#3b4a51;--accent:#9dd9df;--soft:#263d41}}
</style></head><body><main><div class="eyebrow">Aqrobat research · October 10, 2026</div><h1>Clear letters. A stable outline.<br>${exact ? "A reader result to examine." : "No decoded link yet."}</h1><p class="status">Prose QR remains unsolved</p><p>The useful new result is that an ordinary reader outside ZXing finds the intended QR outline in the full native text page. Two separate reruns of that same implementation return identical corners. The full URL confirmation ${exact ? "has some exact reader recovery, detailed below" : "has no exact recovery in the completed ordinary reader checks; any unknown profile outcomes are listed below"}. This is a research checkpoint, with no new phone or print acceptance.</p>
<div class="stats"><div class="stat"><b>11 / 11</b>Native renderings repeat exactly</div><div class="stat"><b>${exact} / ${a.ordinaryNativeProfilesWithKnownOutcome}</b>Exact completed native URL returns</div><div class="stat"><b>0</b>New phone tests</div></div>
<section class="card"><h2>What changed</h2><p>The source model chooses regular black letters whose ink density stays more consistent across the native word period. The selected carriers are <code>OMW</code> and <code>iuI</code>. Every letter is visible. Both words use the same Monaco font, 16-pixel size, 20-pixel leading and regular weight, with normal spaces and one fixed positive letter spacing.</p><p>Sixty native glyph-position measurements support 8,000 preserved three-letter source models. Those are small mathematical source proposals, not 8,000 rendered QR experiments. Two selected native word measurements validate the model. The eventual finder-only page uses full text context and slightly smaller finder centers. Because those factors changed together, the result does not identify one causal winner.</p><figure class="native"><div class="scroll"><img src="${await png("docs/research/prose-qr/phase-45/run-01/letters.png")}" width="720" height="168" alt="Actual native-size excerpt with clearly visible regular OMW letters and normal word spaces"></div><figcaption>Actual saved native excerpt at 1:1. Scroll sideways on a phone. This excerpt is not a complete QR code or scan candidate.</figcaption></figure><p>The letters are distinguishable locally, but the carriers are fabricated words. This is still a 10,240 × 10,240-pixel text page with 511 rows. It does not yet read like natural prose or fit a normal printed page at a useful letter size. Shrinking it until the text is unreadable would not satisfy the goal.</p></section>
<section class="card"><h2>What the ordinary readers returned</h2><p>The single encoded payload is exactly <code>https://example.com/</code>. The unchanged encoder requests ECC M and ordinarily boosts it to Q, version 2. No link was shortened or substituted.</p><div class="scroll"><table><thead><tr><th>Full unchanged native image</th><th>Returned result</th></tr></thead><tbody>${rows}</tbody></table></div><p>${a.conventionalExactControls} of five planned conventional control checks recover the exact URL. Missing or errored profiles remain unknown, not failures. OpenCV returns the intended outline for the full native payload but no decoded string. The first whole-profile Vision attempt timed out with both slots unknown; the fresh per-input profile is shown here. Both attempts are retained. Repeated OpenCV calls are one implementation; ZXing's error-reporting profile is a separate diagnostic, not another ordinary reader.</p><p>Full-resolution jsQR selected horizontal, vertical and both diagonal finder runs still fail the strict native gate. Their numerical traces remain preserved losslessly. The ordinary outline result does not turn those failed native gates into passes.</p></section>
<section class="card"><h2>Why a clean diagnostic picture is insufficient</h2><p>${escape(a.scaleDiagnostic.description)}</p><p>A post-return initialization replica is useful for seeing aggregate density, but it is never passed to a decoder. Likewise, expected-center samples and source-aligned cell counts cannot establish recovery. The actual native input, native stroke traces, ordinary returned outline, sampled error-reporting symbols and replicas remain distinct evidence.</p><p class="muted">Implementation reference: <a href="https://raw.githubusercontent.com/opencv/opencv/4.13.0/modules/objdetect/src/qrcode.cpp">Pinned OpenCV 4.13 QR source</a>, saved with its hash in phase 32. The replicas model code paths; they are not captured internal OpenCV traces or proof of the precise failing stage.</p></section>
<section class="card"><h2>Preservation and limits</h2><p>All prior phases, original prototypes and product downloads are preserved. This session changes research files only. npm remains private and unpublished; <a href="https://github.com/ryanjosephkamp/aqrobat/pull/1">PR #1</a> remains open and draft. Existing Pages automation follows that branch, so backup pushes use its existing rebuild. No settings change or manual deployment was made.</p><p>The record includes one original source-producer error, three trace-save reserve aborts, one unattempted native slot and every negative result. Later read-only traces do not erase the original aborted runs. The Impact experiment stays separate from regular body-font text, and earlier styled, bold and uniform-black ASCII techniques remain separate deliverables.</p><p><code>npm test</code> passes all 18 tests. Product browser, installed-extension, Gmail, native clipboard, owner phone and physical-print checks were not rerun for this unchanged product. See the verification and custody receipts for exact file counts, hashes and caps.</p></section>
<section class="card"><h2>What remains</h2><p>Exact payload recovery from readable unchanged native output by independent ordinary readers remains the next acceptance gate, followed by phone testing. Natural sentences, normal page size and portable copy/paste fidelity are still separate unresolved requirements.</p><p>Continue with one small preregistered native-letter objective at the decoding scale while retaining the stable full-context outline as a baseline. Do not start another payload sweep from the clean replica or isolated finder samples. There is no useful manual scanning request for this failed native payload.</p></section>
<section class="card"><h2>Resume safely</h2><p>All experiments are stopped at handback. The checkpoint includes the exact next constraints. Copy this prompt, or select it manually if browser clipboard access is unavailable.</p><textarea id="prompt" readonly aria-label="Continuation prompt">${escape(prompt)}</textarea><button id="copy" type="button">Copy continuation prompt</button><p id="copy-status" role="status" class="muted">The selectable text works without clipboard permission.</p></section>
<details class="card"><summary>Phase record and evidence links</summary><div class="scroll"><table><tbody>${phaseRows}</tbody></table></div><p><a href="analysis.json">Session analysis</a> · <a href="verification-final.json">Verification</a> · <a href="custody.json">Custody</a> · <a href="HARNESS-NOTES.md">Harness notes</a> · <a href="CHECKPOINT.md">Checkpoint</a></p><p><a href="../phase-45/run-01/native.png">Failed full native input, preserved for research</a> · <a href="../phase-45/run-01/native.txt">Exact source text</a> · <a href="../phase-45/run-01/native.html.gz">Saved source HTML, gzip</a></p></details>
</main><script>document.querySelector('#copy').addEventListener('click',async()=>{const p=document.querySelector('#prompt'),s=document.querySelector('#copy-status');try{await navigator.clipboard.writeText(p.value);s.textContent='Copied.';}catch{p.focus();p.select();s.textContent='Prompt selected. Use your browser’s Copy command.';}});</script></body></html>`;
await writeFile(root + "index.html", await format(html, { parser: "html" }), {
  flag: "wx",
});
console.log("Self-contained research report created.");

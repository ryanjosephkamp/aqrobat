"""Build the self-contained parent report from retained worker handbacks.

This script does not render research sources, run readers, or change evidence.
"""

from pathlib import Path
from html import escape
import base64
import json
import os

ROOT = Path('docs/research/prose-qr/integrated-2026-10-10')
REPO = Path.cwd()


def read_json(path, default=None):
    p = ROOT / path
    return json.loads(p.read_text()) if p.exists() else default


def link(path, label=None):
    p = Path(path)
    if str(p).startswith('docs/') or str(p).startswith('experiments/'):
        p = Path(os.path.relpath(REPO / p, REPO / ROOT))
    return f'<a href="{escape(str(p), quote=True)}">{escape(label or str(p))}</a>'


def data(value):
    return '<pre>' + escape(json.dumps(value, indent=2, ensure_ascii=False)) + '</pre>'


def details(title, value):
    return '<details><summary>' + escape(title) + '</summary>' + data(value) + '</details>'


def table(headers, rows):
    return '<div class="table"><table><thead><tr>' + ''.join('<th>' + escape(x) + '</th>' for x in headers) + '</tr></thead><tbody>' + ''.join('<tr>' + ''.join('<td>' + x + '</td>' for x in row) + '</tr>' for row in rows) + '</tbody></table></div>'


def figure(relative, caption, alt):
    p = ROOT / relative
    if not p.exists():
        return ''
    encoded = base64.b64encode(p.read_bytes()).decode()
    return f'<figure><img src="data:image/png;base64,{encoded}" alt="{escape(alt, quote=True)}"><figcaption>{escape(caption)} {link(relative, "Original PNG")}</figcaption></figure>'


progress = read_json('progress.json', {})
empirical = read_json('empirical/handoff.json', {})
batches = read_json('empirical/batch-summary.json', {})
versions = read_json('empirical/runtime-provenance.json', {})
mechanism = read_json('mechanism/final.json', {})
review = read_json('review/review.json', {})
closure = read_json('CLOSURE.json', {'state': 'Draft handback; final reconciliation pending.'})
parent = read_json('parent-verification.json', {})
counts = empirical.get('actual', {})
ladder = ''.join('<li><strong>' + escape(x['name']) + '</strong><p>' + escape(x['state']) + '</p></li>' for x in progress.get('milestones', []))

batch_rows = []
for row in batches.get('rows', []):
    evidence = []
    for key, label in [('preregistrationPath', 'Preregistration'), ('resultsPath', 'Result')]:
        if row.get(key):
            evidence.append(link(row[key], label))
    batch_rows.append([
        escape(row['id']), escape(row.get('kind', '')),
        details('Planned denominator', row.get('planned', {})),
        details('Attempted / rejected / unattempted', {k: row[k] for k in ['attempted', 'rejected', 'unattempted', 'captures', 'ordinaryApiCalls', 'passiveApiCalls', 'nestedPassiveMatrixDecoderInvocations', 'repeatAttempts', 'exactRepeats', 'exploratoryPayloadTrials'] if k in row}),
        escape(row.get('outcome', '')) + details('Full preserved row', row), '<br>'.join(evidence),
    ])

results = table(['Source route', 'Sampled matrix outcome', 'Ordinary readers', 'Strict native gate'], [
    ['V10 letter weight projection', '1,509 module mismatches; 170 function mismatches; 41–44 wrong codewords per block / radius 14; 340 of 976 quiet samples dark.', '0 / 3 exact URL', 'Failed'],
    ['V5 shorter prose projection', '637 module mismatches; 108 function mismatches; 33 wrong codewords per block / radius 11; 203 of 656 quiet samples dark.', '0 / 3 exact URL', 'Failed'],
    ['V2 continuous foreground prose + actual Unicode ornaments', 'Literal: 203 module mismatches; 65 function mismatches; 41 of 44 wrong codewords / radius 11. Adaptive: 240 module mismatches / 68 function mismatches / 44 of 44 wrong codewords. Quiet: 0 of 464 dark in both.', '0 / 3 exact URL', 'Failed; first-selected dimensions 165 normal and 37 inverted, intended 25'],
])

budget = table(['Category', 'Used / ceiling', 'Boundary'], [
    ['Small glyph resources', '87 / 128', 'One combined source diagnostic per captured resource; failed setup and unattempted rows retained.'],
    ['Full native captures', '9 / 24', 'Includes layout/calibration captures and three exploratory payload trials.'],
    ['Conventional control captures', '8 / 8', 'Includes the mismatching repeat batch and the invalid fractional-SVG control.'],
    ['Exploratory payload trials', '3 / 4', 'The last allowance remains unused because the final source route failed readability.'],
    ['Conservative reader accounting', '75 / 96', '37 primary ordinary API calls + 11 passive instrumented APIs + 27 nested matrix decoder invocations. These categories are shown separately and conservatively added.'],
    ['Immediate full-image repeats', '17 attempts', '16 exact PNG/RGBA matches; one mismatch preserved and stopped its batch.'],
    ['Workers', '4 dispatches / 4', 'At most two workers concurrently. Final fourth worker is independent evidence review. No worker spawned agents.'],
    ['Artifact storage', escape(str(closure.get('artifactBytes', 'Final total pending'))) + ' bytes / 64,000,000', 'All fresh run trees, including reports, source snapshots, failures and compressed pixel custody.'],
])

design_rows = [
    ['measured-01', '32 alternatives; 0 attempted, 32 unattempted', 'Rejected quiet-field contract; original input retained.'],
    ['measured-02', '32 / 32 alternatives', 'Canonical and explicit noncanonical affine constraints inconsistent; prefix-only bound excluded 31 and bounded greedy route exhausted one.'],
    ['measured-03-closure', '32 / 32 alternatives', 'Fixed data plus fixed parity excludes every alternative in the measured model.'],
    ['measured-04-v5', '32 / 32 alternatives', 'All exact systems inconsistent; immutable closure excludes every alternative.'],
]
for row in design_rows:
    row[0] = link('design/' + row[0] + '/preregistration.json', row[0])
    row[1:] = [escape(x) for x in row[1:]]

mechanism_rows = []
for row in mechanism.get('pureBatches', []):
    mechanism_rows.append([
        link(row['preregistration']['path'], row['id']),
        escape(str(row['denominator'])),
        '<br>'.join(escape(str(k) + ': ' + str(v)) for k, v in row['counts'].items()),
        link(row['receipt']['path'], 'Frozen result'),
    ])

figures = figure('empirical/payload-01/native-projection/input.png', 'V10: actual letter weight projection. Failed recovery; this is an experimental source, not an owner scan candidate.', 'Failed V10 native prose with enlarged actual letters.')
figures += figure('empirical/payload-02/native-projection/input.png', 'V5: independently frozen shorter prose. Failed recovery despite exact local selection and repeat custody.', 'Failed V5 native prose projection.')
figures += figure('empirical/payload-04/continuous-native/input.png', 'V2: 2,497-character coherent prose with actual ◉ and ⊙ Unicode ornaments and black/gray native foreground. The ornaments are visibly present in the selected source. This is a different route from alphabetic finders. Failed recovery.', 'Failed V2 continuous native prose with real visible Unicode ornaments.')
figures += figure('empirical/resources-06/cutoff-gray-228-stroke-0p75/input.png', 'Final calibration at its original 640 × 128 pixels. Parent and empirical worker rejected ordinary readability: substantial word fragments are barely visible. The batch stopped; three later resources and the final payload trial remained unused.', 'Very faint gray text fragments in the rejected native prose resource.')

source_rows = []
for label, folder in [('V10 experimental source', 'empirical/payload-01/native-projection'), ('V5 experimental source', 'empirical/payload-02/native-projection'), ('V2 experimental source', 'empirical/payload-04/continuous-native')]:
    files = [p for p in (ROOT / folder).iterdir() if p.name in ['source.html', 'source.html.txt', 'source.html.gz', 'input.html', 'input.html.txt', 'input.png', 'capture.json', 'ordinary.json', 'selection.json', 'source-receipt.json']]
    source_rows.append([escape(label), '<br>'.join(link(str(p.relative_to(ROOT)), p.name) for p in files)])

font_rows = []
for item in versions.get('fonts', []):
    faces = '; '.join(', '.join(f.get('postScriptNames', [])) + ' — ' + ', '.join(f.get('versions', [])) for f in item.get('faces', []))
    font_rows.append([escape(Path(item['path']).name), escape(faces), '<code>' + escape(item['fileSha256']) + '</code>'])

html = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Aqrobat — integrated native-prose QR handback</title>
<style>
:root{{color-scheme:light}}body{{margin:0;background:#f7f5ef;color:#1d2a31;font:17px/1.6 system-ui,sans-serif}}main{{max-width:1120px;margin:0 auto;padding:40px 24px 80px}}h1{{font-size:clamp(2.1rem,5vw,3.7rem);line-height:1.08;letter-spacing:-.025em;max-width:900px}}h2{{margin:2.5rem 0 1rem;line-height:1.25}}h3{{line-height:1.3}}a{{color:#006b75}}.meta,figcaption{{font-size:.86rem;color:#53646c}}.lead{{max-width:850px;font-size:1.13rem}}.status{{background:#f0e6d8;border-left:5px solid #98511f;padding:18px 22px}}.table{{overflow-x:auto;margin:20px 0}}table{{border-collapse:collapse;width:100%;font-size:.9rem;background:#fffdf8}}th,td{{padding:12px;text-align:left;vertical-align:top;border-bottom:1px solid #cbd1ce}}th{{font-weight:650}}pre{{white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.55 ui-monospace,monospace;background:#edf0ec;padding:15px}}code{{overflow-wrap:anywhere;font-size:.85em}}details{{margin:9px 0}}summary{{cursor:pointer;color:#006b75}}figure{{margin:28px 0;padding:14px;background:white}}img{{display:block;max-width:100%;height:auto;margin:auto}}figcaption{{margin-top:14px}}li{{margin:14px 0}}li p{{margin:3px 0}}nav{{display:flex;flex-wrap:wrap;gap:8px 22px;margin:24px 0}}.columns{{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px}}
</style></head><body><main>
<p class="meta">Aqrobat · October 10, 2026 · Integrated empirical Goal run</p>
<h1>Three native constructions.<br>No exact payload recovery.</h1>
<p class="lead">The intended result was readable, copyable native prose recovering <code>https://example.com/</code> in at least two independent ordinary readers. The investigation produced reproducible negative evidence and stronger construction limits. It did not achieve that objective.</p>
<section class="status"><strong>{escape(closure.get('state', 'Reconciliation pending'))}</strong>
<p>No owner scan candidate is established. The final faint-text route was rejected for readability, and the fourth exploratory payload allowance stayed unused. All three rendered payload trials failed exact recovery in OpenCV, ZXing and jsQR. These finite results do not prove that readable native-prose QR is impossible.</p>
<p>Recorded start: <time>2026-10-10 21:24:22 UTC</time> (5:24:22 p.m. Eastern). Absolute deadline: <time>2026-10-11 00:24:22 UTC</time> (8:24:22 p.m. Eastern). Evidence/report seal timestamp: <strong>{escape(str(closure.get('closedAtUtc', 'pending')))}</strong>; elapsed to seal: <strong>{escape(str(closure.get('elapsedMinutes', 'pending')))} minutes</strong>.</p></section>
<nav><a href="#roadmap">Roadmap</a><a href="#results">Results</a><a href="#images">Actual images</a><a href="#batches">Every batch</a><a href="#checks">Review and checks</a><a href="#versions">Versions</a><a href="#limits">Remaining blockers</a></nav>
<h2 id="roadmap">Roadmap status</h2><ol>{ladder}</ol>
<p>No completion percentage, success probability, time-to-success estimate or novelty claim is supported. Local text selection, styled/plain transfer, native apps, phone and print are separate evidence lanes.</p>
<h2 id="results">What the payload trials established</h2>{results}
<p>Successful conventional controls recovered the exact URL independently. One repeat mismatch and one later invalid fractional-SVG control stopped their batches. A fresh single-path SVG control at unchanged geometry recovered in all three readers before the V2 native trial. The old failure remains preserved; the precise cause is a hypothesis because the drawing method changed.</p>
<p>Five of the nine full native captures received passive strict-gate profiling; all ten executed native branches failed. Four captures were unprofiled because their batch stopped or they were capture-only calibrations. No native source passed the gate.</p>
<p>The existing every-record strict native gate and thresholds were unchanged. Earlier O/o layouts gave intended first-selected finder locations and four-axis shape values within the isolated limit, but failed balance, span or stability. Those are partial measurements. A later selected location or source-aligned sample is never substituted for an ordinary first-selected result. Decoder recovery and strict eligibility remain independent outcomes.</p>
<h2>Budget, denominators and custody</h2>{budget}
{details('Final empirical counts and frozen unattempted work', {'actual': counts, 'frozenUnattempted': empirical.get('frozenUnattempted', {}), 'diagnosticCounts': empirical.get('diagnosticCounts', {})})}
<p>The 75-call convention adds observable API/instrumentation categories conservatively; it is not a count of every uninstrumented internal decoder function invocation. Source-only adaptive diagnostics are separate: 87 resource pipelines + 10 construction samples + 1 full-native ledger = 98 adaptive calls, with no payload decoding.</p>
<p>Repeated captures are exact immediate repeats, not tuning opportunities. Source/layout revisions used fresh preregistrations. Wrong payload, source/repeat/parity failure and invalid control stopped their batches. Missing and unattempted results remain unknown rather than being counted as passes.</p>
<h2 id="images">Actual retained images</h2>
<p>These are the unchanged PNG inputs, embedded losslessly for offline reading. They are failed experimental sources, not scanning handoffs. Opening a source is optional; no browser, reader or source code runs inside this report.</p>{figures}
{table(['Artifact', 'Retained files'], source_rows)}
<h2 id="batches">Every empirical batch and retained setup attempt</h2>
<p>The table includes each finite denominator, attempt, rejection, stop and unattempted remainder. Expand a row for its complete structured record. {link('empirical/batch-summary.json', 'JSON ledger')} · {link('empirical/batch-summary.csv', 'CSV ledger')}</p>
{table(['Batch', 'Kind', 'Planned', 'Execution', 'Outcome', 'Evidence'], batch_rows)}
<h2>Construction and mechanism batches</h2>
<p>The first design lane operated only on retained source/sample maps and exact QR arithmetic. It made no captures or reader calls. Arbitrary post-terminator padding was explicitly noncanonical and used only as a construction hypothesis.</p>
{table(['Design batch', 'Denominator', 'Outcome'], design_rows)}
<p>{link('design/RESULTS.md', 'Complete initial construction findings')} · {link('design/final-manifest.json', 'Design scope and hashes')}</p>
<h3>Continuous foreground mechanism</h3>
<p>It used real installed-font characters, ordinary source words and visible native foreground styles. Unicode ornaments were explicit characters in the selected prose, not substituted alphabetic glyphs. The actual V2 layout did not realize its generous support model: line spacing and fractional word spacing drifted from the measured sampling phase. The later fixed-alpha bound excludes pure recoloring of that same retained layout within its declared literal model; it assumes unchanged native raster/blur coverage when foreground RGB changes, which was not separately measured. It does not exclude new geometry or ordinary-reader behavior.</p>
{table(['Mechanism batch', 'Alternatives', 'Outcome in its declared model', 'Evidence'], mechanism_rows)}
{details('Complete mechanism handback and finite batch ledger', mechanism)}
<p>{link('mechanism/RESULTS.md', 'Mechanism findings')}</p>
<h2 id="checks">Independent review, checks and preservation</h2>
<p>The independent bounded review passes 1,845 checks across 1,493 hashed inputs and finds no material undisclosed inconsistency. It confirms the failed recovery, exact source/image custody and conditional arithmetic. Its visual-readability evidence comes from the empirical worker and parent; the reviewer did not display images or establish owner acceptance. {link('review/REVIEW.md', 'Read the independent review')}</p>
{details('Independent review receipt', review)}
<p>Parent preservation and packaging checks pass 45 assertions. Prior tracked files and the nine named intake hashes remain unchanged; all four embedded images exactly match their original PNG bytes and every local evidence link resolves. The initial staged diff passes the whitespace check and contains only the two authorized new run trees.</p>
{details('Parent reconciliation and preservation', parent)}
{details('Final worker checks', empirical.get('checks', {}))}
<p>Product code did not change, so product tests/build and installed-extension/native-app checks were not run for this research-only change. Pure construction tests, research-harness checks, input custody, source hashes and formatting were checked separately. The global formatting check failed with 208 warnings during closing. One review Markdown warning cleared when that worker finished formatting; the 207 remaining warnings concern preserved frozen files (23 design, 179 empirical, 5 mechanism). Global formatting is not claimed green. Parent closing documents receive separate scoped checks. {link('format-reconciliation.json', 'Exact formatting reconciliation')} · {link('parent-format.json', 'Passing parent closing-format receipt')} and raw logs retain these results.</p>
<p>A design closure module was formatted between its V10 and V5 batches. Its original executed bytes were archived and match the earlier preregistration; the later formatted bytes were separately frozen before the V5 batch. The original results were not rewritten. Successful early resource diagnostic stderr was not separately retained. Initial mechanism article-test failures retain contemporaneous summaries and exact source bytes, but not their raw stdout. These missing streams remain explicit reproducibility limits, with no regenerated substitutes.</p>
<p>Prior run clocks and artifacts, product files, pinned encoder/license, npm privacy, owner profiles/clipboard/documents and unrelated jobs were preserved. Only the two fresh integrated run trees belong to this change. Branch <code>codex/aqrobat-foundation</code> and PR #1 remain the delivery lane; the PR must remain draft and unmerged.</p>
<h2 id="versions">Exact implementation and source provenance</h2>
<p>Chrome <strong>{escape(versions.get('chrome', {}).get('versionStdout', '').strip())}</strong>; Playwright <strong>{escape(str(versions.get('playwright', '')))}</strong>; Node <strong>{escape(str(versions.get('node', '')))}</strong>; Python <strong>{escape(str(versions.get('python', {}).get('version', '')))}</strong>.</p>
{details('Reader versions and pinned source hashes', {'readers': versions.get('readers', {}), 'pinnedSources': versions.get('pinnedSources', []), 'host': versions.get('host', {})})}
{table(['Installed font file', 'Faces and version names', 'File SHA-256'], font_rows)}
<p>Installed-font inventory alone does not prove which face rendered. Per-source Chrome CDP face receipts provide that evidence. The Skia descriptor mismatch remains unresolved and is not a proven fallback. {link('empirical/runtime-provenance.json', 'Full runtime/font provenance')} · {link('empirical/source-custody/manifest.json', 'Executed-source custody manifest')}</p>
<h2 id="limits">Remaining blockers and a bounded future decision</h2>
<p>The main unresolved requirement is enough independently controllable, visibly readable native ink to preserve function patterns and payload codewords at the reader's sampling points. Matching an isolated finder ratio is insufficient. The measured weight projections lack that control; the continuous foreground layout leaves gaps and adaptive-threshold contamination; the lightest tested repair loses readable words.</p>
<p>A future run would need a materially different, explicitly chosen native-ink construction with measured full-page coverage and readability before spending more payload trials. Repeating the same weight/color targets, loosening the strict gate, hiding QR modules, replacing characters with custom glyphs, or treating untested phone/print behavior as accepted would not resolve these results. No future phase, new allowance, automation, publication or sharing change begins from this report.</p>
<p>No owner phone/print scan handoff was earned. Portable plain-text and styled-text paste, native-app transfer, phone scans and physical printing remain untested. Exact browser Selection is useful local evidence, but it does not establish portable paste fidelity. Fast execution controls and billing savings were unverified.</p>
<h2>Records</h2><p>{link('REQUEST.txt', 'Authorized request')} · {link('START.json', 'Original clock and caps')} · {link('allocation-02.json', 'Allocation amendment')} · {link('progress.html', 'Chronological progress record')} · {link('CLOSURE.json', 'Closing receipt')} · {link('empirical/REPORT.html', 'Detailed empirical report')}</p>
<p class="meta">This standalone report embeds its stylesheet, images and complete structured result summaries. Evidence download links point to local repository files; the report does not publish or sync them.</p>
</main></body></html>'''
(ROOT / 'handback.html').write_text(html)

"""Render the mutable coordination record; never render a research candidate."""

from pathlib import Path
from html import escape
import base64
import json

ROOT = Path("docs/research/prose-qr/integrated-2026-10-10")
record = json.loads((ROOT / "progress.json").read_text())
counts = record["newCounts"]
budgets = [
    ("Glyph resources", "resourcesReported", 128),
    ("Full native captures", "nativeReported", 24),
    ("Conventional controls", "controlsReported", 8),
    ("Conservative reader calls (including instrumentation)", "conservativeReaderCallsReported", 96),
    ("Exploratory payload trials", "payloadTrialsReported", 4),
]
rows = "".join(
    f"<tr><th scope='row'>{label}</th><td>{counts.get(key, 0)} / {cap}</td></tr>"
    for label, key, cap in budgets
)
ladder = "".join(
    f"<li><strong>{escape(item['name'])}</strong><p>{escape(item['state'])}</p></li>"
    for item in record["milestones"]
)
events = "".join(
    "<li><p class='meta'>"
    + escape(item["atUtc"])
    + " · "
    + escape(item["source"])
    + "</p><p>"
    + escape(item["summary"])
    + "</p></li>"
    for item in reversed(record.get("events", []))
)
image = ROOT / "empirical/layout-03/reverse-regular/input.png"
figure = ""
if image.is_file():
    encoded = base64.b64encode(image.read_bytes()).decode()
    figure = (
        "<figure><img width='512' height='512' "
        "alt='Retained native article with enlarged actual O and o characters. "
        "No payload was recovered from this experimental layout.' "
        f"src='data:image/png;base64,{encoded}'>"
        "<figcaption>Retained layout-03/reverse-regular PNG. Parent visual "
        "inspection found coherent visible prose. This is an experimental "
        "layout, not an owner scan candidate; strict eligibility and payload "
        "recovery remain failed.</figcaption></figure>"
    )

latest = ROOT / "empirical/payload-04/continuous-native/input.png"
if latest.is_file():
    encoded = base64.b64encode(latest.read_bytes()).decode()
    figure += (
        "<figure><img width='1272' height='1272' "
        "alt='Failed native prose experiment with actual visible Unicode ornaments and black or gray text.' "
        f"src='data:image/png;base64,{encoded}'>"
        "<figcaption>Payload-04: continuous native prose with genuine Unicode ornaments. "
        "Parent inspection found visible coherent words and uneven black/gray foreground. "
        "All three ordinary readers failed exact recovery. Owner readability, portable "
        "paste and phone/print acceptance remain untested.</figcaption></figure>"
    )

document = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Aqrobat integrated run — progress</title>
<style>
body{{font:18px/1.6 system-ui,sans-serif;max-width:900px;margin:40px auto;padding:0 22px;color:#182530;background:#fbfaf7}}
h1{{font-size:clamp(2rem,5vw,3.4rem);line-height:1.1;letter-spacing:-.025em}}h2{{margin-top:2.4rem}}
.meta,figcaption{{font-size:.86rem;color:#4f606b}}.current{{border-left:5px solid #a64b21;padding:12px 20px;background:#f6eee4}}
li{{margin:20px 0}}li p{{margin:6px 0}}table{{border-collapse:collapse;width:100%;max-width:600px}}
th,td{{border-bottom:1px solid #d2d8da;text-align:left;padding:10px 12px}}th{{font-weight:550}}a{{color:#006d77}}
img{{max-width:100%;height:auto}}figure{{margin:24px 0}}.journal{{padding-left:24px}}code{{font-size:.88em}}
</style></head><body><main>
<p class="meta">October 10, 2026 · authorized integrated Goal run</p>
<h1>Native prose, measured against real QR readers</h1>
<p>Shared window: <strong>5:24:22–8:24:22 p.m. Eastern</strong>, including verification and handback.</p>
<section class="current"><strong>Current state</strong><p>{escape(record['state'])}</p>
<p><strong>No native payload recovery is established.</strong> There is no supported completion percentage or time-to-success estimate.</p>
<p><strong>Next:</strong> {escape(record['next'])}</p></section>
<p class="meta">Snapshot: {escape(record['updatedAtUtc'])}. Worker-reported experimental counts remain subject to final independent reconciliation.</p>
<h2>Roadmap</h2><ol>{ladder}</ol>
<h2>Budget used</h2><p>These are experiment ceilings, not a measure of goal completion.</p>
<table><thead><tr><th>Category</th><th>Used / maximum</th></tr></thead><tbody>{rows}</tbody></table>
<p>Primary ordinary calls: {counts.get('readersReported', 0)}. The conservative total also includes passive instrumented APIs and their nested matrix decodes.</p>
<p>Immediate repeat attempts: {counts.get('repeatAttemptsReported', 0)}; exact matches: {counts.get('exactRepeatMatchesReported', 0)}; retained mismatches: {counts.get('repeatMismatchesReported', 0)}. Passive profiles reported: {counts.get('passiveProfilesReported', 0)}.</p>
<h2>Retained experimental layouts</h2>{figure}
<h2>Milestone record</h2><ol class="journal">{events}</ol>
<h2>Evidence and scope</h2>
<p><a href="empirical/REPORT.html">Empirical illustrated report</a> · <a href="design/RESULTS.md">Initial construction findings</a> · <a href="START.json">Original clock and caps</a> · <a href="allocation-02.json">Allocation amendment</a> · <a href="REQUEST.txt">Authorized scope</a> · <a href="progress.json">Structured progress</a></p>
<p class="meta">Local text selection, native rendering, image decoding, portable styled/plain paste, native apps, phone and physical print remain distinct evidence lanes. Fast mode and billing savings are unverified. No publication or sharing change is authorized.</p>
</main></body></html>
"""
(ROOT / "progress.html").write_text(document)

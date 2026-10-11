"""Append the late owner acceptance without changing any sealed file."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json

base = Path("docs/research/prose-qr/portable-story-2026-10-11")
original = (base / "index.html").read_text()
updated = original
replacements = [
    ("Software partial result · phone trial optional", "Both Samsung apps · HTML"),
    ("No phone acceptance is inferred from the other saved styles.", "The owner now reports both Samsung apps scanning this exact HTML."),
    ("Ten positive app/surface cells and one negative cell are recorded across these six surfaces.",
     "Fourteen positive app/surface cells and one negative cell are recorded across these eight surfaces."),
    ("an owner-accepted all-black example, an owner-accepted selectable Letter PDF, and a usable local generator.",
     "owner-accepted all-black examples with different stories, an owner-accepted Regular-weight lighter-letter example, an owner-accepted selectable Letter PDF, and a usable local generator."),
    ('<a href="backup-final.json">Final backup receipt</a>',
     '<a href="backup-final.json">Final backup receipt</a> · <a href="acceptance-update-seal.json">Acceptance supplement hashes</a>'),
]
for before, after in replacements:
    assert before in updated, before
    updated = updated.replace(before,after)
marker = '<section id="examples">'
assert marker in updated
notice = '''<div class="notice good"><strong>New owner acceptance:</strong> both Samsung apps also scan the different story in black type and the Regular-weight lighter-letter HTML. The owner reports “yes. both can scan both.” Exact displayed phone links remain unreported. <a href="OWNER-VARIANTS-ACCEPTANCE.json">Verbatim receipt and file hashes</a> · <a href="index.html">Original sealed guide</a></div>'''
updated = updated.replace(marker,notice+marker,1)
marker = '</tbody></table></div><blockquote>'
assert marker in updated
extra_rows = '''<tr><td><a href="examples/black-new-prose-complete.html">Different story, black HTML</a></td><td class="pass">Reported success</td><td class="pass">Reported success</td><td>Distance/scale not reported</td></tr><tr><td><a href="examples/avenir-regular-gray96.html">Regular lighter-letter HTML</a></td><td class="pass">Reported success</td><td class="pass">Reported success</td><td>Distance/scale not reported</td></tr>'''
updated = updated.replace(marker,extra_rows+marker,1)
updated = updated.replace('<a href="OWNER-BLACK-PDF-ACCEPTANCE.json">Black/PDF acceptance</a>',
    '<a href="OWNER-BLACK-PDF-ACCEPTANCE.json">Black/PDF acceptance</a> · <a href="OWNER-VARIANTS-ACCEPTANCE.json">Varied-prose and Regular-weight acceptance</a> · <a href="owner-ledger-current.json">Current phone denominator</a>')
updated = updated.replace('</footer>',
    '<p>Acceptance supplement added '+datetime.now(timezone.utc).isoformat()+'. The original index.html and its delivery seal remain byte-identical at evidence commit 23fcd77522c1d71032b2545cf2f9b726873e8b0e. Scientific reader results are unchanged.</p></footer>')
target = base / "index-latest.html"
with target.open("x") as f:
    f.write(updated)
print(json.dumps({"originalSha256":hashlib.sha256(original.encode()).hexdigest(),
                  "latestSha256":hashlib.sha256(updated.encode()).hexdigest(),
                  "bytes":len(updated.encode()),"readerCalls":0,"imageCaptures":0}))

"""Prepare only the new handover assets; do not run product or QR experiments."""
from datetime import datetime, timezone
import hashlib
from html import escape
import json
import os
from pathlib import Path
import re
import subprocess

root = Path.cwd()
assert str(root) == "/Users/noir/Documents/aqrobat"
base = root / "docs/handover/2026-10-23"
assert base.is_dir()
sha = lambda data: hashlib.sha256(data).hexdigest()


def command(*args):
    return subprocess.check_output(args, text=True).strip()


def save(name, data):
    value = data if isinstance(data, str) else json.dumps(data, indent=2, ensure_ascii=False) + "\n"
    with (base / name).open("x") as f:
        f.write(value)


integrity = []
old = root / "docs/research/prose-qr/paste-prose-2026-10-11"
for name in ["MANIFEST.json", "preservation-baseline.json"]:
    data = json.loads((old / name).read_text())
    total = 0
    for item in data["files"]:
        current = (root / item["path"]).read_bytes()
        assert len(current) == item["bytes"] and sha(current) == item["sha256"], item["path"]
        total += len(current)
    integrity.append({"manifest": str((old / name).relative_to(root)),
                      "manifestSha256": sha((old / name).read_bytes()),
                      "filesExact": len(data["files"]), "bytesExact": total,
                      "mismatches": []})
save("integrity.json", {"at": datetime.now(timezone.utc).isoformat(),
                       "readOnly": True, "checks": integrity})

refs = command("git", "ls-remote", "origin")
pr = json.loads(command("gh", "pr", "view", "1", "--json",
                        "url,state,isDraft,headRefName,headRefOid,baseRefName"))
assert pr["state"] == "OPEN" and pr["isDraft"]
assert command("git", "branch", "--show-current") == "codex/aqrobat-foundation"
assert command("git", "rev-parse", "HEAD") == "ce1399bb3b21acec5cbb99c2ae1727c9e8d27d80"
assert not command("git", "diff", "--name-only")
assert not command("git", "diff", "--cached", "--name-only")
vfs = os.statvfs(root)
run = json.loads(command("gh", "run", "view", "38172660060", "--json",
                         "headSha,event,conclusion,jobs"))
snapshot = {
    "at": datetime.now(timezone.utc).isoformat(), "clientDate": "2026-10-23",
    "cwd": str(root), "branch": command("git", "branch", "--show-current"),
    "preparationParent": command("git", "rev-parse", "HEAD"),
    "main": command("git", "rev-parse", "main"),
    "remote": command("git", "remote", "get-url", "origin"),
    "remoteRefsBeforePreparationCheckpoint": refs.splitlines(), "pr": pr,
    "worktrees": command("git", "worktree", "list", "--porcelain"),
    "npmPrivate": json.loads((root / "package.json").read_text())["private"],
    "extensionVersion": json.loads((root / "extension/manifest.json").read_text())["version"],
    "physicalMemoryBytes": int(command("sysctl", "-n", "hw.memsize")),
    "diskFreeBytesForUser": vfs.f_bavail * vfs.f_frsize,
    "swapUsage": command("sysctl", "vm.swapusage"),
    "resourceNote": "Snapshot only; do not treat hardware RAM as available RAM or cumulative swap counters as current pressure.",
    "existingCiAtSavedHead": run,
    "ownerSelectedExtensionFinishLine": "Reliable styled-text insertion into Gmail and similar editors",
    "nextResearchScope": "Recommended broader prose/payload reliability, bounded search and verified outputs; alignment pending",
    "worktreeBranchPrSetup": "Recommended only, not created",
    "newGoal": False, "newExperiments": 0, "readerCalls": 0, "agents": 0,
    "newChats": 0, "SiteCalls": 0, "audienceChanges": 0,
    "runtimeTestsThisPreparation": "Not run; only handover/document checks",
    "privateSite": "No API access or audience recheck; private audience left untouched by this task.",
}
save("snapshot.json", snapshot)

files = [
    ("Conventional QR PNG", "corpus-01/control-1.png"),
    ("Plain wrapped prose TXT", "word-09/expected.txt"),
    ("Accepted styled Word", "word-09/word-09.docx"),
    ("Selectable native Word PDF", "word-09/word-09.pdf"),
    ("Accepted prose page PNG", "word-09/pdf-96/native.png"),
    ("Current generated Word source", "word-08/input.docx"),
    ("Current selectable HTML", "studio-check-06/download-selectable.html"),
]
save("file-sizes.json", {"at": datetime.now(timezone.utc).isoformat(),
    "payload": "https://example.com/", "method": "Read original existing bytes only; no generation, image transformation or decoder call.",
    "limitations": "Different image dimensions and content amount; not an equal-resolution benchmark. Plain TXT drops the QR styling.",
    "files": [{"format": label, "path": str((old / path).relative_to(root)),
               "bytes": (old / path).stat().st_size,
               "sha256": sha((old / path).read_bytes())} for label, path in files]})

prompts = {}
for lane in ["research", "extension"]:
    text = (root / f"docs/prompts/2026-10-23-{lane}-alignment.md").read_text()
    matches = re.findall(r"~~~text\n(.*?)\n~~~", text, re.S)
    assert len(matches) == 1
    prompts[lane] = matches[0]
    save(f"{lane}-start.txt", matches[0] + "\n")

page = """<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Aqrobat · two focused next steps</title><style>
:root{font:16px/1.6 system-ui,sans-serif;color:#29332e;background:#f5f3ed;--green:#265b43;--line:#d8dfd5}
*{box-sizing:border-box}body{margin:0}header,main,footer{max-width:1160px;margin:auto;padding:34px 28px}
header{padding-bottom:8px}.eyebrow{font-size:12px;letter-spacing:.13em;text-transform:uppercase;color:#637064}
h1{font:500 clamp(40px,5vw,64px)/1.08 Georgia,serif;letter-spacing:-.035em;max-width:18ch;margin:20px 0}
h2{font:500 30px/1.2 Georgia,serif;margin:0 0 18px}h3{font-size:18px;margin:0 0 10px}p{max-width:85ch}
a{color:var(--green);text-underline-offset:3px}.lead{font-size:20px}.badge{display:inline-block;background:#dfe9da;border:1px solid #c6d5c0;border-radius:20px;padding:6px 12px;font-size:13px}
nav,.actions{display:flex;flex-wrap:wrap;gap:14px;margin:20px 0}.button{padding:10px 15px;background:white;border:1px solid #b8c6b4;border-radius:8px;text-decoration:none}
.primary{color:white;background:var(--green)}section{margin-bottom:40px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:22px}
.card{background:white;border:1px solid var(--line);padding:25px;border-radius:14px}.research{border-top:5px solid #687a9a}.extension{border-top:5px solid #73936b}
.muted{color:#606c63;font-size:14px}.note{background:#e9ede2;padding:20px 24px;border-radius:12px}
.tablewrap{overflow:auto}table{width:100%;border-collapse:collapse;background:white;font-size:14px}th,td{text-align:left;padding:14px;border-bottom:1px solid var(--line);vertical-align:top}th{background:#e7ecdf}
pre{font:13px/1.65 ui-monospace,monospace;white-space:pre-wrap;overflow-wrap:anywhere;background:#f1f4ed;padding:17px;border-radius:9px}
ul,ol{padding-left:22px}li{margin:8px 0}.proof{display:grid;grid-template-columns:1fr 250px;gap:25px;align-items:start}
.proof img{width:100%;height:auto;border:1px solid var(--line);background:white}.proof figure{margin:0}.proof figcaption{font-size:12px;color:#637064}
footer{border-top:1px solid var(--line);font-size:13px;color:#637064}.paths{overflow-wrap:anywhere}
a:focus-visible{outline:3px solid #c99c46;outline-offset:3px}@media(max-width:760px){header,main,footer{padding:24px 18px}.grid,.proof{grid-template-columns:1fr}.proof figure{max-width:290px}h1{font-size:45px}}
</style></head><body>
<header><div class="eyebrow">Aqrobat · October 23, 2026 · fresh-session handover</div>
<h1>One project. Two focused next steps.</h1><span class="badge">Alignment first · no new Goal or experiment started</span>
<p class="lead">Keep the proven examples, finish browser insertion, and turn readable prose QR into a tool with a defensible supported range.</p>
<nav><a href="README.md">Complete context</a><a href="RESEARCH.md">Research evidence</a><a href="EXTENSION.md">Extension state</a><a href="COORDINATION.md">Safe concurrent work</a></nav>
</header><main>
<section class="grid"><article class="card research"><h2>Readable prose QR</h2>
<p>One complete 1,114-word mixed-case passage survives actual Word-to-Word paste and scans in both Samsung apps on the owner's Galaxy S25 Ultra.</p>
<p>Next recommendation: broaden text and URL coverage, search a bounded set of layouts, verify actual outputs, and export images plus editable text.</p>
<p class="muted">Fits does not mean scans. In the final page/paste run, Vision read 21/51 candidates; ZXing, jsQR and OpenCV read none. No universal guarantee is earned.</p>
<div class="actions"><a class="button primary" href="research-start.txt">Open start prompt (.txt)</a><a class="button" href="../../prompts/2026-10-23-research-alignment.md">Full alignment package</a></div>
<pre>%%RESEARCH_PROMPT%%</pre></article>
<article class="card extension"><h2>Browser extension</h2>
<p>Version 0.4.2 already provides a local workbench, saved recipes, exports and user-invoked Make → Save → Insert.</p>
<p><strong>Ryan selected:</strong> reliable styled-text insertion into Gmail and similar editors as the first finish line.</p>
<p class="muted">Next: actual draft layout, scan, Undo and reopening, then a small supported-editor matrix. Fixture and old ZIP tests are useful evidence, with real recipient acceptance still open.</p>
<div class="actions"><a class="button primary" href="extension-start.txt">Open start prompt (.txt)</a><a class="button" href="../../prompts/2026-10-23-extension-alignment.md">Full alignment package</a></div>
<pre>%%EXTENSION_PROMPT%%</pre></article></section>
<section class="note"><h2>The shared product direction</h2>
<p>A local tool for making, placing and exporting QR artwork made from real, copyable characters. Preserve exact destinations and source words; make verification visible. Keep the current stack unless a measured problem justifies change. Bring prose into the extension after its supported behavior is established.</p></section>
<section class="proof"><div><h2>Keep this accepted result intact.</h2>
<p>The narrow Letter example uses 8pt Impact in a 6.25-inch fixed table, with 50 rows. Its actual pasted Word recipient preserved the words, colors and page. The owner called its PDF/PNG the easiest pair to scan so far.</p>
<p>Automatic arbitrary-prose reliability, Google Docs, other phones and physical printing remain open. The exact phone-displayed URL was not reported. Software exact-payload evidence is separate.</p>
<div class="actions"><a class="button" href="../../research/prose-qr/paste-prose-2026-10-11/page-studio.html">Current offline studio</a><a class="button" href="../../research/prose-qr/paste-prose-2026-10-11/index.html">Full evidence guide</a><a class="button" href="../../research/prose-qr/paste-prose-2026-10-11/word-09/word-09.docx">Accepted Word document</a></div>
<p class="muted">A conventional QR PNG for the same URL is 3.3 KB; the styled Word file is 34.4 KB. Editable prose plus QR behavior is the demonstrated value. Plain TXT loses its QR styling.</p></div>
<figure><a href="../../research/prose-qr/paste-prose-2026-10-11/word-09/pdf-96/native.png"><img src="../../research/prose-qr/paste-prose-2026-10-11/word-09/pdf-96/native.png" width="816" height="1056" alt="Accepted one-page prose after actual Word paste"></a><figcaption>Original native page shown smaller for presentation. Open the original for unchanged scan-input bytes.</figcaption></figure></section>
<section><h2>Keep the sessions apart.</h2><div class="tablewrap"><table>
<thead><tr><th>Concern</th><th>Recommended arrangement after alignment</th></tr></thead><tbody>
<tr><td>File and Git collisions</td><td>Two dedicated worktrees and branches from the verified common handover. No concurrent writes in the primary checkout.</td></tr>
<tr><td>Review and backup</td><td>Separate lane draft PRs, approximately hourly checkpoints during authorized runs, no automatic merge or main updates.</td></tr>
<tr><td>Memory and disk</td><td>18 GiB RAM and about 27 GB free disk at preparation. Take turns for heavy browser/native/decoder work; monitor resources and bound artifacts.</td></tr>
<tr><td>Other work</td><td>Never terminate unrelated apps, Claude Code/Codex sessions or jobs. Close only verified task-owned resources.</td></tr>
<tr><td>Privacy and evidence</td><td>Keep owner context untracked, prior bytes immutable, npm private, and the separate private Site audience unchanged.</td></tr>
</tbody></table></div></section>
<section><h2>What remains to align</h2><ol>
<li>Research: supported input range, verification target, output priorities, duration and finite budgets.</li>
<li>Extension: one real editor scenario and what owner-assisted Gmail access/testing is available.</li>
<li>Both: approve isolated worktrees/branches, heavy-work coordination and checkpoint authority before execution.</li>
</ol><p class="muted">The older saved CI passed unit tests and failed formatting. Frozen evidence was preserved. This handover does not claim a green release baseline or start either run.</p></section>
<section class="paths"><h2>Verification and custody</h2><p>Before preparation, the branch and remote matched <strong>ce1399b</strong>, PR #1 was OPEN/draft, and both main refs remained unchanged. All 1,747 sealed research files and all 14,618 protected baseline files matched their recorded hashes.</p>
<nav><a href="snapshot.json">State snapshot</a><a href="integrity.json">Exact preservation checks</a><a href="file-sizes.json">Measured file sizes</a><a href="BACKUP-RECEIPT.json">Checkpoint receipt</a><a href="MANIFEST.json">Handover artifact hashes</a></nav>
<p>This repository and its existing Pages preview are public. The separate Site remains untouched. No agents, new chats, worktrees, Goal runs or new QR trials were started.</p></section>
</main><footer>Local preparation only · created %%AT%% · all execution packages remain inactive until a later selected scope.</footer>
</body></html>
"""
page = page.replace("%%RESEARCH_PROMPT%%", escape(prompts["research"])).replace(
    "%%EXTENSION_PROMPT%%", escape(prompts["extension"])).replace(
    "%%AT%%", datetime.now(timezone.utc).isoformat())
save("index.html", page)
save("BACKUP-RECEIPT.json", {"status": "pending handover checkpoint",
    "scope": ["RESUME.md", "docs/handover/2026-10-23/", "docs/prompts/2026-10-23-research-alignment.md", "docs/prompts/2026-10-23-extension-alignment.md"],
    "boundary": "Documentation-only checkpoint on the existing branch and draft PR. No main synchronization, merge, release, new hosting or Site action."})
save("MANIFEST.json", {"status": "pending final handover validation",
    "exclusions": ["MANIFEST.json itself", "BACKUP-RECEIPT.json post-push metadata"]})
print(json.dumps({"created": "handover snapshot, integrity, file-size data, two prompts and local visual guide", "newQrExperiments": 0}))

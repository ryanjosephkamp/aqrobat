"""Seal the two new run directories after delivery QA; no research execution."""
from datetime import datetime, timezone
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
from urllib.parse import unquote, urlsplit

root = Path.cwd()
assert str(root) == "/Users/noir/Documents/aqrobat"
scope = ["docs/research/prose-qr/paste-prose-2026-10-11/",
         "experiments/prose-qr/paste-prose-2026-10-11/"]
base = root / scope[0]


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paths = []

    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if value and key in ("href", "src"):
                self.paths.append(value)


links = []
for name in ["index.html", "page-studio.html"]:
    parser = Links()
    parser.feed((base / name).read_text())
    for target in parser.paths:
        url = urlsplit(target)
        if url.scheme or not url.path:
            continue
        path = (base / unquote(url.path)).resolve()
        assert path.is_file(), str(path)
        links.append({"page": name, "href": target, "exists": True})
ledger = json.loads((base / "LEDGER.json").read_text())
for case in ledger["cases"]:
    for key in ["image", "receipt"]:
        assert (base / case[key]).is_file(), case[key]
assert json.loads((base / "delivery-check-02/results.json").read_text())["errors"] == []
assert json.loads((base / "delivery-format.json").read_text())["status"] == 0
static = {"at": datetime.now(timezone.utc).isoformat(),
          "staticReferences": links, "candidateReferencesVerified": 102,
          "guideCaseCount": len(ledger["cases"]), "missing": [],
          "candidateCaptures": 0, "resourceCaptures": 0, "readerCalls": 0,
          "closureMetadata": "MANIFEST.json is finalized by this script; BACKUP-RECEIPT.json is intentionally pending until push verification."}
with (base / "final-static-check.json").open("x") as f:
    json.dump(static, f, indent=2)
    f.write("\n")
excluded = {str(base / "MANIFEST.json"), str(base / "BACKUP-RECEIPT.json")}
records = []
for directory in scope:
    for path in sorted((root / directory).rglob("*")):
        assert not path.is_symlink(), str(path)
        if not path.is_file() or str(path) in excluded:
            continue
        data = path.read_bytes()
        records.append({"path": str(path.relative_to(root)), "bytes": len(data),
                        "sha256": hashlib.sha256(data).hexdigest()})
manifest = {
    "at": datetime.now(timezone.utc).isoformat(), "status": "sealed",
    "preRunAnchor": "4472c93886255e8ce259ca64c4492136124949c5",
    "scope": scope, "files": records, "fileCount": len(records),
    "sealedBytes": sum(r["bytes"] for r in records),
    "exclusions": [
        {"path": str((base / "MANIFEST.json").relative_to(root)), "reason": "Self-reference; its exact bytes are preserved by the evidence commit."},
        {"path": str((base / "BACKUP-RECEIPT.json").relative_to(root)), "reason": "Post-push closure metadata; its completed bytes are preserved by the following same-branch receipt commit."},
    ],
    "immutability": "All listed captures, inputs, raw outputs, sources and receipts are frozen. Later research must use a new directory.",
    "scientificCounts": {k: ledger[k] for k in ["plannedCandidateSlots", "candidateCaptures", "conventionalControls", "exactImmediateRepeatPairs", "primaryOrdinaryResearchReaderCalls", "candidateReaderSuccess"]},
}
(base / "MANIFEST.json").write_text(json.dumps(manifest, indent=2) + "\n")
actual = sum(p.stat().st_size for s in scope for p in (root / s).rglob("*") if p.is_file())
assert actual < 256000000
print(json.dumps({"filesSealed": len(records), "sealedBytes": manifest["sealedBytes"], "incrementalBytesIncludingClosure": actual, "staticMissing": 0}))

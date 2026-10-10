"""Close only the independent review trees and recheck frozen input bytes."""

import ast
import hashlib
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

root = Path(__file__).resolve().parents[4]
run = Path("docs/research/prose-qr/integrated-2026-10-10")
out = root / run / "review"
sources = root / "experiments/prose-qr/integrated-2026-10-10/review"


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


scope = json.loads((out / "review-scope-hashes.json").read_text())
changes = [a["path"] for a in scope["files"] if sha(root / a["path"]) != a["sha256"]]
assert not changes, changes
review = json.loads((out / "review.json").read_text())
for a in review["checks"]:
    assert sha(root / a["path"]) == a["sha256"]
for p in sources.glob("*.py"):
    ast.parse(p.read_text(), filename=str(p))
processes = []
for command in [
    ["node", "--check", str(sources / "check-arithmetic.mjs")],
    ["git", "diff", "--quiet", "HEAD", "--"],
    [str(root / "node_modules/.bin/prettier"), "--check", str(sources / "check-arithmetic.mjs"), *[str(p) for p in sorted(out.glob("*.json"))], str(out / "REVIEW.md")],
]:
    process = subprocess.run(command, cwd=root, capture_output=True, text=True)
    processes.append({"args": command, "returncode": process.returncode, "stdout": process.stdout, "stderr": process.stderr})
    assert process.returncode == 0, processes[-1]
closing = {"schema": "aqrobat.independent-review-final-checks.v1", "atUtc": datetime.now(timezone.utc).isoformat(), "passed": True, "allReviewedInputFilesStillExact": len(scope["files"]), "inputChanges": changes, "structuredCheckHashesExact": True, "pythonSourcesASTParsed": len(list(sources.glob("*.py"))), "scopedFormattingPassed": True, "processes": processes, "newCaptureReaderLocatorBinarizerCalls": 0}
(out / "final-checks.json").write_text(json.dumps(closing, indent=2) + "\n")
# Format documentary receipts before freezing their final hashes.
formatted = subprocess.run([str(root / "node_modules/.bin/prettier"), "--write", str(out / "final-checks.json")], cwd=root, capture_output=True, text=True)
assert formatted.returncode == 0, formatted.stderr
paths = [p for base in [out, sources] for p in base.rglob("*") if p.is_file() and p.name not in ("final-manifest.json", "seal.stdout.txt", "seal.stderr.txt")]
artifacts = [{"path": str(p.relative_to(root)), "bytes": p.stat().st_size, "sha256": sha(p)} for p in sorted(paths)]
total = sum(a["bytes"] for a in artifacts)
assert total < 2800000, total
manifest = {"schema": "aqrobat.independent-review-final-manifest.v1", "closedAtUtc": datetime.now(timezone.utc).isoformat(), "status": review["status"], "goalAchieved": False, "ownedRoots": [str(out.relative_to(root)), str(sources.relative_to(root))], "byteCap": 3000000, "bytesExcludingSelfAndSealStreams": total, "fileCount": len(artifacts), "artifacts": artifacts, "frozenInputFilesExact": len(scope["files"]), "newCaptureReaderLocatorBinarizerCalls": 0, "parentBoundary": "Parent final HTML/closure/Git packaging remains outside this review's mutations and static draft snapshot."}
(out / "final-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
formatted = subprocess.run([str(root / "node_modules/.bin/prettier"), "--write", str(out / "final-manifest.json")], cwd=root, capture_output=True, text=True)
assert formatted.returncode == 0, formatted.stderr
for a in artifacts:
    assert sha(root / a["path"]) == a["sha256"]
actual_bytes = sum(p.stat().st_size for base in [out, sources] for p in base.rglob("*") if p.is_file())
assert actual_bytes < 3000000, actual_bytes
print(json.dumps({"status": manifest["status"], "passed": True, "reviewChecks": review["counts"]["reviewChecks"], "reviewedInputHashesStillExact": len(scope["files"]), "ownedBytesAtClose": actual_bytes, "byteCap": 3000000, "filesInManifest": len(artifacts), "goalAchieved": False, "newCaptureReaderLocatorBinarizerCalls": 0}, indent=2))

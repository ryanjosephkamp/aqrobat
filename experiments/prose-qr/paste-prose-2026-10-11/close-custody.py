"""Read-only custody verification; write only a new closure receipt."""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import subprocess
import zipfile

root = Path.cwd()
assert str(root) == "/Users/noir/Documents/aqrobat"
base = root / "docs/research/prose-qr/paste-prose-2026-10-11"
scope = ["docs/research/prose-qr/paste-prose-2026-10-11/",
         "experiments/prose-qr/paste-prose-2026-10-11/"]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def git(*args):
    return subprocess.check_output(["git", *args], text=True).strip()


def load(name):
    return json.loads((base / name).read_text())


start = load("START.json")
baseline = load("preservation-baseline.json")
assert len(baseline["files"]) == start["protectedFiles"]
protected_bytes = 0
for record in baseline["files"]:
    data = (root / record["path"]).read_bytes()
    assert len(data) == record["bytes"], record["path"]
    assert sha(data) == record["sha256"], record["path"]
    protected_bytes += len(data)
assert protected_bytes == start["protectedBytes"]

seal = load("accepted-bytes-seal.json")
assert sha((base / seal["backup"]).read_bytes()) == seal["backupSha256"]
with zipfile.ZipFile(base / seal["backup"]) as archive:
    assert len(archive.namelist()) == len(seal["files"]) == 9
    for record in seal["files"]:
        path = root / record["path"]
        data = path.read_bytes()
        assert len(data) == record["bytes"]
        assert sha(data) == record["sha256"], record["path"]
        assert archive.read(str(path.relative_to(base))) == data

ledger = load("LEDGER.json")
reader_hashes = []
for case in ledger["cases"]:
    path = base / case["image"]
    data = path.read_bytes()
    assert sha(data) == case["sha256"], case["id"]
    repeat = path.with_name("repeat.png") if path.name == "native.png" else path.with_name(path.stem + "-repeat.png")
    assert repeat.read_bytes() == data, case["id"]
    receipts = load(case["receipt"])["rows"]
    matching = [r for r in receipts if r["pngSha256"] == case["sha256"]]
    assert len(matching) == 1, case["id"]
    assert matching[0]["payload"] == case["payload"]
    assert matching[0]["readings"] == case["readings"]
    reader_hashes.append(case["sha256"])
for control in ledger["controls"]:
    path = root / control["path"]
    data = path.read_bytes()
    assert sha(data) == control["pngSha256"]
    assert path.with_name(path.stem + "-repeat.png").read_bytes() == data
    assert all(r["exact"] for r in control["readings"])
    reader_hashes.append(control["pngSha256"])
assert len(reader_hashes) == len(set(reader_hashes)) == 53
for record in [*ledger["cases"], *ledger["controls"]]:
    for reading in record["readings"]:
        assert reading["status"] == 0 and reading["error"] is None
        assert all(t == record["payload"] for t in reading["texts"])

branch, head = git("branch", "--show-current"), git("rev-parse", "HEAD")
assert branch == start["branch"] and head == start["anchor"]
remote = git("remote", "get-url", "origin")
assert remote == start["remote"]
assert git("rev-parse", "main") == git("rev-parse", "origin/main") == start["main"]
live_refs = dict(line.split()[::-1] for line in git("ls-remote", "origin", "refs/heads/main", "refs/heads/" + branch).splitlines())
assert live_refs["refs/heads/main"] == start["main"]
assert live_refs["refs/heads/" + branch] == head
pr = json.loads(subprocess.check_output(["gh", "pr", "view", "1", "--json",
    "url,state,isDraft,headRefName,headRefOid,baseRefName"], text=True))
assert pr["state"] == "OPEN" and pr["isDraft"] is True
assert pr["headRefName"] == branch and pr["baseRefName"] == "main"
assert json.loads((root / "package.json").read_text())["private"] is True
assert git("diff", "--name-only") == "" and git("diff", "--cached", "--name-only") == ""
untracked = [p for p in git("ls-files", "--others", "--exclude-standard").splitlines() if p]
assert all(p.startswith("AQROBAT-CONTEXT/") or any(p.startswith(s) for s in scope) for p in untracked)
assert not any(p.startswith("AQROBAT-CONTEXT/") for p in git("ls-files").splitlines())
word = subprocess.run(["pgrep", "-fl", "/Applications/Microsoft Word.app/Contents/MacOS/Microsoft Word"], capture_output=True, text=True)
assert word.returncode == 1 and not word.stdout
files = [p for s in scope for p in (root / s).rglob("*") if p.is_file()]
evidence_bytes = sum(p.stat().st_size for p in files)
assert evidence_bytes < start["caps"]["incrementalEvidenceBytes"] - start["caps"]["closingReserveBytes"]
receipt = {
    "at": datetime.now(timezone.utc).isoformat(),
    "phase": "Pre-backup closure; subsequent commits are restricted to the same two new directories.",
    "cwd": str(root), "branch": branch, "preBackupHead": head, "remote": remote,
    "main": start["main"], "remoteMain": live_refs["refs/heads/main"], "pr": pr,
    "protectedFilesExact": len(baseline["files"]), "protectedBytesExact": protected_bytes,
    "baselineSha256": sha((base / "preservation-baseline.json").read_bytes()),
    "acceptedFilesExact": 9, "acceptedArchiveEntriesExact": 9,
    "acceptedArchiveSha256": seal["backupSha256"],
    "readerInputImagesExact": 53, "immediateRepeatsExact": 53,
    "candidateInputs": 51, "controls": 2, "researchReaderCalls": 212,
    "wrongReturnedPayloads": 0, "inputTransforms": "none",
    "npmPrivate": True, "npmPublished": False,
    "ownerContextUntrackedAndUnchanged": True, "existingTrackedFilesChanged": [],
    "backupScope": scope, "incrementalFilesBeforeFinalClosure": len(files),
    "incrementalBytesBeforeFinalClosure": evidence_bytes,
    "incrementalByteCap": start["caps"]["incrementalEvidenceBytes"],
    "closingReserveBytesRemainingAtThisCheck": start["caps"]["incrementalEvidenceBytes"] - evidence_bytes,
    "wordProcessCheck": {"command": "pgrep -fl /Applications/Microsoft Word.app/Contents/MacOS/Microsoft Word", "status": word.returncode, "stdout": word.stdout, "taskAppExited": True},
    "nativeCleanupReceipts": ["native-word-cleanup.json", "native-cleanup-complete.json"],
    "cleanupClarification": "The immediate UI inventory after Quit was stale; this later process check confirms Word has exited. No accepted document bytes changed.",
    "agents": 0, "newChats": 0, "messages": 0, "automations": 0,
    "deployments": 0, "SiteCalls": 0, "audienceChanges": 0,
    "sitePrivacy": "Private audience was left untouched. No Site API access or live audience recheck was performed in this run.",
    "optionalUntested": ledger["untested"],
}
with (base / "CUSTODY.json").open("x") as f:
    json.dump(receipt, f, indent=2)
    f.write("\n")
print(json.dumps({k: receipt[k] for k in ["protectedFilesExact", "protectedBytesExact", "acceptedFilesExact", "readerInputImagesExact", "incrementalBytesBeforeFinalClosure"]}))

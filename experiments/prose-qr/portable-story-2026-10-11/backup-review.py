"""Review and stage only the authorized portable-prose research paths."""
from pathlib import Path
from datetime import datetime, timezone
import gzip
import hashlib
import json
import re
import subprocess

root = Path.cwd()
assert str(root) == "/Users/noir/Documents/aqrobat"
out = root / "docs/research/prose-qr/portable-story-2026-10-11"
prefixes = ["docs/research/prose-qr/portable-story-2026-10-11/",
            "experiments/prose-qr/portable-story-2026-10-11/"]
def run(*args):
    return subprocess.run(args, cwd=root, capture_output=True, text=True, check=True).stdout
def digest(data):
    return hashlib.sha256(data).hexdigest()
def save(name, value):
    with (out / name).open("x") as f:
        json.dump(value,f,indent=2);f.write("\n")

head = run("git","rev-parse","HEAD").strip()
assert head == "a0f441c8bc94c0c9569b992989cc09b669267517"
assert run("git","branch","--show-current").strip() == "codex/aqrobat-foundation"
assert run("git","remote","get-url","origin").strip() == "https://github.com/ryanjosephkamp/aqrobat.git"
assert not run("git","diff","--name-only") and not run("git","diff","--cached","--name-only")
repo = json.loads(run("gh","repo","view","--json","nameWithOwner,isPrivate,visibility,url"))
assert repo["nameWithOwner"] == "ryanjosephkamp/aqrobat" and repo["visibility"] == "PUBLIC"
pr = json.loads(run("gh","pr","view","1","--json","state,isDraft,headRefName,headRefOid,url"))
assert pr["isDraft"] and pr["state"] == "OPEN" and pr["headRefOid"] == head
remote = run("git","ls-remote","origin","refs/heads/codex/aqrobat-foundation","refs/heads/main")
assert head + "\trefs/heads/codex/aqrobat-foundation" in remote
assert "e41943aff7780107a33a60a21494a41276b92c58\trefs/heads/main" in remote
assert json.loads((root/"package.json").read_text())["private"] is True
checks = json.loads((out/"repository-checks/results.json").read_text())["checks"]
assert all(r["status"] == 0 for r in checks[:4])
assert json.loads((out/"maintained-source-check.json").read_text())["status"] == 0
assert json.loads((out/"workbench-final-check-05/summary.json").read_text())["errors"] == []
assert json.loads((out/"visual-check-04/summary.json").read_text())["errors"] == []

seal = json.loads((out/"delivery-seal.json").read_text())
for row in seal["files"]:
    data = (root/row["path"]).read_bytes()
    assert len(data) == row["bytes"] and digest(data) == row["sha256"], row["path"]
old = json.loads((out/"preservation-baseline.json").read_text())
for row in old["files"]:
    data = (root/row["path"]).read_bytes()
    assert len(data) == row["bytes"] and digest(data) == row["sha256"], row["path"]

paths = sorted(str(p.relative_to(root)) for prefix in prefixes for p in (root/prefix).rglob("*") if p.is_file())
patterns = [
    ("private-key",rb"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    ("github-token",rb"gh[pousr]_[A-Za-z0-9]{30,}"),
    ("api-key",rb"\bsk-(?:proj-)?[A-Za-z0-9_-]{28,}"),
    ("aws-key",rb"\bAKIA[A-Z0-9]{16}\b"),
]
findings, artifacts = [], []
for path in paths:
    data = (root/path).read_bytes()
    assert len(data) < 50000000, path
    assert not re.search(r"(?:^|/)(?:\.env(?:\.|$)|credentials|auth\.json|id_rsa)",path)
    artifacts.append({"path":path,"bytes":len(data),"sha256":digest(data)})
    if path.endswith(".gz"):data = gzip.decompress(data)
    if not path.endswith(".png"):
        for name, pattern in patterns:
            if re.search(pattern,data):findings.append({"path":path,"rule":name})
assert not findings, json.dumps(findings)
tracked = set(run("git","ls-files","-z").split("\0"))
save("backup-preflight-final.json",{
    "at":datetime.now(timezone.utc).isoformat(), "authorization":"Owner requested acceptance recording and backups while continuing the same branch and draft PR.",
    "repository":repo,"sourceHead":head,"sourceTree":run("git","rev-parse","HEAD^{tree}").strip(),
    "pr":pr,"remoteBefore":remote,"mainUnchanged":"e41943aff7780107a33a60a21494a41276b92c58",
    "scope":prefixes,"exclusions":["AQROBAT-CONTEXT/","all earlier evidence","product and downloads","Site and audience"],
    "files":artifacts,"bytes":sum(r["bytes"] for r in artifacts),"secretFindings":findings,
    "protectedOriginalFilesVerified":len(old["files"]),
    "publicSourceVsPrivateSite":"Existing GitHub repository is public, unchanged. Source backup follows the existing branch/PR; no Site or audience action.",
})
run("git","add","--",*prefixes)
expected = {p for p in paths if p not in tracked}
expected.add(str((out/"backup-preflight-final.json").relative_to(root)))
assert set(run("git","diff","--cached","--name-only").splitlines()) == expected
check = subprocess.run(["git","diff","--cached","--check"],cwd=root,capture_output=True,text=True)
save("backup-final-diff-check.json",{"at":datetime.now(timezone.utc).isoformat(),"status":check.returncode,
    "stdout":check.stdout,"stderr":check.stderr,"policy":"Preserve raw evidence bytes; inspect any whitespace exception before committing."})
run("git","add","--",str((out/"backup-final-diff-check.json").relative_to(root)))
staged = run("git","diff","--cached","--name-only").splitlines()
assert all(any(p.startswith(prefix) for prefix in prefixes) for p in staged)
print(json.dumps({"stagedFiles":len(staged),"secretFindings":len(findings),"diffCheckStatus":check.returncode,
    "evidenceBytes":sum(r["bytes"] for r in artifacts),"publicRepositoryUnchanged":True,"draft":pr["isDraft"]}))

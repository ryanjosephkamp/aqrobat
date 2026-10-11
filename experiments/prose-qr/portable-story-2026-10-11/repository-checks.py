"""Run the required checks in a disposable copy; never rebuild owner downloads."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
from datetime import datetime, timezone

root = Path.cwd()
assert str(root) == "/Users/noir/Documents/aqrobat"
out = root / "docs/research/prose-qr/portable-story-2026-10-11/repository-checks"
out.mkdir()
work = Path(tempfile.mkdtemp(prefix="aqrobat-portable-checks-"))
tracked = subprocess.check_output(["git", "ls-files", "-z"]).decode().split("\0")
paths = {p for p in tracked if p}
for directory in [
    "experiments/prose-qr/portable-story-2026-10-11",
    "docs/research/prose-qr/portable-story-2026-10-11",
]:
    paths.update(str(p.relative_to(root)) for p in (root / directory).rglob("*")
                 if p.is_file() and not p.is_relative_to(out))
records = []
for name in sorted(paths):
    src, dest = root / name, work / name
    assert not name.startswith("AQROBAT-CONTEXT/")
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dest)
    records.append({"path": name, "bytes": src.stat().st_size,
                    "sha256": hashlib.sha256(src.read_bytes()).hexdigest()})
(work / "node_modules").symlink_to(root / "node_modules", target_is_directory=True)
manifest = {
    "at": datetime.now(timezone.utc).isoformat(), "disposableCopy": str(work),
    "head": subprocess.check_output(["git", "rev-parse", "HEAD"]).decode().strip(),
    "branch": subprocess.check_output(["git", "branch", "--show-current"]).decode().strip(),
    "node": subprocess.check_output(["node", "--version"]).decode().strip(),
    "sourceFiles": records, "dependencyPolicy": "existing node_modules symlink, no install",
    "maximumProductDecoderCalls": 39,
    "ordinaryResearchReaderCallsBeforeValidation": 432,
    "capturePolicy": "Product regression outputs stay in disposable copy; not new prose candidates or phone evidence.",
}
(out / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
rows = []
for i, command in enumerate([
    ["npm", "test"], ["npm", "run", "build"],
    ["npm", "run", "test:browser"], ["npm", "run", "test:text-browser"],
    ["npm", "run", "format:check"],
    ["node_modules/.bin/prettier", "--check", *[
        "experiments/prose-qr/portable-story-2026-10-11/" + p for p in
        ["generator.mjs", "workbench-app.mjs", "workbench-template.html",
         "build-workbench.mjs", "final-workbench-check.mjs"]]],
]):
    started = datetime.now(timezone.utc)
    result = subprocess.run(command, cwd=work, capture_output=True, timeout=240,
                            env={**os.environ, "CHROME_PATH": "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"})
    stem = f"check-{i+1:02d}"
    (out / f"{stem}.stdout.txt").write_bytes(result.stdout)
    (out / f"{stem}.stderr.txt").write_bytes(result.stderr)
    row = {"command": command, "status": result.returncode,
           "started": started.isoformat(), "seconds": (datetime.now(timezone.utc)-started).total_seconds(),
           "stdout": f"{stem}.stdout.txt", "stderr": f"{stem}.stderr.txt",
           "stdoutSha256": hashlib.sha256(result.stdout).hexdigest(),
           "stderrSha256": hashlib.sha256(result.stderr).hexdigest()}
    rows.append(row)
    (out / "results.json").write_text(json.dumps({"at": datetime.now(timezone.utc).isoformat(), "checks": rows,
        "nativeInstalledExtension": "not run, optional", "nativeProductText": "not run, optional",
        "physicalPrint": "not run", "maximumProductDecoderCalls": 39}, indent=2) + "\n")
    print(json.dumps({"command": command[:3], "status": result.returncode, "seconds": row["seconds"]}), flush=True)

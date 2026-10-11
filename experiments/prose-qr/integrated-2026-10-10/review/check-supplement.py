"""Additional source, saved-profile predicate, and font-file byte checks."""

import gzip
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

root = Path(__file__).resolve().parents[4]
run = Path("docs/research/prose-qr/integrated-2026-10-10")
emp = run / "empirical"
checks = []


def check(name, passed, details=None):
    checks.append({"name": name, "passed": bool(passed), "details": details})


def js(path):
    b = (root / path).read_bytes()
    return json.loads(gzip.decompress(b) if str(path).endswith(".gz") else b)


original = (root / "experiments/prose-qr/astra-2026-10-10/common.mjs").read_text()
current = (root / "experiments/prose-qr/integrated-2026-10-10/empirical/common.mjs").read_text()
prior_strict = original.split("export const strict = ", 1)[1].split("export function checkTime", 1)[0]
current_strict = current.split("export const strict = ", 1)[1]
check("strict source predicate byte-identical to prior preserved run", prior_strict.rstrip() == current_strict.rstrip())


def strict(scan):
    geometry = scan["postReturnIntendedGeometry"]
    points = scan["selected"]
    if not geometry or not geometry[0]["intendedGeometry"] or len(points) != 3:
        return False
    for p in points.values():
        if p["quadBalance"] < 0.8 or p["nominalSpanFraction"] < 0.8 or p["stableRows"]["fraction"] < 0.8 or not p["records"]:
            return False
        if any(r["metric"]["completeAxes"] != 4 or r["metric"]["worstRMS"] > 0.35 for r in p["records"]):
            return False
        if p["geometric"]["completeAxes"] != 4 or p["geometric"]["worstRMS"] > 0.35:
            return False
    return True


native_profiles, native_branches, unprofiled = 0, 0, []
for resultpath in sorted((root / emp).glob("*/run-results.json")):
    result = json.loads(resultpath.read_text())
    profiles = {p["id"] for p in result["profiles"]}
    for capture in result["captures"]:
        if capture["kind"] != "native":
            continue
        if capture["id"] not in profiles:
            unprofiled.append({"batch": resultpath.parent.name, "id": capture["id"], "reason": result["stop"]["message"] if result["stop"] else "preregistered capture-only"})
        else:
            native_profiles += 1
            profile = js(Path(capture["dir"]) / "passive-full.json.gz")
            for scan in profile["scans"]:
                native_branches += 1
                computed = strict(scan)
                check(capture["dir"] + " " + scan["branch"] + " saved strict predicate", computed == scan["strictPass"] and computed is False)
check("native gate observation denominator", native_profiles == 5 and native_branches == 10 and len(unprofiled) == 4)
archived_formatted = (root / run / "review/closure-formatted-for-comparison.mjs.txt").read_bytes()
new_closure = (root / "experiments/prose-qr/integrated-2026-10-10/design/immutable-closure.mjs").read_bytes()
check("earlier closure source formats exactly to current bytes", archived_formatted == new_closure)
runtime = js(emp / "runtime-provenance.json")
font_files = runtime.get("fontFiles", runtime.get("fonts", []))
if not font_files:
    for key, value in runtime.items():
        if isinstance(value, list) and value and isinstance(value[0], dict) and "fileSha256" in value[0]:
            font_files = value
            break
for font in font_files:
    check("installed font byte provenance " + font["path"], hashlib.sha256(Path(font["path"]).read_bytes()).hexdigest() == font["fileSha256"])
check("font inventory denominator", len(font_files) == 18)
coverage = runtime["fontVersionCoverage"]
check("Skia variable descriptor remains explicitly unresolved", len(coverage["exactNamedFaces"]) == 21 and coverage["variableDescriptorUnresolved"] == ["Skia-Regular_wght30000_wdth14000"])
report = {"schema": "aqrobat.independent-supplement-review.v1", "atUtc": datetime.now(timezone.utc).isoformat(), "passed": all(c["passed"] for c in checks), "checks": checks, "nativeGate": {"profiledCaptures": native_profiles, "executedBranches": native_branches, "allProfiledBranchesFail": True, "unprofiledCaptures": unprofiled}, "fontFilesHashed": len(font_files), "newCaptureReaderLocatorBinarizerCalls": 0}
(root / run / "review/supplementary-checks.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps({"passed": report["passed"], "checks": len(checks), "failures": [c for c in checks if not c["passed"]], "nativeGate": report["nativeGate"], "fontFilesHashed": len(font_files)}, indent=2))

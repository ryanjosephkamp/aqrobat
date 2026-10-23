"""Reconcile completed captures, unused slots and ordinary reader calls."""
from pathlib import Path
from datetime import datetime, timezone
import csv
import hashlib
import json

root = Path.cwd()
base = root / "docs/research/prose-qr/portable-story-2026-10-11"
def read(path):
    return json.loads(path.read_text())
def rows(path):
    return [json.loads(s) for s in path.read_text().splitlines() if s] if path.exists() else []
def rel(path):
    return str(Path(path).resolve().relative_to(root))
def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def save(name, value):
    (base / name).write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n")

calls, slots, controls = [], [], []
def add_calls(folder, row, path):
    for r in row.get("readings", []):
        calls.append({"engine": r["engine"], "path": rel(path), "pngSha256": sha(path),
            "expectedPayload": row.get("payload", row.get("spec", {}).get("payload")),
            "exact": r["exact"], "texts": r.get("texts"), "status": r.get("status"),
            "error": r.get("error"), "receipt": rel(folder / ("results.jsonl" if (folder / "results.jsonl").exists() else "results.json")),
            "rawStdout": rel(folder / f'{row["id"]}-{r["engine"]}.stdout.txt')})

for i in range(1, 8):
    folder = base / f"batch-{i:02d}"
    manifest = read(folder / "manifest.json")
    done = {r["id"]: r for r in rows(folder / "results.jsonl")}
    abort = read(folder / "abort.json") if (folder / "abort.json").exists() else None
    for spec in manifest["config"]["specs"]:
        id = spec["id"]
        row = done.get(id)
        slot = {"batch": folder.name, "id": id, "spec": spec, "control": False,
                "status": "captured" if row else "not captured after batch abort",
                "manifest": rel(folder / "manifest.json")}
        if row:
            path = folder / f"{id}.png"
            slot.update({"path": rel(path), "pngSha256": sha(path), "repeatExact": row["repeatExact"],
                "width": row["width"], "height": row["height"], "structural": row.get("structural"),
                "selectionExact": True, "paint": row.get("paint"), "fonts": row.get("fonts")})
            add_calls(folder, row, path)
        elif abort:
            slot["batchStopReason"] = abort["error"].splitlines()[0]
            slot["failureOrUnused"] = "first blocked source" if id == abort["uncompleted"][0] else "unused later slot"
        slots.append(slot)
    for id, row in done.items():
        if row["spec"].get("control"):
            path = folder / f"{id}.png"
            controls.append({"batch": folder.name, "id": id, "path": rel(path),
                "pngSha256": sha(path), "repeatExact": row["repeatExact"], "control": True})
            add_calls(folder, row, path)

for i in range(1, 5):
    folder = base / f"workbench-test-{i:02d}"
    manifest = read(folder / "manifest.json")
    done = {r["id"]: r for r in rows(folder / "results.jsonl")}
    for item in manifest["config"]["cases"]:
        id, row = item["id"], done.get(item["id"])
        path = folder / f"{id}.png"
        slot = {"batch": folder.name, "id": id, "spec": item["spec"], "control": False,
            "manifest": rel(folder / "manifest.json"), "status": "captured" if row else "unused after setup abort"}
        if path.exists():
            repeat = folder / f"{id}-repeat.png"
            slot.update({"path": rel(path), "pngSha256": sha(path), "repeatExact": path.read_bytes() == repeat.read_bytes()})
        if row:
            slot.update({"structural": row["summary"], "selectionExact": row["selectionExact"],
                "rawSourceExact": row["sourceRawExact"], "wholeCopiesExact": row["wholeCopiesExact"],
                "replay": row["replay"], "paint": row["paint"]})
            add_calls(folder, row, path)
        elif path.exists():
            slot["status"] = "captured; rejected baseline replay before readers"
            slot["reason"] = "Fractional iframe position produced 840x841 pixels; saved HTML was unchanged. Standalone capture used prospectively in Test03."
        slots.append(slot)

native = read(base / "native-document-01/results.json")
for id, key in [("rtf-native", "rtf"), ("pdf-native", "pdf")]:
    path = base / "native-document-01" / f"{id}.png"
    repeat = path.parent / f"{key}-repeat.png"
    slots.append({"batch": "native-document-01", "id": id, "control": False,
        "status": "captured", "path": rel(path), "pngSha256": sha(path), "repeatExact": path.read_bytes() == repeat.read_bytes(),
        "spec": {"font":"Impact", "fontSize":12, "fontPoints":9, "field":600},
        "selectionExact": native["nativeWordSequenceExact"], "surface":"native Letter RTF/PDF at 96dpi"})
for i in range(1,4):
    folder = base / f"native-textedit-{i:02d}"
    result = read(folder / "native-results.json")
    slot = {"batch":folder.name, "id":"formatted-paste", "control":False,
        "status":"captured" if result["captured"] else "native layout gate failed; no capture/readers",
        "surface":"actual TextEdit saved RTF", "spec":{"font":"Impact", "field":600},
        "nativeRowsExact":result["nativeRowsExact"], "nativeWordSequenceExact":result["nativeWordSequenceExact"],
        "nativePoints":result["pointSizes"], "allGlyphsFit":result["allGlyphsFitLetterBody"]}
    if result["captured"]:
        slot.update({"path":rel(folder/"native.png"),"pngSha256":sha(folder/"native.png"), "repeatExact":result["repeatExact"]})
    else: slot["reason"] = result["stopReason"]
    slots.append(slot)
for name in ["browser-summary.json","pdf-summary.json"]:
    for row in read(base / "high-dpi-01" / name)["rows"]:
        path = base / "high-dpi-01" / (row["id"]+".png")
        slot = {"batch":"high-dpi-01", **row, "path":rel(path), "control":row.get("control",False),
                "status":"captured", "spec":{"font":"Avenir Next Condensed" if "black" in row["id"] else "Impact", "fontSize":10 if "black" in row["id"] else 12, "field":600},
                "surface":"native browser DPR" if "scale" in row else "native PDFKit dpi"}
        (controls if slot["control"] else slots).append(slot)
for row in read(base / "native-exports-01/summary.json")["rows"]:
    path = root / row["path"]
    result = row["result"]
    slots.append({"batch":"native-exports-01", "id":row["id"], "status":"captured", "control":False,
        "path":rel(path), "pngSha256":sha(path), "repeatExact":result["repeatExact"],
        "nativeRowsExact":result["nativeRowsExact"], "nativeWordSequenceExact":result["nativeWordSequenceExact"],
        "allGlyphsFit":result["allGlyphsFitLetterBody"], "nativePoints":result["pointSizes"],
        "surface":"generator RTF in AppKit", "replay":row.get("byteReplayOf")})

for folder in sorted(base.glob("read-*/")):
    for row in read(folder / "results.json")["rows"]:
        add_calls(folder,row,root / row["path"])
for folder in sorted(base.glob("vision-*/")):
    for row in read(folder/"results.json")["rows"]:
        calls.append({"engine":"vision", "path":rel(root/row["path"]), "pngSha256":row["pngSha256"],
            "expectedPayload":row["expected"], "texts":row["texts"], "exact":row["exact"], "status":0,
            "receipt":rel(folder/"results.json"), "rawStdout":rel(folder/"stdout.txt")})
for row in read(base / "zbar-01/results.json")["rows"]:
    calls.append({"engine":"zbar", **row, "expectedPayload":"https://example.com/", "receipt":rel(base/"zbar-01/results.json")})

for slot in slots + controls:
    matching = [r for r in calls if r["pngSha256"] == slot.get("pngSha256")]
    results = {}
    for engine in ["zxing","jsqr","opencv","vision","zbar"]:
        rs = [r for r in matching if r["engine"] == engine]
        if rs:
            assert len({r["exact"] for r in rs}) == 1
            results[engine] = {"status":"exact" if rs[0]["exact"] else "not recovered", "callsOnTheseBytes":len(rs),
                "evidence":[r["receipt"] for r in rs], "sameBytesEvidence":True}
        else: results[engine] = {"status":"not run"}
    slot["readers"] = results
    slot["twoSoftwareReadersExact"] = sum(r["status"] == "exact" for r in results.values()) >= 2
for call in calls:
    assert call.get("status") == 0 and not call.get("error")
    assert all(t == call["expectedPayload"] for t in (call.get("texts") or [])), call
    assert (root / call["receipt"]).exists()
captured = [s for s in slots if s.get("path")]
assert len(slots) == 130
assert len(captured) == 105
assert len(controls) == 8
assert all(s["repeatExact"] for s in captured + controls)
assert len(calls) == 432
counts = {
    "plannedCandidateSlots":len(slots), "candidateCaptureSlots":len(captured),
    "distinctCandidateNativePngs":len({s["pngSha256"] for s in captured}),
    "candidateSlotsWithoutImage":len(slots)-len(captured), "controls":len(controls),
    "exactCandidateAndControlRepeats":len(captured)+len(controls),
    "ordinaryResearchReaderCalls":len(calls),
    "readerCallsByEngine":{e:sum(c["engine"]==e for c in calls) for e in ["zxing","jsqr","opencv","vision","zbar"]},
    "maximumProductRegressionDecoderCalls":39, "conservativeCombinedReaderCalls":471,
    "remainingReaderCallAllowance":9,
    "capturedCandidateSlotsWithTwoSoftwareSuccesses":sum(s["twoSoftwareReadersExact"] for s in captured),
    "smallPageCandidatesWithTwoSoftwareSuccesses":0,
    "ownerPositiveAppSurfaceCells":10, "ownerNegativeAppSurfaceCells":1,
    "phoneDenominatorMeaning":"Reported app/surface cells; no independent algorithm or repeat-attempt count inferred.",
    "resourceCapturesBeforeHandback":5,
    "resourceExplanation":"1 font probe plus 4 actual TextEdit UI observations (one displayed only, three PNG files); font probe alone has an exact repeat.",
}
save("reader-ledger.json", {"at":datetime.now(timezone.utc).isoformat(), "inputTransforms":"none", "calls":calls})
save("candidate-ledger.json", {"at":datetime.now(timezone.utc).isoformat(), "counts":counts, "slots":slots, "controls":controls})
with (base / "candidate-ledger.csv").open("w",newline="") as f:
    writer = csv.DictWriter(f,fieldnames=["batch","id","status","path","pngSha256","font","fontSize","field","case","gray","darkWeight","lightWeight","zxing","jsqr","opencv","vision","zbar","twoSoftwareReadersExact"])
    writer.writeheader()
    for slot in slots + controls:
        spec = slot.get("spec",{})
        row = {k:slot.get(k,"") for k in ["batch","id","status","path","pngSha256","twoSoftwareReadersExact"]}
        row.update({k:spec.get(k,"") for k in ["font","fontSize","field","case","gray","darkWeight","lightWeight"]})
        row.update({e:slot["readers"][e]["status"] for e in ["zxing","jsqr","opencv","vision","zbar"]})
        writer.writerow(row)
print(json.dumps(counts))

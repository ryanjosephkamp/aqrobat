import cv2
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

root = Path("docs/research/prose-qr/phase-09")
out = root / "detector-01"
out.mkdir()
sha = lambda b: hashlib.sha256(b).hexdigest()
inputs = []
for batch in ("words-01", "words-02", "fonts-02"):
    base = root / batch
    results = base / "results.jsonl"
    if results.exists():
        for row in map(json.loads, results.read_text().splitlines()):
            inputs.append({"path": str(base / row["path"]), "sha256": row["pngSha256"], "kind": "completed-native", "id": row["id"]})
    controls = json.loads((base / "controls.json").read_text())
    for kind in ("full", "solid"):
        row = controls[kind]
        inputs.append({"path": str(base / row["path"]), "sha256": row["pngSha256"], "kind": kind, "id": batch + "-" + kind})
first = root / "words-01/raw/impact-light-rum.png"
inputs.append({"path": str(first), "sha256": sha(first.read_bytes()), "kind": "interrupted-native", "id": "words-01-interrupted"})
prior = Path("docs/research/prose-qr/phase-08/placement-01")
for row in map(json.loads, (prior / "results.jsonl").read_text().splitlines()):
    inputs.append({"path": str(prior / row["path"]), "sha256": row["pngSha256"], "kind": "prior-native", "id": row["id"]})
manifest = {"at": datetime.now(timezone.utc).isoformat(), "opencv": cv2.__version__, "inputs": inputs,
            "sources": {p: sha(Path(p).read_bytes()) for p in (str(Path(__file__)), str(root / "PLAN-04.md"))},
            "options": "QRCodeDetector defaults; detect only; full controls additionally detectAndDecode", "planned": 44}
(out / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
assert len(inputs) == 44
detector = cv2.QRCodeDetector()
rows = []
for item in inputs:
    try:
        b = Path(item["path"]).read_bytes()
        assert sha(b) == item["sha256"]
        image = cv2.imread(item["path"])
        assert image is not None
        ok, points = detector.detect(image)
        row = {**item, "shape": list(image.shape), "detected": bool(ok), "points": None if points is None else points.tolist()}
        if item["kind"] == "full":
            text, decode_points, straight = detector.detectAndDecode(image)
            row["fullControl"] = {"text": text, "exact": text == "https://example.com/", "points": None if decode_points is None else decode_points.tolist()}
        rows.append(row)
    except Exception as error:
        rows.append({**item, "error": repr(error)})
    with (out / "results.jsonl").open("a") as stream:
        stream.write(json.dumps(rows[-1]) + "\n")
receipt = {"completed": len(rows), "errors": sum("error" in r for r in rows), "counts": {k: {"inputs": sum(r["kind"] == k for r in rows), "detected": sum(r["kind"] == k and r.get("detected", False) for r in rows)} for k in ("completed-native", "interrupted-native", "prior-native", "full", "solid")}, "fullControlDecodes": sum(r.get("fullControl", {}).get("exact", False) for r in rows), "newNativeCaptures": 0, "newPayloads": 0}
(out / "summary.json").write_text(json.dumps(receipt, indent=2) + "\n")
print(json.dumps(receipt))

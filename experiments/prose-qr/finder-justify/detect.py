import cv2
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

root = Path("docs/research/prose-qr/phase-11")
base = root / "run-01"
out = root / "detector-01"
out.mkdir()
sha = lambda b: hashlib.sha256(b).hexdigest()
rows = [json.loads(line) for line in (base / "results.jsonl").read_text().splitlines()]
controls = json.loads((base / "controls.json").read_text())
inputs = [{**r, "kind": "native"} for r in rows]
inputs += [{**controls[k], "id": k, "kind": k} for k in ("full", "solid")]
manifest = {"at": datetime.now(timezone.utc).isoformat(), "opencv": cv2.__version__, "cv2Module": cv2.__file__,
            "sources": {p: sha(Path(p).read_bytes()) for p in (str(Path(__file__)), str(root / "PLAN.md"))},
            "planned": 4, "inputPngHashes": {r["id"]: r["pngSha256"] for r in inputs},
            "nativeInputTransforms": "none; cv2.imread -> default QRCodeDetector.detect",
            "replica": "post-probe diagnostic only, not acceptance input or observed internal pixel identity"}
(out / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
(out / "build-info.txt").write_text(cv2.getBuildInformation())
assert len(inputs) == 4
detector = cv2.QRCodeDetector()
results = []
for row in inputs:
    result = {"id": row["id"], "kind": row["kind"], "pngSha256": row["pngSha256"]}
    try:
        png = (base / row["path"]).read_bytes()
        assert sha(png) == row["pngSha256"]
        image = cv2.imread(str(base / row["path"]))
        rgba = cv2.cvtColor(image, cv2.COLOR_BGR2RGBA)
        result["rgbaSha256"] = sha(rgba.tobytes())
        result["rgbaExact"] = result["rgbaSha256"] == row["rgbaSha256"]
        assert result["rgbaExact"]
        del rgba
        ok, points = detector.detect(image)
        result.update({"detected": bool(ok), "points": None if points is None else points.tolist(), "width": image.shape[1], "height": image.shape[0]})
        if row["kind"] == "native":
            layout = json.loads((base / (row["id"] + "-layout.json")).read_text())
            pad, edge = layout["quiet"] * layout["unit"], (layout["quiet"] + layout["modules"]) * layout["unit"] - 1
            expected = [(pad, pad), (edge, pad), (edge, edge), (pad, edge)]
            result["intendedQuad"] = bool(ok) and all(((points[0][i][0] - x) ** 2 + (points[0][i][1] - y) ** 2) ** 0.5 < layout["unit"] for i, (x, y) in enumerate(expected))
            result["postDetectionExpectedQuad"] = expected
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            native_bin = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 83, 2)
            result["replicaNativeBinSha256"] = sha(native_bin.tobytes())
            del native_bin
            small = cv2.resize(gray, (512, 512), interpolation=cv2.INTER_AREA)
            binary = cv2.adaptiveThreshold(small, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 83, 2)
            result["diagnosticScale"] = 512 / image.shape[0]
            result["diagnosticFiles"] = {}
            for suffix, arr in (("gray", small), ("binary", binary)):
                ok_write, encoded = cv2.imencode(".png", arr)
                assert ok_write
                path = row["id"] + "-replica-" + suffix + ".png"
                with (out / path).open("xb") as stream:
                    stream.write(encoded.tobytes())
                result["diagnosticFiles"][suffix] = {"path": path, "pngSha256": sha(encoded.tobytes()), "pixelSha256": sha(arr.tobytes()), "classification": "Post-probe replica diagnostic only; not native acceptance input"}
        elif row["kind"] == "full":
            text, _, _ = detector.detectAndDecode(image)
            result["controlDecoded"] = text
            result["controlExact"] = text == "https://example.com/"
    except Exception as error:
        result["error"] = repr(error)
    results.append(result)
    with (out / "results.jsonl").open("a") as stream:
        stream.write(json.dumps(result) + "\n")
    print(json.dumps({k: v for k, v in result.items() if k in ("id", "detected", "intendedQuad", "controlExact", "rgbaExact", "error")}), flush=True)
summary = {"completed": len(results), "errors": sum("error" in r for r in results), "native": len(rows), "nativeDetected": sum(r.get("detected", False) and r["kind"] == "native" for r in results), "nativeIntendedQuad": sum(r.get("intendedQuad", False) for r in results), "nativePayloadDecodes": 0, "externalAcceptanceTransforms": 0}
(out / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
print(json.dumps(summary))

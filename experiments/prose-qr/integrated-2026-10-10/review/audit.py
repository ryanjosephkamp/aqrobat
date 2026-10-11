"""Read-only evidence audit. Writes only the independent review's output tree.

No rendering, image viewing, browser, application, QR decoding, locator, or
binarization is imported or invoked. PNG decompression is lossless byte custody.
"""

import base64
import csv
import gzip
import hashlib
import json
import pathlib
import struct
import subprocess
import zlib
from collections import Counter
from datetime import datetime, timezone
from html.parser import HTMLParser
from urllib.parse import unquote, urlparse

ROOT = pathlib.Path(__file__).resolve().parents[4]
RUN = pathlib.Path("docs/research/prose-qr/integrated-2026-10-10")
EMP = RUN / "empirical"
OUT = RUN / "review"
checks = []
inventory = {}


def digest(b):
    return hashlib.sha256(b).hexdigest()


def read(path):
    path = pathlib.Path(path)
    b = (ROOT / path).read_bytes()
    inventory[str(path)] = {"path": str(path), "bytes": len(b), "sha256": digest(b)}
    return b


def js(path):
    b = read(path)
    return json.loads(gzip.decompress(b) if str(path).endswith(".gz") else b)


def check(name, passed, details=None):
    checks.append({"name": name, "passed": bool(passed), "details": details})


def hash_check(path, expected, label=None):
    actual = digest(read(path))
    check(label or "hash " + str(path), actual == expected, {"expected": expected, "actual": actual})


def png_rgba(path):
    """Decode only PNG byte filters, without processing or showing the image."""
    data = read(path)
    assert data[:8] == b"\x89PNG\r\n\x1a\n"
    pos, compressed, ihdr = 8, bytearray(), None
    while pos < len(data):
        n = int.from_bytes(data[pos : pos + 4], "big")
        typ, value = data[pos + 4 : pos + 8], data[pos + 8 : pos + 8 + n]
        crc = int.from_bytes(data[pos + 8 + n : pos + 12 + n], "big")
        assert zlib.crc32(typ + value) & 0xFFFFFFFF == crc
        if typ == b"IHDR":
            ihdr = struct.unpack(">IIBBBBB", value)
        elif typ == b"IDAT":
            compressed.extend(value)
        pos += n + 12
    w, h, depth, color, comp, filt, interlace = ihdr
    assert depth == 8 and color in (2, 6) and comp == filt == interlace == 0
    channels = 3 if color == 2 else 4
    raw = zlib.decompress(compressed)
    stride = w * channels
    assert len(raw) == h * (stride + 1)
    previous = bytearray(stride)
    rgba = bytearray()
    for y in range(h):
        start = y * (stride + 1)
        filter_kind = raw[start]
        row = bytearray(raw[start + 1 : start + 1 + stride])
        assert filter_kind in range(5)
        for i in range(stride):
            a = row[i - channels] if i >= channels else 0
            b, c = previous[i], previous[i - channels] if i >= channels else 0
            if filter_kind == 1:
                prediction = a
            elif filter_kind == 2:
                prediction = b
            elif filter_kind == 3:
                prediction = (a + b) // 2
            elif filter_kind == 4:
                p = a + b - c
                distances = [abs(p - a), abs(p - b), abs(p - c)]
                prediction = [a, b, c][distances.index(min(distances))]
            else:
                prediction = 0
            row[i] = (row[i] + prediction) & 255
        if channels == 4:
            rgba.extend(row)
        else:
            for i in range(0, stride, 3):
                rgba.extend(row[i : i + 3])
                rgba.append(255)
        previous = row
    return w, h, bytes(rgba)


class SourceParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tags, self.styles, self.text, self.spans, self.ids = [], [], [], [], []
        self.depth, self.span, self.current, self.in_style = 0, None, None, False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        self.tags.append(tag)
        if a.get("id"):
            self.ids.append(a["id"])
        if tag == "style":
            self.in_style = True
        if tag == "p":
            self.current = []
        if tag == "span":
            self.span = {"attrs": a, "text": ""}

    def handle_endtag(self, tag):
        if tag == "style":
            self.in_style = False
        if tag == "span":
            self.spans.append(self.span)
            self.span = None
        if tag == "p":
            self.text.append("".join(self.current))
            self.current = None

    def handle_data(self, data):
        if self.in_style:
            self.styles.append(data)
        if self.current is not None:
            self.current.append(data)
        if self.span is not None:
            self.span["text"] += data


def inspect_native(spec, capture):
    prefix = pathlib.Path(capture["dir"])
    source = read(spec["htmlPath"]).decode()
    parser = SourceParser()
    parser.feed(source)
    dom = js(prefix / "dom.json")
    d = dom["dom"]
    texts = spec["texts"]
    check(str(prefix) + " literal source paragraphs", parser.text == texts)
    check(str(prefix) + " one span per source character", len(parser.spans) == sum(map(len, texts)) and all(len(s["text"]) == 1 for s in parser.spans))
    check(str(prefix) + " unique source IDs", len(parser.ids) == len(set(parser.ids)))
    check(str(prefix) + " no graphics or script", not set(parser.tags).intersection({"img", "svg", "canvas", "script", "object", "iframe"}))
    check(str(prefix) + " exact saved DOM paragraph and Selection", [p["text"] for p in d["paragraphs"]] == texts and [p["selection"] for p in d["paragraphs"]] == texts)
    check(str(prefix) + " preregistered two-LF full Selection", spec["fullText"] == "\n\n".join(texts) and d["fullSelection"] == spec["fullText"] and dom["expectedFullSelection"] == spec["fullText"])
    check(str(prefix) + " source glyph DOM identity", "".join(g["ch"] for g in d["glyphs"]) == "".join(texts))
    check(str(prefix) + " visible saved glyph style", all(g["opacity"] == "1" and g["visibility"] == "visible" and g["display"] != "none" for g in d["glyphs"]))
    actual_fonts = {f["postScriptName"] for p in dom["fonts"] for f in p["fonts"]}
    check(str(prefix) + " actual CDP expected native fonts", actual_fonts == set(spec["expectedFonts"]) and all(not f["isCustomFont"] for p in dom["fonts"] for f in p["fonts"]), sorted(actual_fonts))
    css = "".join(parser.styles) + " ".join(s["attrs"].get("style", "") for s in parser.spans)
    # @font-face src:local aliases are installed faces, confirmed by CDP above;
    # the declaration itself does not establish a downloaded/custom font.
    check(str(prefix) + " no CSS hidden graphic replacement", not any(s in css.lower() for s in ["url(", "content:", "opacity:0", "opacity: 0", "display:none", "display: none", "visibility:hidden", "visibility: hidden", "clip-path", "background-image"]))


def audit():
    OUT_ABS = ROOT / OUT
    OUT_ABS.mkdir(parents=True, exist_ok=True)
    initial = subprocess.run(["git", "status", "--short"], cwd=ROOT, check=True, capture_output=True, text=True).stdout
    head = subprocess.run(["git", "rev-parse", "HEAD"], cwd=ROOT, check=True, capture_output=True, text=True).stdout.strip()
    branch = subprocess.run(["git", "branch", "--show-current"], cwd=ROOT, check=True, capture_output=True, text=True).stdout.strip()
    remote = subprocess.run(["git", "remote", "get-url", "origin"], cwd=ROOT, check=True, capture_output=True, text=True).stdout.strip()
    check("baseline/branch/remote", head == "a5cd4c2cbc6a285b7922e7d4c031eef750eb4222" and branch == "codex/aqrobat-foundation" and remote == "https://github.com/ryanjosephkamp/aqrobat.git")
    check("tracked bytes unchanged at audit", subprocess.run(["git", "diff", "--quiet", "HEAD", "--"], cwd=ROOT).returncode == 0, initial)
    # Hash both complete worker trees. Parent draft/coordination files are explicitly mutable.
    for base in [RUN, pathlib.Path("experiments/prose-qr/integrated-2026-10-10")]:
        for lane in ["empirical", "design", "mechanism"]:
            for path in sorted((ROOT / base / lane).rglob("*")):
                if path.is_file():
                    read(path.relative_to(ROOT))
    for p in ["AGENTS.md", "docs/PROJECT-HANDOFF.md", str(RUN / "REQUEST.txt"), str(RUN / "START.json"), str(RUN / "allocation-02.json"), "package.json", "package-lock.json", "vendor/qrcodegen.mjs", "vendor/LICENSE-qrcodegen.txt"]:
        if (ROOT / p).exists():
            read(p)
    check("npm private", js("package.json")["private"] is True)
    design = js(RUN / "design/final-manifest.json")
    for a in design["artifacts"]:
        hash_check(a["path"], a["sha256"])
    mechanism = js(RUN / "mechanism/final.json")
    for a in mechanism["ownedInventory"]:
        hash_check(a["path"], a["sha256"])
    custody = js(EMP / "source-custody/manifest.json")
    for a in custody["sourceSnapshots"]:
        hash_check(a["gzipSnapshot"], a["gzipSha256"])
        b = gzip.decompress(read(a["gzipSnapshot"]))
        check("snapshot raw " + a["path"], digest(b) == a["sha256"] and len(b) == a["bytes"])
        if a["livePathPreserved"]:
            hash_check(a["path"], a["sha256"])
    for a in custody["pinned"]:
        if "sha256" in a:
            hash_check(a["path"], a["sha256"])
    summaries, totals = [], Counter()
    native_payloads, default_checks, pngs = [], [], {}
    for name in ["layout-01", "layout-02", "layout-03", "layout-04", "layout-05", "payload-01", "payload-02", "payload-03", "payload-04"]:
        p = EMP / name
        prereg, result, ledger = js(p / "preregistration.json"), js(p / "run-results.json"), js(p / "ledger.json")
        check(name + " prereg before invocation", prereg["frozenAtUtc"] <= result["startedAtUtc"])
        for path, sha in prereg["sourceHashes"].items():
            hash_check(path, sha, name + " source " + path)
            gz = p / ("executed-" + pathlib.Path(path).name + ".gz")
            check(name + " executed source " + path, digest(gzip.decompress(read(gz))) == sha)
        specs = {s["id"]: s for s in prereg["specs"]}
        check(name + " complete ordered ordinary slots", [(s["id"], s["engine"]) for s in result["slots"]] == [(s["id"], e) for s in prereg["specs"] for e in prereg["readerOrder"]])
        check(name + " ledger same slots", ledger["slots"] == result["slots"])
        check(name + " task browser closed receipt", result["browserClosed"] is True)
        for c in result["captures"]:
            spec = specs[c["id"]]
            hash_check(spec["htmlPath"], spec["htmlSha256"])
            hash_check(c["pngPath"], c["pngSha256"])
            hash_check(pathlib.Path(c["dir"]) / "repeat.png", c["repeatSha256"])
            w, h, rgba = png_rgba(c["pngPath"])
            rw, rh, repeat = png_rgba(pathlib.Path(c["dir"]) / "repeat.png")
            pngs[c["pngPath"]] = (w, h, rgba)
            check(c["dir"] + " raw PNG/RGBA", w == c["width"] and h == c["height"] and digest(rgba) == c["rgbaSha256"] and digest(repeat) == c["repeatRgbaSha256"])
            check(c["dir"] + " repeat flag agrees bytes", c["repeatExact"] == (read(c["pngPath"]) == read(pathlib.Path(c["dir"]) / "repeat.png")))
            totals[c["kind"] + "Captures"] += 1
            totals["repeatAttempts"] += 1
            totals["exactRepeats"] += c["repeatExact"]
            if c["kind"] == "native":
                inspect_native(spec, c)
                if spec.get("payloadTrial"):
                    totals["payloadTrials"] += 1
                    native_payloads.append({"batch": name, "id": c["id"], "pngSha256": c["pngSha256"], "sourceSha256": c["sourceHtmlSha256"]})
            if spec.get("samplePrediction"):
                pred = js(spec["samplePrediction"]["path"])
                hash_check(spec["samplePrediction"]["path"], spec["samplePrediction"]["sha256"])
                mismatches = [s for s in pred["samples"] if int(rgba[(s["py"] * w + s["px"]) * 4] < 128) != s["expected"]]
                check(name + " raw literal prediction", not mismatches, {"samples": len(pred["samples"]), "mismatches": len(mismatches)})
        for s in result["slots"]:
            if s["status"] == "unattempted":
                totals["ordinaryUnattempted"] += 1
                continue
            totals["ordinaryCalls"] += 1
            rawpath = pathlib.Path(specs[s["id"]]["dir"]) / (s["engine"] + ".raw.json.txt")
            hash_check(rawpath, s["rawSha256"])
            raw = js(rawpath)
            texts = ([raw["text"]] if raw.get("text") else []) if s["engine"] == "opencv" else raw["texts"]
            check(str(rawpath) + " exact slot raw texts", texts == s["texts"] and raw["pngSha256"] == s["pngSha256"])
            check(str(rawpath) + " exact expected literal", s["exactExpected"] == (texts == ["https://example.com/"]))
            if s["engine"] in ["jsqr", "zxing"]:
                check(str(rawpath) + " default options", raw["optionsArgumentOmitted"] is True)
            else:
                check(str(rawpath) + " default profile", raw.get("profile") == "default detectAndDecode; no setters/options/geometry/transform")
        totals["fullUnattempted"] += len(prereg["specs"]) - len(result["captures"])
        totals["profilesUnattempted"] += prereg["denominator"]["profiles"] - len(result["profiles"])
        summaries.append({"batch": name, "planned": prereg["denominator"], "captures": len(result["captures"]), "calls": sum(s["status"] != "unattempted" for s in result["slots"]), "profiles": len(result["profiles"]), "stop": result["stop"]})
        if result["stop"]:
            stop_time = result["stop"]["atUtc"]
            check(name + " no later ordinary invocation after stop", all(s.get("startedAtUtc", "") <= stop_time for s in result["slots"]))
    for path in sorted((ROOT / EMP).rglob("passive-full.json.gz")):
        x = js(path.relative_to(ROOT))
        totals["profiles"] += 1
        totals["nestedDecoderInvocations"] += sum(len(s["ordinaryDecodeAttempts"]) for s in x["scans"])
        check(str(path.relative_to(ROOT)) + " passive saved baseline parity", x["returnedFull"] == x["ordinaryBaseline"] and x["passiveReturnsMatch"] is True)
        check(str(path.relative_to(ROOT)) + " input parity", x["pngSha256"] == x["ordinaryPngSha256"] and x["rgbaSha256"] == x["ordinaryRgbaSha256"])
        for scan in x["scans"]:
            check(str(path.relative_to(ROOT)) + " first selected", scan["selectedFirstLocation"] == (scan["locations"][0] if scan["locations"] else None))
            if "payload-04/continuous-native" in str(path):
                check("V2 ordinary selected dimensions", scan["selectedFirstLocation"]["dimension"] == (165 if scan["branch"] == "normal-stock-first-scan" else 37))
    for name in ["resources-01", "resources-02", "resources-03", "resources-04", "resources-05", "resources-06"]:
        p = EMP / name
        prereg, result = js(p / "preregistration.json"), js(p / "results.json")
        for path, sha in prereg["sourceHashes"].items():
            hash_check(path, sha, name + " source " + path)
        totals["resources"] += result["captures"]
        totals["resourceDiagnostics"] += result["diagnostics"]
        totals["resourcesUnattempted"] += len(result["unattempted"])
        totals["resourceSetupFailures"] += sum(s.get("status") == "failed" and not (ROOT / p / s["id"] / "input.png").exists() for s in result.get("slots", []))
        check(name + " source diagnostic count", result["captures"] == result["diagnostics"] == len(result["rows"]))
        for row in result["rows"]:
            hash_check(row["pngPath"], row["pngSha256"])
            path = row.get("htmlPath", row.get("source"))
            hash_check(path, row.get("htmlSha256", row.get("sourceSha256")))
            if row.get("rgbaSha256"):
                w, h, rgba = png_rgba(row["pngPath"])
                check(str(row["pngPath"]) + " raw resource RGBA", digest(rgba) == row["rgbaSha256"])
                rawpath = pathlib.Path(row["dir"]) / "rgba.stdout.bin.gz"
                check(str(rawpath) + " retained raw RGBA", gzip.decompress(read(rawpath)) == rgba)
        summaries.append({"batch": name, "planned": prereg["denominator"], "captures": result["captures"], "diagnostics": result["diagnostics"], "unattempted": len(result["unattempted"]), "stop": result["stop"]})
    totals["inclusiveCalls"] = totals["ordinaryCalls"] + totals["profiles"] + totals["nestedDecoderInvocations"]
    expected = {"nativeCaptures": 9, "controlCaptures": 8, "repeatAttempts": 17, "exactRepeats": 16, "payloadTrials": 3, "ordinaryCalls": 37, "ordinaryUnattempted": 23, "fullUnattempted": 6, "profiles": 11, "profilesUnattempted": 9, "nestedDecoderInvocations": 27, "resources": 87, "resourceDiagnostics": 87, "resourcesUnattempted": 19, "resourceSetupFailures": 1, "inclusiveCalls": 75}
    check("independent complete denominator", dict(totals) == expected, dict(totals))
    handoff = js(EMP / "handoff.json")
    check("handoff objective unfinished", handoff["goalAchieved"] is False and handoff["nativeCandidateToOwner"] is None)
    actual = js(EMP / "payload-04/continuous-native/actual-ledger.json")
    w, h, rgba = pngs[str(EMP / "payload-04/continuous-native/input.png")]
    check("actual native all literal samples from raw bytes", all(s["gray"] == rgba[(s["py"] * w + s["px"]) * 4] and s["literal"] == int(s["gray"] < 128) for s in actual["samples"] + actual["quiet"]))
    check("actual native denominator", len(actual["samples"]) == 625 and len(actual["quiet"]) == 464 and len({(s["x"], s["y"]) for s in actual["samples"]}) == 625)
    check("actual gray fixed-alpha locked centers", sum(s["gray"] >= 219 for s in actual["samples"]) == 412)
    # Verify hashes a second time before closing to expose external mutations.
    changed = [p for p, a in inventory.items() if digest((ROOT / p).read_bytes()) != a["sha256"]]
    check("reviewed input bytes unchanged during audit", not changed, changed)
    report = {"schema": "aqrobat.independent-pure-review-checks.v1", "atUtc": datetime.now(timezone.utc).isoformat(), "passed": all(c["passed"] for c in checks), "checks": checks, "totals": dict(totals), "batches": summaries, "nativePayloads": native_payloads, "operations": {"newCaptures": 0, "imageDisplays": 0, "readers": 0, "locators": 0, "binarizers": 0, "apps": 0}, "inputFilesHashed": len(inventory)}
    (OUT_ABS / "pure-checks.json").write_text(json.dumps(report, indent=2) + "\n")
    (OUT_ABS / "review-scope-hashes.json").write_text(json.dumps({"schema": "aqrobat.independent-review-input-custody.v1", "atUtc": report["atUtc"], "boundary": "Complete empirical/design/mechanism worker trees plus specifically reviewed baseline and authorization files. Parent coordination and draft HTML are mutable and separately reviewed.", "files": list(inventory.values())}, indent=2) + "\n")
    print(json.dumps({"passed": report["passed"], "checks": len(checks), "failed": [c for c in checks if not c["passed"]], "totals": dict(totals), "inputFilesHashed": len(inventory)}, indent=2))


if __name__ == "__main__":
    audit()

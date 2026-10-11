import cv2
import hashlib
import json
import sys
import time
from pathlib import Path

path = Path(sys.argv[1])
blob = path.read_bytes()
image = cv2.imread(str(path))
start = time.monotonic()
text, points, straight = cv2.QRCodeDetector().detectAndDecode(image)
print(json.dumps({
    "engine": "opencv",
    "path": str(path),
    "pngSha256": hashlib.sha256(blob).hexdigest(),
    "version": cv2.__version__,
    "invocation": "QRCodeDetector().detectAndDecode(image); default options",
    "inputTransforms": "none",
    "texts": [text] if text else [],
    "points": None if points is None else points.tolist(),
    "elapsedMs": (time.monotonic() - start) * 1000,
}))

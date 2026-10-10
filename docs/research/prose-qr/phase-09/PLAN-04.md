# Independent default detector replay

OpenCV 4.13.0 is already installed. Use a new read-only script and exclusive
detector-01 directory to replay all 34 completed phase 09 native finder PNGs,
the one interrupted native PNG, the earlier three phase 08 placement PNGs,
and each phase 09 batch's conventional/solid controls (six control PNGs).
Total denominator 44 saved PNGs. Verify saved hashes before probing; count the
interrupted native artifact explicitly and separately. This is not a new native
capture or QR-payload sweep. Do not modify any image.

Use exactly `cv2.QRCodeDetector()` with default settings and its `detect(image)`
method on `cv2.imread` output. Use `detectAndDecode` on the three conventional
controls only. No resize, threshold modification, blur, crop, preprocessing,
known points, eps changes or retries. Preserve all raw returned points, errors
and outcomes. Expected source geometry is consulted only after detection.
The prior jsQR/default ZXing/baseline acceptance profiles remain unchanged;
OpenCV detection without a payload is not phone or decoding acceptance.

This guards against mistaking jsQR-specific candidate/scoring behavior for a
universal failure mechanism. Retain all positive/negative controls and errors.
No full QR generated, even if an independent detector locates a native cluster.

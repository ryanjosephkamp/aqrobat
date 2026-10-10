# Ordinary installed-reader replay

No new rendering or source change. Fresh detector-01 checks exactly the two
phase 15 native PNGs and one phase 12 conventional control with default OpenCV
detect. Verify native PNG/RGBA hashes and retain points/outcomes.

Fresh alternate-01 checks exactly the phase 14 native payload PNG and the same
conventional control with the installed default QRCodeDetectorAruco constructor
and detectAndDecode. No setter, corners, input transform or option change. This
is a separately named ordinary reader, never a repair or rerun of the default
QRCodeDetector failure. Record constructor defaults, installed version and all
outcomes. No additional image/model/package downloads.

API: [default ArUco QR reader](https://docs.opencv.org/4.13.0/d3/db0/classcv_1_1QRCodeDetectorAruco.html).

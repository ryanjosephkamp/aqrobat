# Post-return OpenCV binarizer replica

Before any new OpenCV call, register control plus the two completed native PNGs
(run01/02), three ordinary default detectAndDecode calls. No setters, expected
geometry, transform or forced extraction enters those calls. Original run03 is
unattempted under the capture reserve; it is not a native decoder failure.

After each default reader returns, make a diagnostic-only replica of the public
OpenCV4.13 init: square512 INTER_AREA resize, Gaussian adaptiveThreshold with
block83 and C2. Source inspected at
https://raw.githubusercontent.com/opencv/opencv/4.13.0/modules/objdetect/src/qrcode.cpp
lines114–154. Keep exact installed version and source URL/hash provenance.
This is a replica, not a passive trace of the actual internal object. Do not
supply its result to a decoder or call a resized image accepted output.

Native post-return diagnostics record H/V/both true diagonals, complete run
lengths, balanced central spans and wide-row fraction. Source coordinates only
locate diagnostic regions after the unchanged reader returned; an expected
point or ideal-center match is never selected-candidate or payload evidence.
Record actual returned OpenCV quad independently; if absent, selected geometry
is absent even if a replica's expected rays look correct. Full-resolution jsQR
selected-run evidence remains separate. Save small replica PNG/hash and summary
for reproducibility, never repair pixels or optimize a reader threshold.

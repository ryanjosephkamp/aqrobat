# Harness notes — October 10

All native pages use fresh task-owned headless Chromium contexts. Owner browser
profiles and other tasks/jobs are untouched. Native images are unchanged,
full-resolution inputs; PNG and decoded RGBA hashes are retained and rechecked.
Immediate native repeats compare PNG hashes. Matching repeat files are not stored
twice. No raster resizing, pixel repair, forced corners or source-aligned
extraction is passed to an acceptance reader.

Source geometry is used in the renderer and after reader returns for diagnostics.
Actual selected full-resolution jsQR horizontal, vertical and both diagonal runs,
quads, spans and stable-row scores stay separate from ZXing error-reporting symbol
audits and expected-region OpenCV initialization replicas. The latter reproduce
specific source operations; they are not captured internal OpenCV traces. Even
perfect expected-center samples are not decoded payloads.

Phase 37 introduces exact lossless numerical-log storage because original full
trace JSON exceeded modest file reserves. Four prior traces round trip byte
exactly. Packed traces preserve the original JSON hash and reconstruct it exactly.
Only numeric evidence is compressed; native letters and reader input pixels are
unchanged. Original reserve aborts and unattempted final controls remain intact.

The phase 46 Swift/Vision whole-profile process timed out at its 60-second harness
limit without stdout/stderr. The record cannot locate that timeout in compilation,
setup or native processing. Both planned rows are unknown. Phase 48 preregisters
the entire two-input profile again, control first, separate processes and immediate
raw/result custody, with 180-second resource bounds and explicit output-record
assignments. Default request, URL handler and empty options remain unchanged.
Both fresh rows complete; the native result is negative and the control positive.
This is one Vision implementation across attempts. The first timeout is not erased.

Python JSON is retained as raw gzip before presentation formatting. Executed
source hashes stay fixed. Meaningful unexecuted source drafts in phases 43, 47
and 48 are retained separately. The phase 47/48 draft copies were reconstructed
from retained tool inputs and are explicitly labeled as reconstructions, not
pre-execution custody captures. The actually executed source is pinned separately.

A full format check encountered four newly written phase 43 Python JSON files
during live capture. The failure is recorded in format-check-live-failure.json;
their raw bytes were preserved before formatting, and later full checks pass.
One edit-tool patch was rejected atomically for targeting a file twice; no file
changed from that rejected patch. It was corrected before further work. Neither
tooling event is an extra QR case or negative reader result.

The source word model, PNG/RGBA transport, decoder calls and diagnostic operations
are bounded separately. Phase caps include their source/evidence/custody files;
this report/source folder has a 3 MB logical-file cap. Large native RGBA arrays
exist transiently in memory only, never as new disk assets. One browser/decoder
job runs at a time. This session observed 56–60% system memory free in its checks;
that is not a recorded peak-memory profile.

Product code/downloads remain unchanged. npm test and the full format check are
the relevant product checks; product build/browser suites, installed extension,
Gmail, native clipboard, owner phone and physical print were not rerun. The report
is separately checked in fresh headless Chromium at 390 and 1280 pixels, including
denied-clipboard selection fallback. That is not native Mac clipboard acceptance.
Existing Pages automation already follows the draft branch, so backup pushes
trigger its existing rebuild. Settings and manual deployment remain untouched.

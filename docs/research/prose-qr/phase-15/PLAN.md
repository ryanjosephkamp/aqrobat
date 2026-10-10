# Phase 15 — larger native finder page

Exactly two preregistered finder-only layouts; no payload. Native regular black
Monaco 14 px/14 px, zero tracking, pitch 216, 25-module field, five-module margin
(7560 px page). Native letters retain their actual size; the page grows.
One continuous pre of words/newlines, justified spaces, no solid modules or
styled spans. Target only three finders, with light word material elsewhere.

Dark bank BOB BOBBY BEE BODE ODD DEED BED BUD BOO BOOM. Layout 1 light bank i;
layout 2 light bank ill it lit till lilt. Retain both results regardless of
outcome. The second asks whether whole words can replace isolated light tokens.
Mechanical gates: source width/wrap/font, adjacent ink nonoverlap, row ink
clearance at least 2 px. Native excerpts/owner review remain separate. DP uses
source geometry and approximate metrics only to choose words.

Native PNG and one immediate repeat per layout. Unchanged ordinary jsQR,
default ZXing and existing baseline, plus separately labeled error-reporting
diagnostic. Compare actual returned sampled symbol only after return: nominal
dimension/corners, all three complete 7 by 7 masks and horizontal, vertical and
both diagonal 1:1:3:1:1 runs. No corners or expected bits go to readers. Also
default OpenCV detect on the original PNGs plus a conventional control, with
no resampling/options/corner hints. No external image transformation is an
acceptance input. The larger page specifically probes ordinary built-in scale
handling. Coordinate-only positives are insufficient for a payload experiment.

Fresh proposal-01, run-01, run-02, detector-01. Cap 10,000,000 logical bytes
including source, capture reserve 8,000,000. Record every attempt, rejection,
checker error/abort and unattempted slot. No broad payload sweep, phone
candidate, prose naturalness or independent-reader success inferred here.

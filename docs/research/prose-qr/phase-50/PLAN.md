# Phase 50 — passive stock-reader logging, read-only

Preregister four calls to the installed default OpenCV4.13 detector, solely on
existing unchanged saved images: conventional URL control, phase45 full native
URL, and both phase49 finder-only native inputs. No new image, resize, crop,
threshold, corners or geometry is passed to any reader. Keep all decoder options
at default. Enable stock process logging through OPENCV_LOG_LEVEL=DEBUG only;
this changes verbosity, not QR acceptance. Compare returned text/corners with
the prior default calls and retain any disagreement instead of asserting parity.
This is another profile of one OpenCV implementation, not an independent engine.

The pinned source has a native-resolution adaptive threshold followed by a
flood-fill-derived version estimate. Its debug statements may show the version
chosen during the failed full native decode. If the installed build strips the
logs, record the missing trace as unknown, not proof of a particular failure.
Source inferences and actual internal log output stay distinct. Do not construct
or feed reconstructed internal images, forced extraction or expected geometry.

Exactly four planned input slots, each a fresh process, 90-second resource timeout.
A timeout/error stays unknown and is not retried. Capture raw stdout/stderr, exact
source/PNG/RGBA hashes and last structured JSON row per completed call. Decoder
logging must not replace unchanged baseline evidence. No payload generation or
phone candidate. Run only after phase49's task-owned job exits, one job at a time.

Cap200,000 logical bytes including source/custody; exclusive run-01 and child dirs,
no image duplicates. All earlier results and product/downloads preserved. npm
private, PR1 OPEN draft, no agents/chats/host/migration/merge/release/store/messages.
Goal unsolved; no new phone/print tests. First Vision timeout remains two unknown
slots separately from its later complete profile.

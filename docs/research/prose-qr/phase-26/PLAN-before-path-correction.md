# Phase 26 — independent ZBar replay, no native generation

Two preregistered saved inputs only: phase 14/run-01/native.png and phase 12/run-02/full.png
(the latter path is verified before execution). Exact expected URL https://example.com/.
No native generation, crop, resize, grayscale conversion or pixel repair supplied to
reader. Decode PNG to unchanged RGBA, verify recorded PNG/RGBA hashes, call the
package default scanImageData once per input. Retain all returns, errors, aborts
and timings. One native payload replay plus one conventional control, no sweep.

Use @undecaf/zbar-wasm 0.11.0 pinned registry integrity and upstream commit
c04ab59682681e27a24b36b36084806437a5d224. Download the package into this research
phase only, with original license/source pointers; no installation hooks,
package.json, lockfile or product dependency changes. ZBar is a different reader
from ZXing; build/source provenance remains explicit. Default settings only,
no parameters or geometry passed to reader. Success here would establish a
second implementation on this saved source, not phone/prose/portable acceptance.

Read-only inputs, fresh replay-01, cap 8,000,000 logical bytes including retained
package/source and experiment code. No source sweep or phone claim. If input paths
mismatch, record the error and correct the plan in a separate version before running.

# Phase 48 — fresh complete Vision profile after a harness timeout

Phase 46's whole-profile Swift process hit its 60-second harness limit with no
stdout or per-input result. Its two planned reader slots remain unknown; do not
turn them into negative results or erase the timeout. This fresh phase reattempts
the complete two-input default Vision profile, control first then full phase 45
native image. It changes result custody and resource allowance only, not the
reader, request, image or acceptance criterion. No selective image replacement,
native regeneration or decoder settings. Count Vision as one implementation.

Each input gets a fresh exclusive directory and independent process. Hash-check
the saved input and receipt. The Swift source uses VNDetectBarcodesRequest and
VNImageRequestHandler URL with empty options, matching the prior profile, and
records exact comparison only after return. Save each raw stdout/stderr and
structured row/error immediately. Permit at most 180 seconds per process. A
timeout remains unknown and is not retried in this phase. Complete both planned
slots even if one errors, preserving the exact denominator. No further Vision
attempt in this session.

Run after the phase 46 ZBar job finishes, with memory check and one job at a time.
No new installation or image copy; existing PNG input only. Fresh run-01/control
and run-01/native directories; logical cap 200,000 bytes including source. Preserve
all boundaries, npm private and OPEN draft PR 1. No agents, chats, new host,
migration, merge, release, store or messages. No new phone tests. Ordinary exact
recovery and phone acceptance remain separate; the prose goal is still unsolved.

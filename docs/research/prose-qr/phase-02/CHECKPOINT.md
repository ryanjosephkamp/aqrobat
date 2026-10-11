# Continuous-prose QR checkpoint

October 8, 2026. Work remains in `/Users/noir/Documents/aqrobat`, branch
`codex/aqrobat-foundation`, draft PR #1. The product stays version 0.4.2, npm
`private: true`. This continuation began at
`e6fa989dc02d2ccdba6ba33f04e401fecdb0df64`; the first verified phase-02 backup
is `931cfda`. The following handback and whole-word negative results are added
in a separate commit. Inspect current history and dirty state before resuming.

## Current finding

There are 64 completed continuous-text layouts and 220 unchanged raw display
frames. Both baseline readers recover zero exact payloads. Configured standard
ZXing recovers `AQROBAT-TEST` from six native 20-pixel letter frames. Their
exported HTML reproduces the original PNG hashes and payloads exactly.

Native successes: band-003, band-009, band-015, band-021, band-023, band-024.
The most readable successful story is band-023: Courier New, gray 120 regular
light regions / black bold dark regions, 63 lines, up to 126 characters per
line, a 2233-pixel square frame. This is still large and repeats its story.

The reader receives unchanged RGBA data and the options recorded in the report;
it performs its own thresholding/downscaling internally. It does not receive the
source QR matrix or expected payload. Baseline, configured-reader, externally
processed, and owner phone/print evidence are separate. No new phone/print
observations exist. Ryan's expectation that old examples would scan is not a pass.

The reflowed reading excerpt in `index.html` is for appearance and has no scan
result. The exact native layout, HTML and TXT download, and original PNG link
are separate. TXT drops gray/weight and therefore this encoding signal.

Black-only typography, shorter lines, ordinary rectangular layouts, and four
whole-word styling variants did not decode in their recorded tests. All failures
are retained. The initial continuous batch rejected flow-033 before capture on
a conservative natural-glyph-overhang gate; 19 more cases were never attempted.

## Resume prompt

Continue Aqrobat's prose-QR investigation from
`/Users/noir/Documents/aqrobat/docs/research/prose-qr/phase-02/CHECKPOINT.md`.
Read the report, owner voice review, and receipts. Verify checkout, remote,
branch, current Git history, dirty state, draft PR #1, and private npm setting.
Preserve all existing product source, exporters, extension, old prototypes,
closed experiment data, Splashery, private PDF archive, owner profiles and jobs.

Use any new owner appearance feedback to guide the next search. The target is
visible letters, ordinary spaces and punctuation, continuous paragraph lines,
and a less conspicuous QR signal. Fabricated/nonsensical words remain allowed;
do not substitute literary prose quality for the structural target. Native
band-023 is the strongest current starting point, but it is not an accepted
hidden-paragraph product. Explore shorter lines/fields, less conspicuous ink,
black-only alternatives, and additional payloads without claiming phone success.
Check actual native appearance and raw decoder outputs before another handback.

Keep changes within a new clearly identified experiment/evidence directory,
unless Ryan selects product integration. Choose a new manifest and exclusive
output path for new cases. Verify retained hashes without deleting or rerunning
closed grids. Run one fresh test-owned browser at a time, use bounded sequential
batches, retain negative results, and commit/push verified milestones to the
existing branch. Do not let a self-imposed resource cap stand in for acceptance.

Keep PR #1 draft, npm unpublished/private, and product Gmail/clipboard acceptance,
emoji atlas, and PDF work separate. Do not merge, deploy a new host, migrate the
project, change sharing, submit to the Chrome Web Store, message anyone, or start
other chats/agents. Owner voice feedback is enough; do not require exported notes.

## Other open lanes

- Existing saved-recipe browser insertion / Gmail and received-email acceptance.
- Native destination-specific copy/paste and font/layout portability.
- Proposed pinned-data emoji atlas, not executed here.
- Dedicated Codex project handoff when Ryan explicitly requests it.

This continuation does not complete or quietly expand those lanes. No model
training, runtime AI, new dependency, new font download, or new host was used.

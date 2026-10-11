# Joint ordinary-reader construction

Batch 06 recovered AQROBAT-TEST in ZXing for two native candidates. Batch 07's
one-pixel left/up placement change instead recovered it in jsQR for both M/Q
cases, while ZXing failed. These are different images, so this does not meet the
two-independent-engine promotion rule. Keep their successes and failures.

Build a joint two-by-two foreground-ink target, spanning the two observed ordinary
sampling positions, rather than choosing a reader result after capture. Readers
remain default and receive only unchanged PNGs. Wider baseline choices 10-34 in
40px type at 72px pitch retain nonoverlap. Test M and Q for both exact AQROBAT-TEST
and https://example.com/ payloads. URL version 2 gets an explicit smaller pair of
native square characters in a reserved five-module alignment area; the story
wraps around it, with no covered words or background modules. Overflow rejects.

The four candidates and their full pipeline are frozen before capture. Counts,
all negative reader results, corner compromise and platform limits stay visible.
No ceiling or deadline changes.

# Phase 08 preregistration — readable region objective

October 9, 2026. Baseline: `3bead571699cc767d03d5f96e829c0c85f694dd4`.
Scope is new `experiments/prose-qr/finder-region/` and this phase directory only.
No full-QR candidate, phone candidate or new device claim is authorized here.

## Fixed budget and sequence

Logical-file cap: 3,000,000 bytes including source, reports and custody. Reserve
400,000 bytes for verification/reporting. One task-owned headless Chrome, DPR 1;
no installation, owner profile, other process or server. Fresh exclusive run-01.
Four native seeds: installed Impact and Monaco at 20 px, weight 400, black,
24 px leading, zero tracking; each has area and region objectives. No synthetic
I/T/E words. Complete dictionary words of at least two letters, single spaces,
ordinary punctuation. Three identical native text nodes isolate the three finders.
These are finder diagnostics, not paragraphs or encoded QR codes.

Area objective uses the existing measured glyph model. Region objective weights
both diagonal corridors (2 px) and a band of parallel horizontal/vertical samples
across the central region (not just its center cross). Model scores are only
renderer proposals. Every retained native PNG is probed through the unchanged
ordinary binarizer and locator before expected-coordinate diagnostics.

Per font, select the seed with greatest native objective (ties: earlier ID).
Then two rounds of three whole-word substitutions. Rank central source rows by
native target disagreement; choose the worst three distinct rows. In each, replace
the word nearest the horizontal center by the highest ink-mass-per-advance
unused dictionary word that fits its previous advance (ties lexicographic).
No width scaling, letter boxes or arbitrary padding. All three mutations in a
round derive from its incumbent. Select the best including incumbent, then repeat.
Maximum 16 unique new native layouts, no retry for a rejected source. If no
replacement exists, retain a source rejection and leave that slot unattempted.

## Native objective and gates

Post-probe objective = region pixel agreement + mean continuous central-run
fraction across horizontal, vertical and two diagonal families + mean stable
row-span fraction + mean balanced native scored-candidate fraction. All four
terms are equally weighted in [0,1]. Stable rows require a black central span
at least 80% of expected width covering the expected center; candidate fraction
is min(top width, bottom width, height)/(3\*unit), clipped to 1, for eligible
ordinary quads whose center is within one unit. Expected coordinates are never
passed to the ordinary locator or independent payload readers. Passive quad/
point logging must return byte-for-byte-equivalent JSON locations. Native model
selection is not acceptance, regardless of score.

Reject legibility if native glyph-envelope clearance is below 2 px, adjacent
ink bounding boxes overlap, a source line overflows, font substitution occurs,
characters are under 20 px, tracking is negative, or source has synthetic words.
Preserve rejected outcomes. Agent visual inspection at native scale is an
additional explicit rejection gate, not owner legibility acceptance. No native
layout becomes a successful candidate unless intended ordinary finder geometry
is present AND legibility is not rejected. No full-QR sweep in this phase even
if that gate passes; first record and assess evidence.

## Controls and custody

One conventional full QR control (https://example.com/) through jsQR, default
ZXing, retained baseline; one solid finder control through ordinary locator and
passive diagnostic equivalence. Replay the old seam-01 seed exactly before new
capture. Retain every native source, HTML gzip, PNG, RGBA hash, native metrics,
ordinary results, diagnostics, source rejection, selection and abort. Immediate
repeat every native layout; mismatches retained. Save executed source versions
before formatting or fixes. Independent read-only replay of all retained PNGs.
Verify all 1,062 prior inventory entries and 40 saved executed-source hashes,
three product download hashes, branch/remote/HEAD/draft PR before edits and at
handback. Keep npm private, PR #1 draft; no product/extension changes, publication,
new host/chat/agent, migration, release, store, merge or messages.

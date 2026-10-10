# Sol review of the sealed Aqrobat prose-QR evidence

The unsolved checkpoint is supported. The circular conventional control really decodes while failing the strict shape gate. Context-04 corrects visible initials and local paragraph selection, but remains a failed native finder construction with no payload. The body diagnostics identify coupling and placement limits; they do not measure independent capacity or prove impossibility.

This is a read-only review of the sealed evidence, not a resumed research run. The review inspected saved source and JSON, compared hashes and source archives, recomputed saved metric arithmetic and DOM box counts, and viewed two existing native PNGs. No renderer, decoder, locator, binarizer, browser/native capture, new QR construction, or payload experiment ran. Original deadlines and thresholds remain unchanged.

Classifications: **confirmed** means the bounded claim matches saved evidence; **qualified** means the core observation is supported but its scope matters; **corrected** identifies a specific wording error; **unresolved** would require evidence outside this review. Priorities reflect the next research decision, not product severity.

## F1 · QUALIFIED · The circular control is a real, limited false negative of the strict surrogate gate

The unchanged circular-finder conventional PNG recovers https://example.com/ exactly in ZXing and jsQR. OpenCV returns an empty string despite returning corner points. jsQR uses only its normal first scan here: its first location has dimension 25 and the three intended centers exactly. All scored and true-axis ratios pass, yet all three selected quads have balance and nominal span 0.222222, and stable-wide-row fraction 22/36 = 0.611111. Thus these added shape conditions are not necessary for exact recovery of this modified conventional control.

Use the gate as the fixed native research eligibility rule while recognizing its demonstrated limitation. One positive modified conventional control cannot validate native prose, quantify a false-negative rate, establish standards conformance, or justify lowering a threshold.

Evidence:

- `docs/research/prose-qr/astra-2026-10-10/calibration-01/circle/jsqr.json` — result.data; result.binaryData; result.location; options.
- `docs/research/prose-qr/astra-2026-10-10/calibration-01/circle/zxing.json` — results[0].text; results[0].isValid.
- `docs/research/prose-qr/astra-2026-10-10/calibration-01/circle/opencv.json` — text; points; profile.
- `docs/research/prose-qr/astra-2026-10-10/calibration-01/circle/passive-summary.json` — returnedPayload; scans[0].selectedFirstLocation; scans[0].postReturnIntendedGeometry[0]; scans[0].selected.\*.
- `experiments/prose-qr/astra-2026-10-10/calibration.mjs` — 65-87: ordinary finder modules are omitted and replaced by visible concentric circles.

## F2 · QUALIFIED · Context-04 remains far from the fixed conjunction, despite a near-threshold diagonal

The normal first-selected branch returns dimension 81 at unrelated page points. The inverted second scan naturally runs after the normal nonrecovery; its first location returns intended dimension 85, with center errors 0.8371/1.0183/1.1043 px, below source pitch 4.7143 px. In that inverted branch every selected point passes scored ratios and stable rows 12/13, but balance 0.266667 and nominal span 0.282828 fail 0.8. The top-right true diagonal-up RMS is 0.361324723 versus 0.35.

The small diagonal excess is not the only obstacle. Raising 0.35 would leave large span/balance failures and the earlier normal branch mismatch. The inverted branch is an actually executed ordinary branch, not a second location substituted for the first location within a branch; it is also not an independent reader implementation.

Evidence:

- `docs/research/prose-qr/astra-2026-10-10/context-04/continuous-article/passive-summary.json` — scans[0].selectedFirstLocation; scans[0].postReturnIntendedGeometry[0]; scans[1].selectedFirstLocation; scans[1].selected.topRight.geometric.axes.diagonalUp; scans[1].selected.\*.
- `docs/research/prose-qr/astra-2026-10-10/context-04/reader-results.json` — slots: all three native texts empty.
- `experiments/prose-qr/astra-2026-10-10/passive.mjs` — 64-74, 134-172: first location per executed scan and intended-geometry diagnostics.
- `experiments/prose-qr/astra-2026-10-10/common.mjs` — 37-50: fixed conjunction.

## F3 · QUALIFIED · PILL calibration explains an inverted-branch scale mismatch, not a corrected acceptance result

The source resource has H/V complete-run totals 32 and 25 px. Their average pitch is ((32/7)+(25/7))/2 = 4.071428571 px; 430.59375/pitch + 7 = 112.759868421, close to the inverted first-selected reader dimension 113 and its 4.035714286 px pitch. The old counter-only model is 3.666666667 px, while the saved nominal placement pitch is separately 3.649099576 px at intended dimension 125. The normal first-selected branch instead returns dimension 117 at unrelated points.

The complete-run average is a useful explanatory scale estimate for this source, with unequal horizontal and vertical spans. It neither makes intended 125 equal observed 113 nor repairs true diagonals: the inverted selected top-left true RMS is 0.556298. Do not report the source-aligned resource as an ordinary reader return or infer isotropic QR geometry from the average.

Evidence:

- `docs/research/prose-qr/phase-74/run-01/pill/resource-profile.json` — runs.horizontal; runs.vertical; metric; unit; classification.
- `docs/research/prose-qr/phase-74/run-01/pill/recipe.json` — modelUnit; unit; dimension; distance.
- `docs/research/prose-qr/astra-2026-10-10/audit-01/results.json` — rows[id=pill].sourceResource; sourceGeometry; branches[0].first; branches[1].first; branches[1].dimensionComputations[0]; branches[1].selected.topLeft.geometric.
- `experiments/prose-qr/astra-2026-10-10/audit.mjs` — 93-105: source-resource arithmetic kept separate from traced returns.

## F4 · CONFIRMED · The visible-initial and paragraph-selection correction is supported within its local browser contract

Context-03 retains white initials with computed stroke 0 and saved diagnostic counts of zero dark pixels in all three initial rectangles; it is explicitly rejected. Its three completed premature reader calls remain in the denominator. Context-04 asserts stroke 4, records native selections equal to all three intended paragraph strings beginning Once/Our/Often, records Copperplate-Bold plus ArialMT, and has no capture rejection reasons. Saved initial-region counts are 632/631/632. The smallest recorded adjacent body ink gap is 0.69140625 px; row clearance is 10.107421875 px.

This supports a local styled-source selection/preflight correction and preserves the failure history. Range selection is not a clipboard round trip, full-document copy-order test, portable styled/plain paste test, native-app test, phone scan, owner readability acceptance, or physical-print test. Pixel-region counts are supported by sealed receipts; this review did not independently recount image pixels.

Evidence:

- `docs/research/prose-qr/astra-2026-10-10/context-03/REJECTION.md` — 1-7: explicit rejected source and premature-reader history.
- `docs/research/prose-qr/astra-2026-10-10/initial-paint-check.json` — rows[0].probes; rows[1].probes; classification.
- `docs/research/prose-qr/astra-2026-10-10/context-04/continuous-article/capture.json` — dom.paragraphs[*].selection; text; firstGlyph.stroke; minimumGap; rowClearance; fonts; reasons; rejected; repeatExact.
- `experiments/prose-qr/astra-2026-10-10/continuous-v2.mjs` — 65-75, 158-178: Range selection and explicit preflight assertions.

## F5 · QUALIFIED · Two lexical contrasts demonstrate coupled sample changes in a separate body-text diagnostic

The saved contrasts report read-to-scan: 171 touched cells and 86 changed centers; Small-to-Minor: 31 cells and 16 centers. Each contrast offers one binary lexical choice against a shared baseline. These counts are correlated changes under each edit, not independently writable bits. The body-only field is an 85 by 85 diagnostic grid at pitch 33/7, origin (32,32), ArialMT 18/27, paragraph width 400 px, without context-04 body tracking. Context-04 uses 330 px paragraphs, 1 px tracking, and nominal symbol origin (54.0822,130.2746).

The qualitative coupling concern is supported, but the counts cannot be transferred quantitatively into context-04 capacity or controlled QR modules. Only two edits were tested, separately rather than in combination. Small-to-Minor binary change bounds start at y=48 whereas changed gray pixels start at y=64, so the binary effect includes processing sensitivity outside the changed-ink bounds; the receipt does not isolate a unique cause. No payload, locator, reader, target matrix, achievable capacity, or impossibility was tested.

Evidence:

- `docs/research/prose-qr/astra-2026-10-10/coupling-01/results.json` — sourceGrid; comparisons[*].binaryLexicalChoiceBits; changedGrayBounds; changedBinaryBounds; sourceGridTouchedCells; sourceGridCenterChanges; ordinaryReaderSlots.
- `experiments/prose-qr/astra-2026-10-10/coupling.mjs` — 16-25, 57, 156-195, 205-217: finite contrasts, typography and diagnostic sampling.
- `docs/research/prose-qr/astra-2026-10-10/context-04/continuous-article/recipe.json` — bodySize; bodyLeading; bodyTracking; dimension; unit.
- `docs/research/prose-qr/astra-2026-10-10/layout-audit-01/results.json` — nominalSymbolRectangle.

## F6 · QUALIFIED · Nominal field and quiet-ring overlap are valid source diagnostics with limited attribution

Recounting saved DOM rectangles reproduces 527 non-space body glyphs: 226 boxes intersect the nominal symbol, 188 are wholly inside, and 51 touch its quiet ring (6/19/26 by paragraph). The rectangle derived from source center, dimension 85 and pitch 33/7 is (54.0822,130.2746), width/height 400.7143 px. Saved gray-below-128 counts are 10636/160000 = 6.6475% in the symbol and 1286/31844 = 4.03844% in the ring. The ordinary 27 px body line step is 5.72727 source modules.

The current placement wastes much of its prose outside its nominal field and has visible thresholded ink in its proposed quiet ring. Layout rectangles are advance/line boxes, not exact glyph ink masks. The total pixel counts include all visible ink in the region, not only body text. These are source-coordinate measurements; they are not the normal branch dimension-81 geometry, a decoded module density, a proof of quiet-zone conformance failure under every reader, a 50%-density acceptance test, or a capacity/impossibility bound. The stored pixel counts were hashed and their fractions checked, not recounted from PNGs.

Evidence:

- `docs/research/prose-qr/astra-2026-10-10/layout-audit-01/results.json` — sourceGeometry; nominalSymbolRectangle; nominalQuietOuterRectangle; paragraphs; visibleBodyGlyphs; symbolSourcePixelAccounting; quietRingSourcePixelAccounting.
- `docs/research/prose-qr/astra-2026-10-10/context-04/continuous-article/capture.json` — geometry; dom.paragraphs[*].glyphs[*].rect; glyphs[*].font.
- `experiments/prose-qr/astra-2026-10-10/layout-audit.py` — 11-28: nominal source rectangle, box tests and all-ink gray threshold.

## F7 · CORRECTED · The report prose understates the scored-record quantifier; saved outcomes are unaffected

index.html calls the scored condition at least one record with all four axes passing. The executed common.mjs source requires a nonempty record set and every matching scored record to pass. The archived common.mjs SHA-256 is 909ec0106e2e80d406f7dca353d9e1ae730d1877a29c8a5b0fa0fee9a97ecae8. In all 22 primary and 9 audit branches, each selected point has exactly one matching record, so either wording gives the same saved verdict.

Future preregistration should state the executable every-record condition explicitly or obtain an owner-selected policy change. This is a documentary correction in this review, not a silent change to the sealed report, thresholds, or historical results. No observed pass was manufactured or erased by this discrepancy.

Evidence:

- `docs/research/prose-qr/astra-2026-10-10/index.html` — 1783-1792: at least one scored record wording.
- `experiments/prose-qr/astra-2026-10-10/common.mjs` — 37-50: records.length > 0 and records.every.
- `docs/research/prose-qr/astra-2026-10-10/source-archive.json` — entries[path=experiments/prose-qr/astra-2026-10-10/common.mjs].snapshot; sha256.
- `docs/research/prose-qr/astra-2026-10-10/audit-01/results.json` — rows[*].branches[*].selected.\*.records.
- `docs/research/prose-qr/astra-2026-10-10/verification-final.json` — primaryBranches; counts.primaryStockBranches; counts.auditStockBranches.

## F8 · CONFIRMED · Denominators and sealed custody support an incomplete checkpoint

Primary reader ledgers reconcile to 39 completed slots: context-01 18, calibration-01 6, context-02 9, context-03 3, context-04 3. They contain 21 native-structure slots, including 3 unsuitable invisible-initial slots, and 18 conventional slots with 15 exact recoveries. Five saved-source jsQR audit slots remain separate. The run has 10 native captures and 10 immediate-repeat receipts, 14 small resource captures, 2 fresh conventional controls with 2 repeats, and zero native payload proposals or strict native passes. This review matched all 535 custody inventory entries, 231 archived entries covering 214 distinct snapshots, all 28 source aliases, and all three download hashes.

Repeated captures, passive branches, audits and engine profiles do not add independent reader implementations or payload trials. Negative finder-only observations are not failed encoded native payload trials. The seal is an incomplete scientific checkpoint; unused time and caps establish neither success nor impossibility. The historical backup receipt records an earlier local/remote HEAD, not a live verification of the present remote or PR.

Evidence:

- `docs/research/prose-qr/astra-2026-10-10/verification-final.json` — counts; slots; limits.
- `docs/research/prose-qr/astra-2026-10-10/custody.json` — inventory; inventoryEntries; excludedFromInventory.
- `docs/research/prose-qr/astra-2026-10-10/source-archive.json` — entries; aliases.
- `docs/research/prose-qr/astra-2026-10-10/backup-verification-final.json` — head; remoteHead; pr; downloads; newRunInventoryVerified.
- `docs/research/prose-qr/astra-2026-10-10/CLOSURE.json` — scientificStatus; executionStatus; elapsedMinutesAtSeal; counts.

## Evidence checks and boundaries

The first-location and selected records in all 13 primary passive full receipts match their summaries. Recomputed 744 normalized-axis RMS values in 186 scored/geometric metric sets across 31 primary/audit branches agree within 1e-12. All 22 primary fixed gate conjunctions agree with saved verdicts; the one-versus-every record wording has no observed effect because all selected record sets are singletons. The saved DOM recount reproduces per-paragraph body counts (174,174,168,6), (177,26,20,19), (176,26,0,26), in the order total/intersects/inside/quiet-ring.

Native render, image, matrix-decoder, styled selection, plain-text paste, native-app paste, phone, and physical-print evidence remain separate. The two viewed PNGs support only local visual inspection. The review did not recount thresholded PNG pixels, rerun passive instrumentation, independently validate external runtime binaries, test whole-document selection or clipboard success, consult memory or external web sources, or claim owner acceptance. No product code changed. Product tests/build/browser/text-browser and optional installed-extension/native-text checks were not run because this review forbids experimental execution; they are untested here, not declared unavailable.

The saved backup receipt predates baseline HEAD eede84866744d49d38e69d88210058d3af20c9ba. Local cwd, branch, HEAD, remote URL and dirty state match the review request. No live PR or remote-HEAD query was made; the last saved PR state is OPEN/draft and no Git or PR mutation occurred.

## One proposed owner decision — D1, not executed

Authorize one 25-minute fixed conventional-control panel to characterize the curved-finder gate rejection before selecting further native construction work.

Test whether the circular-control disagreement is isolated to full circular curvature or persists at preregistered intermediate curvature. It calibrates interpretation; it does not change native eligibility.

Use fresh output directories and the pinned encoder. Freeze the same exact https://example.com/ payload, version 2, ECC M, mask 0, no boost, 12 px pitch and four-module quiet zone. Preregister four visible finder treatments: square, concentric rounded squares at curvature fractions 1/3 and 2/3, and full circles. Define fraction as each nested square corner radius divided by that square half-side. Keep all non-finder modules identical and remove replaced finder modules; no hidden square modules beneath the curves. Capture each source once with one immediate repeat, then one unchanged-input default call per OpenCV, ZXing and jsQR implementation. Record every actual branch and the fixed every-record gate.

Budget: **25 minutes, 4 conventional sources, 1 immediate repeat each, at most 12 ordinary reader slots, 4 MB. Zero new native prose/payload/phone work.**

Success gates:

- All four sources and immediate repeats match exactly; source/payload/encoder hashes and visible shapes are preserved.
- The square baseline recovers the exact payload in all three implementations, and the circular endpoint reproduces exact recovery in ZXing and jsQR; otherwise stop and mark comparability unresolved.
- A complete 12-slot ledger plus first-location gate measurements identifies agreements and disagreements without second-location substitution, altered inputs, threshold tuning or retries. A complete negative intermediate panel is still informative.

Rejection/stop gates:

- Stop by 25 minutes or the fixed render/reader/byte cap, whichever comes first; preserve incomplete and failed rows.
- Reject any source with repeat mismatch, wrong payload, hidden modules, source mismatch, passive/stock return mismatch or an invalid baseline; do not repair and selectively rerun.
- Do not infer a native payload candidate, change 0.8/0.35 thresholds, launch native/payload/phone work or generalize rates from the finite panel. Any later scope or eligibility revision needs a separate owner decision.

The panel would characterize a measurement limitation while keeping the native gate fixed. It cannot itself select a successful native architecture. Ryan has not selected or authorized this proposal through this review.

## Copyable continuation prompt

Copying this prompt is an owner selection step; the reviewer has not dispatched it.

```text
I select D1 from the Sol review: a new, separately bounded 25-minute conventional-control gate-characterization panel, with four preregistered visible finder treatments (square, concentric rounded squares at curvature fractions 1/3 and 2/3, circles), at most four conventional captures plus one immediate repeat each, twelve default ordinary reader slots, and 4 MB of new artifacts. Read AGENTS.md, docs/PROJECT-HANDOFF.md, and docs/research/prose-qr/sol-review-2026-10-10/REVIEW.md first. Continue the existing branch and draft PR; use fresh output directories and preserve every sealed source and failed row. Use the exact https://example.com/ payload, pinned encoder, version 2, ECC M, mask 0, no boost, 12 px pitch and four-module quiet zone. Define each nested shape corner radius as its curvature fraction times its half-side, keeping all other modules fixed and removing replaced finder modules; never hide square modules behind artwork. Preregister and retain all four sources before capture. Apply the existing every-record strict conjunction without changing thresholds; preserve first locations within every actually executed branch. The square must recover exactly in all three readers and the circle must recover exactly in ZXing and jsQR for comparison to proceed. Stop on comparability, source, repeat or parity failure; preserve evidence, do not tune or selectively retry. Record all slots and finish within the new 25-minute cap. No native prose source, native payload experiment, phone test, extra agent/chat, threshold revision, publication, merge, or reopening of the old Astra clock is authorized. Hand back a complete comparison and a proposal only for any subsequent work.
```

## Orchestration observations, separate from science

Requested settings are GPT-6.1 Sol / High, fresh context. This reviewer has no independent tool metadata confirming model, effort, desktop Fast, pricing, usage, or speed. First clock observation was 2026-10-10 18:41:32 UTC, after initial instruction reads. The parent owns dispatch/wait/reconciliation evidence. This subagent created no agent/chat and sent no message to people or other chats; its normal final response is the automatic handback. Final action/scope checks and observed finish are in reviewer-receipt.json.

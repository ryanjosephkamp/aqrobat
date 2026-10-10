# Phase 27 — native row and advance pitch alignment

Exactly two native finder-only proposals: regular uniform-black Monaco 14 px/14 px,
zero tracking, whole light words (no isolated i), existing phase 17 word-bank and
source DP objective. Module pitches 140 and 168 px, common dx=dy=0. These pitches
are respectively ten and twelve native lines per module; 168 also approximates
twenty Monaco advances. Hypothesis: integer row periods reduce source boundary
phase errors without smaller or overlapping letters. No font-size compression,
pixel repair, hidden graphics, forced extraction or reader tuning.

Three seven-module native text fields. Actual source width, native row clearance

> = 2 px and neighboring ink overlap gate remain mandatory. One immediate repeat
> per completed source, all outcomes/rejections/errors retained. Ordinary jsQR and
> ZXing profiles unchanged; diagnostic error-reporting separate. Geometry used only
> source rendering and post-return. Require 147/147 sampled finder cells, twelve
> exact H/V/true-diagonal sequences, nominal corners/dimension and native letter
> observation before any single payload confirmation. This is not a full-QR sweep.

Fresh proposal-01, run-01 and run-02 only. Cap 8,000,000 logical bytes including
source, capture reserve 6,000,000. Stop after two cases, do not reuse output dirs.
No payload/phone claim from partial geometry.

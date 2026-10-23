# Research lane: readable prose QR

This file is context and a proposed direction, not an active experimental plan.
Read the common handover and AGENTS.md first.

## Current achievement

The exact accepted narrow source is:

- [Generated copy-source DOCX](../../research/prose-qr/paste-prose-2026-10-11/word-08/input.docx)
- [Actual pasted Word recipient](../../research/prose-qr/paste-prose-2026-10-11/word-09/word-09.docx)
- [Native Word PDF](../../research/prose-qr/paste-prose-2026-10-11/word-09/word-09.pdf)
- [Unchanged native page PNG](../../research/prose-qr/paste-prose-2026-10-11/word-09/pdf-96/native.png)
- [Raw source TXT](../../research/prose-qr/paste-prose-2026-10-11/word-09/source.txt)
- [Owner acceptance receipt](../../research/prose-qr/paste-prose-2026-10-11/OWNER-NATIVE-PASTE-ACCEPTANCE.json)

It preserves one complete 1,114-word passage, mixed case, punctuation and accents,
through actual Word-to-Word copy/paste. The 6.25-inch fixed table, 8pt Impact,
9pt line spacing and 50 rows remain on one Letter page. Type this small is dense;
it is not ordinary comfortable 11–12pt body text.

Vision returned exactly https://example.com/ from the native page image. The
other three primary software readers failed. Ryan's two Samsung apps read both
asked-about surfaces very easily. These evidence lanes stay separate.

## Timeline and required source reading

| Stage                      | What it establishes                                                                                     | Source                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Early band-023             | Styled story under historical configured ZXing; not ordinary-reader or plaintext portability            | [Phase-02 evidence](../../research/prose-qr/phase-02/batch-02/raw/band-023-2233.png)                   |
| Phase 14                   | Ordinary ZXing recovery from native repetitive regular text, not natural prose                          | [Raw receipt](../../research/prose-qr/phase-14/run-01/native-zxing-default.json)                       |
| Integrated October 10      | Later failed integrated trials and a closed incomplete checkpoint                                       | [Closure](../../research/prose-qr/integrated-2026-10-10/CLOSURE.json)                                  |
| Large styled story         | All-letter prose exact URL recovery in ordinary ZXing and Vision, with very large dimensions/repetition | [Guide](../../research/prose-qr/styled-story-2026-10-11/README.md)                                     |
| Smaller fonts/case/color   | Named smaller mixed-case and Avenir examples accepted; contrast boundaries are recipe-specific          | [Latest acceptance supplement](../../research/prose-qr/portable-story-2026-10-11/ACCEPTANCE-UPDATE.md) |
| Page and native Word paste | Complete nonrepeating source, actual recipient preservation and Samsung reports                         | [Final handoff](../../research/prose-qr/paste-prose-2026-10-11/HANDOFF.md)                             |

The large story's original phone report distinguished PNG success in Camera from
HTML success in Scan QR after zooming out and moving about three feet away.
Smaller examples later worked in both apps. Do not transfer one surface's pass
to another export or omit recorded failures.

## Tool and code map

- [Current offline page studio](../../research/prose-qr/paste-prose-2026-10-11/page-studio.html)
- [Visual evidence guide](../../research/prose-qr/paste-prose-2026-10-11/index.html)
- [Complete final-run ledger](../../research/prose-qr/paste-prose-2026-10-11/LEDGER.json)
- [Frozen artifact hashes](../../research/prose-qr/paste-prose-2026-10-11/MANIFEST.json)
- [Current research sources](../../../experiments/prose-qr/paste-prose-2026-10-11/)

Within that source directory: page-fit.mjs chooses geometric fit; page-app.mjs
handles form/exports; docx.mjs creates editable OOXML; compact.mjs groups styles.
The portable-story generator.mjs supplies measurement and source-preserving
composition. src/core.mjs supplies the pinned encoder wrapper.

The studio preserves words, case, punctuation and order. It retains raw source
whitespace in TXT/recipes while wrapping the display. Short-source repetition is
explicit and complete-copy only. It rejects insufficient fill, overflow,
unavailable fonts and unsupported characters. Current support is Latin letters,
digits, punctuation and whitespace, with a 50,000-byte source bound; some common
symbols and combining accents are rejected. The underlying product payload bound
is 1,024 UTF-8 bytes, but page geometry can reject much shorter payloads.

Automatic fit is not automatic scan verification. The delivered tool does not
search layouts using decoder feedback, has no one-click prose PNG export, and
does not supply polished action-specific payload builders. The actual browser
Copy-to-Word path was only mocked in controls. The downloaded Word-file route
has real native copy/paste evidence.

## Recommended next selected scope

Make supported mixed-case prose and user-selected payloads work automatically
over a declared corpus, with exact outputs, honest verification and useful failure
reporting. Improve reliability before spending the whole run on more font variants.

Proposed priorities:

1. Freeze varied independent passages and realistic destinations, reserve unseen
   evaluation cases, and define supported input length/characters and page size.
2. Build a bounded search across justified formatting choices. Keep exact prose
   and payload; never silently rewrite, shorten or add hidden solid modules.
3. Verify the actual unchanged rendered output. Preserve the existing strict
   software promotion rule unless Ryan explicitly selects a separate acceptance
   target. Do not label Vision-only or Samsung-only evidence as a general pass.
4. Export PNG, editable Word and selectable styled text from the same chosen
   layout. Test exact source fidelity and the actual receiving output.
5. Reduce DOCX/HTML overhead and broaden ordinary-symbol support where earned.
   Treat other scripts, new fonts, reduced contrast, Docs and print as explicit
   coverage extensions, not free consequences of current success.

A maximum up to six hours is a possible future allowance, not an active timer.
Reserve roughly the final hour for validation, the report, preservation and backup.
Define finite case/capture/reader/byte caps before experiments; time is not the
only bound. No universal success or publication result is promised.

## Documentation needed for eventual writing

For every run retain the hypothesis, prior-art sources, exact source and payload,
parameters, code/dependency/font versions, dimensions/DPI, immediate repeat,
unchanged reader input hash, raw stdout/stderr and every result. Keep configured
readers, ordinary readers, processed-image diagnostics, source selection, actual
paste, owner phone testimony and physical print in distinct tables.

Publish all planned cases, failures, stops, rejections and unattempted slots.
Separate development cases from held-out evaluation. Record device/app, surface,
zoom, distance, exact displayed payload and attempt counts when available.
Do not turn missing evidence into zero or infer a success rate from selected
variants. A negative finite corpus does not prove impossibility.

Deliver a readable local report, machine-readable case ledger, reproducible
generator, native editable examples, explicit limitations and handoff at every
checkpoint. Publication venue, novelty and release claims need a later decision
and an appropriate literature review.

## Ownership and safety

Use new dated run directories. Never rerun sealed scripts into old outputs.
Research may read the product core but should keep experimental changes in its
own lab source/output paths. Proposed shared-core changes become an integration
item; do not change the extension lane's checkout or silently update its inputs.
Read COORDINATION.md before any concurrent execution.

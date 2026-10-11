# Aqrobat 0.4.1 browser insertion review

October 7, 2026. Resumed from `0b43494`. Repository/origin/branch and clean
checkpoint matched GitHub; existing PR #1 was open, draft, and based on main.
Its checks and configured Pages deployment passed. The 0.4.0 live generator,
app module, extension ZIP, practice file, and package metadata matched local bytes.
[Detailed receipts](validation.json) retain all positive and negative outcomes.
Previous validation versions remain archived.

## Current checks

- `npm test`: 18 tests passed. No runtime dependencies were added.
- `npm run build`: final 0.4.1 offline files and extension ZIP built successfully.
- `npm run test:browser` and `npm run test:text-browser`: image/character grids,
  text exports, full plain-text box dimensions, safe custom filenames, recipe and
  observation imports, HTML/plain clipboard, actual rich-editor paste, themes,
  reload guard, mobile layout, and single-page print-PDF fixtures passed.
- `npm run test:insertion`: four palettes preserve drafts, actual text/spacing,
  328 px rich layout, and native Undo in browser fixtures. Existing rejection
  cases passed. New regressions cover stale panel reopening, font-feature changes,
  an insertion event moving focus to another draft or making the field read-only,
  and mismatched cursor typography. Drafts remain untouched on refusal.
- `npm run test:extension`: final download ZIP CRC and critical bytes match the
  reviewed source/build. The ZIP itself was extracted and installed in a fresh
  Chrome for Testing 151 profile. Local recipes, exact mixed palette/payload,
  popup selection, appearance and icon API changes, formatted clipboard, and
  full-restart persistence passed. Both task-owned profile and unpack directory
  were removed. The owner's installed copy was untouched.
- The local Gmail HTML guide passed synthetic recipe download, initially untested
  fields, JSON recording/import/export, atomic invalid-import refusal, 390 px layout,
  embedded practice preview, and no page errors/external requests. These checks
  are not Gmail observations.
- `npm run format:check` and Git whitespace checks passed before this push.

The encoder, canvas renderer, and text/RTF source are unchanged from 0.4.0.
All **11 image raster hashes match** the checkpoint. RTF was not rerun natively
in this phase; the owner's earlier successful RTF review remains historical evidence.

## Scan evidence and limitations

jsQR 1.4.0 recovered **1/4** actual rich inserted fixture payloads (black circle),
and **0/4** measured plain preview payloads. The inserted textarea contains that
same measured string; the screenshot probe is the preview, not the textarea.
Existing image **0/11** and ordinary text-row **0/4** negatives remain recorded.
These results describe the documented font/size scenarios and do not establish
Gmail, phone, or physical-print reliability.

The original native Chrome toolbar pilot covers the earlier 0.4.0 hash workflow
and its recorded source SHA. It was not rerun for 0.4.1 and does not establish
Gmail compatibility. No owner browser profile, mailbox, actual recipient output,
new phone scan, or physical print was inspected in this phase.

**Owner acceptance remains open.** Follow the [Gmail review](gmail-review.md).
Keep PR #1 draft, npm private/unpublished, and the project move and emoji atlas
deferred. Original pause checkpoint, migration handoff, prototypes, other
repositories, private PDF archive, and owner samples remain preserved.

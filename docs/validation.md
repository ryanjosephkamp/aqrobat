# Aqrobat 0.4.2 usability and planning checkpoint

October 8, 2026. Started from clean `a76fc298bad9c2849ea5eb2101bda52974a6fb37`
on `codex/aqrobat-foundation`; origin and existing draft PR #1 matched. This phase
moves **Save for insertion** under the QR preview, labels the toolbar as
**Make → Save → Insert**, and supplies a one-code Gmail guide and planning handoff.
Insertion logic, QR generation, and permissions are unchanged.
[Detailed receipts](validation.json) keep positive and negative outcomes.
0.4.1 evidence is now archived in `validation-0.4.1.md/.json`; earlier archives remain.

## Verification

- `npm test`: **18/18 passed**. Package remains `private: true`; runtime dependencies unchanged.
- `npm run build`: rebuilt 0.4.2 offline generator, insertion practice, and extension ZIP.
- `npm run test:browser` and `npm run test:text-browser`: source/offline UI,
  image and text grids, exports, full text-box geometry, custom filenames,
  clipboard/rich paste fixtures, recipe/result import, themes, reload guard,
  mobile layout, and print-PDF fixtures passed. No physical print test.
- `npm run test:insertion`: four palettes retain original draft content and Undo
  in plain/rich Chrome fixtures. Existing safety regressions and refusals passed.
  Rich layouts remain 328 px with real text, no embedded image.
- `npm run test:extension`: the actual download ZIP was CRC/source-checked,
  extracted, and installed in a fresh Chrome for Testing 151 profile. Relocated
  save controls work; exact payload/palette, popup selection, appearance/icon API,
  clipboard, and full-restart persistence passed. The critical-byte comparisons
  now also cover the changed workbench/app and popup files. Test-owned profile
  and unpack directory were removed; the owner’s installed copy was untouched.
- The new HTML handoff passed one-off synthetic checks for 390 px layout,
  initially untested fields, UTF-8 feedback download, bounded prompt selection,
  no page errors, and no external requests. Its Gmail steps were also visually
  checked at mobile width. Synthetic notes are not owner observations.
- `npm run format:check` and Git whitespace checks passed before this push.

**All 11 image raster hashes match 0.4.1.** Core, renderer, text/RTF, spacing,
library, and vendored encoder sources match that checkpoint. Extension manifest
is unchanged apart from the version. Original pause/migration handoff files match.

## Scan evidence and remaining acceptance

Current jsQR 1.4.0 probes recover **1/4 actual rich inserted fixture payloads**
(black circle), **0/4 measured plain previews**, **0/11 image artwork samples**,
and **0/4 ordinary text-row probes**. The measured preview contains the same text
inserted in the textarea, but is not a screenshot of that textarea. The recipes,
fonts, dimensions, decoder and negative outcomes remain in the receipts. These
counts do not establish Gmail or phone compatibility.

The native real-toolbar pilot remains historical **0.4.0** evidence with its
recorded source SHA, not a 0.4.2 native test. No native TextEdit/RTF rerun, owner
profile inspection, actual Gmail/mailbox, received email, new Samsung scan,
or physical print was performed. Prior positive RTF/phone observations remain
historical rather than assigned to new recipes.

Follow the [short Gmail guide](gmail-review.md). Copyable text acceptance remains
open. The [prose pilot](prose-qr-plan.md) is a proposal only: no candidates,
measurement run, or ZXing installation was performed. Emoji atlas, project move,
release, and ChatGPT Site creation remain unselected. No new agents or chats.
The existing public Pages preview still follows the draft branch; pushing this
checkpoint updates that existing preview. No new hosting surface was created.

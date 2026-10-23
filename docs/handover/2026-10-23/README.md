# Aqrobat: current state and two-session handover

Prepared October 23, 2026 for Ryan. This is an orientation and recommendation
package. It records selected direction without starting either workstream.

## Product vision to align on

Recommended vision: Aqrobat is a local tool for making, placing and exporting QR
artwork made from real, copyable characters. Users can inspect the destination,
preserve their words, and see what has actually been verified. The extension is
the convenient way to use it in a browser. Prose QR is a research-backed feature
that can join the product once its supported range is defensible.

The shared value is editable human-readable content plus QR behavior. File-size
savings over conventional QR images are not presently demonstrated. Do not promise
that any text, any font, any editor or every phone will work.

Keep generation local and deterministic, with no runtime AI, server or account
requirement. The existing JavaScript core, static web UI, CLI and Manifest V3
extension are a useful starting point. No rewrite is currently justified.
Targeted libraries or architectural changes can be proposed when they solve a
measured problem; this handover does not freeze the stack.

## Decisions and recommendations

| Item                                                          | Status                                                                                         |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Two future sessions, research and extension                   | Ryan's intended workflow; neither was created here                                             |
| Extension first finish line                                   | Ryan selected reliable styled-text insertion into Gmail and similar editors                    |
| Research direction                                            | Recommend broader prose/payload reliability, bounded automatic search and verified exports     |
| Separate worktrees, branches and lane draft PRs               | Recommended; not created or selected by this package                                           |
| Hourly Goal-run checkpoints                                   | Ryan requested approximately hourly repository backups; include them in the selected run scope |
| Goal duration                                                 | Not started; discuss a maximum up to six hours in the new research session                     |
| Further fonts, lower contrast, emoji atlas, store/npm release | Later choices; not automatic prerequisites                                                     |
| Integration and merging                                       | Separate owner decision; existing PR #1 remains draft                                          |

## What is implemented

| Workstream            | Saved state                                                                                                                                                                                              | Remaining acceptance                                                                                          |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Product and extension | Version 0.4.2, shared deterministic core, web/offline generator, CLI, image/TXT/HTML/RTF/recipe exports, comparison grids, palettes/themes, explicit local saved recipes, user-invoked browser insertion | Real Gmail/editor draft behavior, exact output scans, Undo and saved/received layout                          |
| Prose research        | Offline page studio, source-preserving mixed-case layout, editable DOCX and selectable HTML/TXT/recipe exports, actual Word paste evidence and phone acceptance                                          | Reliable new prose and payloads, automatic scan verification, one-click prose PNG, broader recipients/devices |

The extension is not empty scaffolding. Its current shortest journey is
Make → Save → Insert. The prose studio is a separate research artifact and is
not integrated into the shipped extension.

## Findings that change the next step

1. Real letters can carry a scannable pattern without hidden solid QR modules.
   The large all-letter story recovered its exact URL in ordinary ZXing and
   Apple Vision. It was far too large for ordinary page use.
2. Mixed case and page-sized text can work. All caps is unnecessary. Earlier
   accepted Avenir examples also show weight contrast or regular lighter type,
   but these are named examples, not universal font/contrast rules.
3. The strongest portable example is one complete 1,114-word mixed-case passage,
   8pt Impact, 50 rows, gray 0/180, 9pt leading, in a 6.25-inch borderless table on
   Letter paper. Actual Word-to-Word paste preserved the words, visible letter
   colors, width and one-page layout. The saved recipient reopened correctly.
4. Ryan reported both native Samsung Camera and Samsung Scan QR code on a Galaxy
   S25 Ultra read its PDF and PNG "extremely easily," the easiest pair so far.
   The exact phone-displayed payload and attempt denominator were not supplied.
5. Automatic generality remains open. In the final page/paste run, Vision read
   21 of 51 candidate images; ZXing, jsQR and OpenCV each read zero. These are
   outcomes across variants, not an arbitrary-text success probability. The
   stricter two-independent-reader promotion gate was not met by page-sized cases.
6. Font metrics, ink coverage, whitespace, payload complexity and the actual
   recipient all matter. A4-to-A4 copying preserved layout but did not produce
   recovery in the tested primary readers. "Fits" cannot be presented as "scans."
7. Conventional QR is currently smaller. For the same URL, an existing
   conventional PNG is 3,344 bytes; accepted styled Word is 34,420 bytes; the
   prose page PNG is 283,532 bytes. Plain prose TXT is about 6.7 KB but loses
   QR-carrying styling. Current generator DOCX and HTML have avoidable overhead.

## Evidence and freshness

The pre-handover source and remote branch both matched
ce1399bb3b21acec5cbb99c2ae1727c9e8d27d80. Local and remote main matched
e41943aff7780107a33a60a21494a41276b92c58. PR #1 was OPEN/draft.

This refresh reread source and receipts and verified all 1,747 files in the last
research seal, plus all 14,618 files in its earlier preservation baseline. There
were zero mismatches. No runtime feature test, QR generation, decoder call,
native-app experiment or new phone test was performed for this handover.

Recorded extension tests are dated October 8, not freshly rerun acceptance.
October 11 product tests ran in a disposable copy. Current GitHub checks at the
saved head show npm test passed and format:check failed. This is an existing
formatting problem involving retained historical/raw evidence; the draft is not
CI-green or release-ready. Do not reformat frozen evidence to hide the failure.
A future selected product scope should separate code formatting from immutable
evidence in a reviewed policy change.

The root project handoff and some October 8 documents predate the later research.
Keep them as historical records and use the later acceptance supplements.

## Read next

- [Research state and recommended scope](RESEARCH.md)
- [Extension state and selected direction](EXTENSION.md)
- [Concurrent-work and resource proposal](COORDINATION.md)
- [Research alignment package](../../prompts/2026-10-23-research-alignment.md)
- [Extension alignment package](../../prompts/2026-10-23-extension-alignment.md)
- [Visual handover](index.html)
- [Fresh verification snapshot](snapshot.json)
- [Preservation verification](integrity.json)
- [Backup receipt](BACKUP-RECEIPT.json)

The snapshot/receipt record the exact Git anchor and verification times. Never
reset to a hash merely because an older document names it.

## Owner alignment still needed

Research: agree the supported prose/character and payload range, verification
bar, output priorities, maximum duration and finite resource/capture budget.

Extension: the first journey is selected; agree the first real editor scenario,
what owner-assisted Gmail access is available, and the acceptance checklist.
Draft-only testing can proceed without sending anything once separately selected.

Both: approve the worktree/branch arrangement and checkpoint policy before
concurrent implementation. No new chats, agents, branches, worktrees, Goal run,
automation, release, merge, Site operation or audience change was started here.

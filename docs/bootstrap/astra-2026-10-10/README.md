# Start Aqrobat in its own Codex project

October 10, 2026. This handoff prepares the project switch Ryan explicitly
requested. No new project/chat, research experiment, timer, or automation has
been started by this package.

## Recommendation and exact setup

A fresh project/chat is appropriate now: the work has its own repository and
saved evidence, and this separates it from the old Splashery conversation.
Use the existing folder; no copying or cloning is needed.

1. In Codex, add/open the existing local folder
   **`/Users/noir/Documents/aqrobat`** as a project. Name it **Aqrobat**.
   Select that folder itself, not its `docs` directory or the Splashery worktree.
   The project inventory had no entry for this folder when checked; if you have
   since added it, use that entry instead of adding a duplicate.
2. Create a fresh chat in that project, using the **local checkout**. If offered
   a worktree or cloud environment, keep this run local in the existing folder.
3. Select **GPT-6 Astra** and **Xhigh** effort. This is my recommendation for the
   difficult experimental design and diagnosis in this phase. High is a
   reasonable alternative, but there is no measured model/effort comparison
   here and no reason to lower your existing preference for this run.
4. Paste [START-PROMPT.txt](START-PROMPT.txt), or copy it from
   [the HTML setup guide](index.html), and send it. It points Astra to the full
   [RUN-PROMPT.md](RUN-PROMPT.md), which is saved in the repository.
5. Let that new chat own the run. Keep this old chat as history; it need not be
   deleted or archived. Do not start the same run in both chats. No other task
   or job needs to be stopped.

The maximum three-hour clock starts when Astra begins the new execution turn.
It includes intake and the final verification/backup. Experiments stop starting
by minute 160, leaving 20 minutes to close safely. The run may end earlier for
an independently decoded, readable candidate or a concrete safe-stop reason.
A connection loss can interrupt an interactive run; milestone checkpoints make
recovery possible but do not guarantee uninterrupted operation.

The full prompt authorizes continuing between small justified phases without
asking after each failure. It does not authorize agents, extra chats, goal mode,
automations, product edits, publication, or an experiment beyond its limits.

## What the new chat should understand first

This is a deterministic, native-text QR project. Ordinary character-based QR
art and its exports are a product lane. The current research asks whether
readable paragraphs can themselves be scanned as QR codes by ordinary readers.
The desired output must contain visible native letters and preserve the exact
encoded message. It must not hide a conventional code behind the letters.

The current prose goal is unsolved. Session D's outlined Latin PILL control
improves central spans but still fails diagonal and dimension gates. The
current sources are not payloads and should not be handed to Ryan as successful
phone candidates. Earlier bold/styled prose, uniform-black ASCII, and logographic
controls remain separate techniques with separate evidence. Prior phone failures
from both Samsung scanners remain negative observations; there are no new phone
results to reinterpret.

Prioritize source-scale diagnosis, a genuinely different native letter topology,
and a readable paragraph construction with compatible finder/data scales.
The original [40 ideas](../../research/prose-qr/sol-three-hour-plan-2026-10-10/IDEAS.md)
remain a menu. Do not spend the run on another blind font/size/weight sweep.
Read the full execution prompt for fixed gates, proposal counts, and file caps.

## Read map

- Root `AGENTS.md` and the refreshed `docs/PROJECT-HANDOFF.md`: project boundaries.
- This `RUN-PROMPT.md`: current owner-authorized Astra execution, deadlines,
  caps, stop conditions, backups, and deliverables.
- `docs/research/prose-qr/session-2026-10-10-d/`: latest checkpoint, README,
  analysis, verification, custody, harness notes, and report.
- `docs/research/prose-qr/phase-70/` through `phase-74/`: latest plans and evidence.
- `experiments/prose-qr/`: retained experiment sources, with old executed versions
  linked from receipts. Never execute an old sealed run into its old directory.
- `docs/research/prose-qr/sol-three-hour-plan-2026-10-10/IDEAS.md`: hypotheses and
  priorities. Its Sol model and old-chat recommendations are now historical.
- `docs/browser-insertion.md`, `docs/text-portability.md`, and `docs/validation.md`:
  preserved product behavior and outstanding manual acceptance, outside this run.

## Workspace and available local tools

The checkout is already `/Users/noir/Documents/aqrobat`, on
`codex/aqrobat-foundation`, with origin
`https://github.com/ryanjosephkamp/aqrobat.git`. Existing PR #1 is OPEN and draft.
The research baseline is `227eaff`; the subsequent planning baseline is
`bacae8e`. This bootstrap follows those commits. Verify live state rather than
resetting or pulling another branch over it.

Package 0.4.2 is private/unpublished. Current local tool checks found Node
26.10.0, Python 3.12.1, OpenCV 4.13.0, NumPy 2.4.4, and Pillow 12.0.0. The
existing package manifest pins jsQR 1.4.0, zxing-wasm 3.1.5, and Playwright
1.56.1. These are availability/version observations, not new scan results.
Use the installed tools and the local Chrome executable used by saved harnesses;
verify runtime paths in the new chat before use. Dependencies, fonts, and
browser binaries are local environment prerequisites, not files newly backed
up to GitHub. No installation is required for this same-machine handoff.

## Backup and preservation

Before the handoff edits, local HEAD and the live remote both matched
`bacae8e51a34daadee79e7a1e7a1067e0b97f69d`, with a clean checkout and OPEN draft
PR #1. The new [backup verification](backup-verification-02.json) checked:

- 57 saved custody receipts;
- 6,473 inventory entries representing 6,057 unique saved evidence paths;
- 1,699 current source references, plus retained historical source snapshots;
- Git tracking of all checked receipts, evidence, matching sources, and downloads;
- all three product-download hashes, unchanged; npm still private.

That is a read-only check of saved bytes, not a rerun of the original experiments
or a new phone/native scan. It does not claim a new backup of external prototypes,
other repositories, owner browser profiles, or ignored dependencies. Those remain
untouched. The GitHub backup covers the tracked Aqrobat work; this package is
committed and pushed on the same branch before handback. Verify the final live
head in the handback/new chat because a file cannot contain its own commit hash.

The first new verification attempt encountered a checker assertion because a
saved source path was absolute while Git's tracked-path list was relative. Its
source and [error receipt](verification-attempt-01.json) are retained. The
separate corrected `verify-backup-v2.py` normalizes the path and completes the
checks. This was a checker error, not an observed missing evidence file.

The previous `docs/PROJECT-HANDOFF.md` is saved exactly as
`PROJECT-HANDOFF.previous.md`. Sealed phases and the original Sol planning
package remain unchanged. The only updated existing document is the current
project handoff; the rest of this package is additive documentation and checks.

## What stays deferred

Gmail/manual extension review, portable plain-text paste acceptance, physical
printing, broader phone testing, emoji atlas, product integration, merging,
release/npm/store publication, and any external repository work are not part
of this three-hour research run. Do not restart them merely because they appear
in an older product handoff.

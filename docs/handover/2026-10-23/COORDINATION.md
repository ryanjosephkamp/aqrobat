# Two sessions without shared-checkout collisions

This is a recommended operating arrangement for Ryan to approve during alignment.
No worktree, branch, draft PR, lock service or automation has been created here.

## Isolation

Two sessions can read the current checkout. They must not concurrently implement
in the same checkout: one working directory, index and current branch would be
shared even if they promise to edit different files.

Recommended after scope selection:

| Lane              | Proposed branch                | Checkout                           | Draft PR base            |
| ----------------- | ------------------------------ | ---------------------------------- | ------------------------ |
| Prose research    | codex/prose-qr-next            | One dedicated managed Git worktree | codex/aqrobat-foundation |
| Browser extension | codex/extension-insertion-next | A different managed Git worktree   | codex/aqrobat-foundation |

These names are proposals, not selected Git state. First list existing attached
worktrees and Git worktrees; reuse only one demonstrably owned by the selected
lane. Create a new worktree only after Ryan approves that setup. Record the
verified common handover commit as the start ref; never default silently to main.

Keep the current primary checkout as the preserved reference. Keep PR #1 OPEN
and draft; it remains the aggregate foundation-to-main review. Lane draft PRs
would show their incremental work against the foundation branch. Neither lane
merges, rebases the other, force-pushes, or updates foundation/main automatically.
Later integration is a separately selected owner action.

Managed worktrees share Git objects but duplicate checked-out tracked files.
The research archive is already about 0.86 GB of allocated disk. Allow for the
two checkout copies, not just new output files. Do not copy owner untracked
AQROBAT-CONTEXT, profiles, dependencies, unrelated repositories or raw archives
into every run. Missing local-only context is not permission to recreate it.

## Ownership

Research normally writes new dated experiments/prose-qr and docs/research/prose-qr
paths. The extension lane normally owns extension, web, product src, relevant
tests/tools and its own product documentation. Keep experiment wrappers separate
from the shared encoder/product implementation where possible.

Read the other lane's outputs without editing them. A required cross-lane API,
package, root handoff or shared-file change becomes an explicit integration item.
Do not silently copy an unreviewed shared core into a scientific run. Record the
exact consumed source revision. Neither lane operates on the other's Git index,
checkout, branch, task-owned profile, native documents, output directory or PIDs.

## Computer resources

The preparation snapshot found 18 GiB physical RAM, approximately 27 GB disk free,
and about 3.8 GB swap already in use. These are changing observations, not a
reservation or a guarantee that two heavy runs are safe.

Recommended starting policy:

- Keep only the two owner-created sessions. No subagents, other chats, paid
  worker farms, model downloads or hidden background jobs.
- Serialize browser-heavy suites, native-app experiments and decoder batches
  across both lanes. Code, reading and documentation can continue concurrently.
- Use a shared OS-backed advisory lock under the Git common directory for the
  heavy-work slot. Hold it for the full child-process lifetime; it releases on
  process exit. If occupied, do independent light work. Do not kill its holder.
  This is a future implementation choice, not a running service.
- At most one test browser instance across the heavy slot, with few pages and
  sequential reader workers initially. Recheck memory pressure/swap trend and
  owned-process memory between batches.
- Agree finite output/capture budgets before a run. Suggested initial ceilings
  are 512 MiB new research artifacts and 128 MiB new extension test evidence,
  with at least 12 GiB disk reserve. Adjust only prospectively after measurement
  and owner scope alignment; retain failed evidence rather than deleting it.
- If resources tighten, stop spawning new work and close/pause only verified
  task-owned children, documents and profiles. Preserve results and report the
  limit. Do not terminate unrelated Chrome, Claude Code, Codex, Word or owner jobs.

The resource policy is a light coordination guard, not a required new tech stack.
Use actual available tools and an ownership manifest; avoid custom infrastructure
unless needed. Never use broad killall/pkill or disk-cleanup commands.

## Hourly checkpoints during an authorized Goal run

At roughly one-hour intervals and before a risky transition or final stop:

1. Finish or stop the current bounded operation safely; capture partial results.
2. Update the lane's short status, decisions, source revision, case ledger,
   resource usage, failures and exact resume command/next action.
3. Stage only reviewed lane paths, run focused required validation and inspect
   the cached scope. Never use git add . or git add -A.
4. Commit a clearly labeled research or extension checkpoint. Incomplete work
   may be labeled WIP with its failures and remaining checks; it is not accepted.
5. Push only the selected lane branch with an ordinary non-force push. Verify
   the remote head and keep its PR draft. Never merge just to make a backup.

The selected execution prompt must authorize the branch/PR/checkpoint operations.
Elapsed-hour checks can happen inside the run; no recurring automation is needed.
An hourly target does not authorize interrupting another session, falsifying
validation, deleting failures or pushing secrets.

The repository and existing GitHub Pages preview are public. Keep private
credentials, owner messages/data and profiles out of commits. The separate Site
audience remains private and untouched. Pushes may trigger existing GitHub checks
and the existing Pages workflow; no new host or Site is authorized. Before source
implementation, align on whether the current public preview should follow an
integration branch rather than in-progress lane heads.

## Stop and handoff

Stop the affected operation on unexpected branch/worktree ownership, conflicting
unrelated changes, payload/source mismatch, evidence drift, insufficient resources
or missing account access. Preserve everything and explain the smallest next
decision. Do not repair with reset/clean/force, permission broadening, shared-profile
reuse or terminating someone else's process.

Before a new Goal starts, record its start/deadline, scope, path ownership,
finite caps, integration boundary and checkpoint authorization. Old three-hour
budgets are closed and do not restart. Reserve a closing period inside the new
allowance. Final reports separate implementation, fixtures, native recipient,
software scanning, owner/device acceptance, print and untested cells.

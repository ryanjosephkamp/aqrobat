---
status: alignment-only
authorization: orientation-and-scope-discussion-only
execution_status: not-authorized
owner: Ryan
prepared: 2026-10-23
lane: browser-extension
---

# Aqrobat extension: fresh-session alignment

## Authorization Status

Ryan selected reliable styled-text insertion into Gmail and similar editors as
the first finish line and requested a fresh-session handover. This package starts
orientation and scope discussion only. It does not start implementation, Goal
mode, browser testing, worktrees or remote writes. A later current-user execution
request controls the selected run.

## Objective

Align on finishing the existing Make → Save → Insert workflow so a user can place
real styled text into a supported editor, preserve their draft and Undo, verify
the actual result, and understand supported destinations and scanning limits.

## Required Reading

From /Users/noir/Documents/aqrobat:

1. AGENTS.md and docs/PROJECT-HANDOFF.md as required; the latter predates later
   research.
2. RESUME.md and docs/handover/2026-10-23/README.md.
3. docs/handover/2026-10-23/EXTENSION.md and COORDINATION.md.
4. docs/browser-insertion.md, docs/browser-insertion-review.md, docs/gmail-review.md,
   docs/text-portability.md, docs/distribution.md and docs/validation.md/.json.
5. extension/manifest.json, worker.mjs, popup.mjs and insertion.mjs; relevant
   web/src/tools modules and insertion/extension tests.

Consult research context to understand the integration boundary, not to start
prose experiments. There is no approved next-run plan or repository-specific
prompt template to invent.

## Decisions

Confirmed: Gmail and similar editors first; keep styled/copyable text primary,
preserve image exports, RTF, grids, exact payloads, pinned encoder/license,
private npm package, owner data and existing draft PR.

Recommended: one actual draft scenario and a small declared editor matrix before
prose integration or broader feature expansion. Worktree/branch arrangement,
run duration, resource caps and owner-assisted Gmail access need alignment.

## Scope

Read-only product/code/evidence review and a proposed next execution scope.
Inspect existing tests without running browser/native suites, builds or installing
the extension. Do not open or modify Ryan's installed profile or mailbox.

## Deliverables

Explain the implemented workflow and evidence dates; identify concrete
acceptance gaps. Propose the first Gmail/editor scenario, handling of missing
access, regression checks, output compatibility, resource/isolation policy and
hourly checkpoint plan. Keep speculative improvements separate.

## Execution Steps

1. Verify cwd, root, branch, HEAD, remote, dirty state and worktree ownership.
   Do not switch the current checkout or reset to a historical hash.
2. Read the product, insertion and validation sources. Identify implemented
   behavior versus fixture, native, owner and scanning evidence.
3. Inspect narrow permissions, saved recipes, target/cursor/draft protections,
   stale preview checks, Undo and the current build overwrite paths.
4. Recommend a bounded path to real Gmail draft insertion, scan, Undo and
   reopening. No outgoing message is part of the initial acceptance.
5. Align remaining choices with Ryan. After a later explicit Goal start, carry
   out the agreed work without repeated routine permission requests.

## Verification

Report source/version and the dates/scopes of stored validation. Current CI is
not green: the saved head's unit-test step passed and formatting failed.
Do not claim these historical results are new installed-editor acceptance.

For later selected changes plan required unit/build/browser/text-browser/insertion
checks, exact final-ZIP installation in a fresh test-owned profile, and separately
record actual recipient behavior. Preserve frozen research bytes while addressing
formatting policy if included in the selected product scope.

## Prohibited Actions

No Goal creation, source edits, installs, extension updates, builds, tests,
worktree/branch changes, Git writes, agents, other chats, deployments, store/npm
publication, merge, Site/audience changes or messages during alignment.

Do not send mail, use private owner profiles/credentials, delete or move other
repositories, terminate unrelated sessions/apps, edit the research lane's files,
or use reset/clean/force push. Do not label safe insertion or matrix validity as
portable scan acceptance.

## Stop Conditions

Preserve and report unexpected dirty state, ownership conflicts, source/evidence
drift or missing access. Lack of Gmail authentication does not authorize profile
reuse; propose owner-assisted testing and prepare independent local work.
Leave implementation inactive until the next scope is selected.

## Status Updates

Give concise updates on verified state and scope decisions. State that no
implementation or Goal has started. Avoid recurring monitors or unchanged polls.

## Completion Report

Provide the current product state, recommended first finish line and acceptance
matrix, dependencies on owner input, proposed concurrent-work/checkpoint
arrangement, and the remaining decisions. Do not present a proposal as shipped.

## Activation Prompt

```text
In /Users/noir/Documents/aqrobat, read AGENTS.md and
docs/prompts/2026-10-23-extension-alignment.md.
Follow that package for orientation and scope alignment only.
Prioritize reliable styled-text insertion into Gmail and similar editors.
Do not start Goal mode, implementation, tests, worktrees or deployments yet.
```

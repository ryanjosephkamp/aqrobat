# Single Sol reviewer pilot

The subagent route worked in this session. Astra submitted one fresh-context GPT-6.1 Sol / High request, entered blocking waits, received the automatic final handback, and resumed for targeted reconciliation. No separate sidebar chat was created, no parent model switch occurred, and no manual handoff was needed.

## Observed sequence

1. The parent verified the clean baseline `eede84866744d49d38e69d88210058d3af20c9ba`, adapted the sealed continuation prompt into `REQUEST.txt`, and created `orchestration.json`.
2. `collaboration.spawn_agent` accepted task `sol_review` with model `gpt-6.1-sol`, effort `high`, and `fork_turns: none`. Only one worker was launched. The explicit override request was accepted; this is not an independent backend model attestation.
3. The parent entered six `collaboration.wait_agent` calls with a 60,000 ms maximum per call. The first five returned timeouts. The sixth returned a mailbox update containing the worker's final handback. Between these waits, the parent did no scientific review, file work, browsing, usage polling, or duplicate audit. Reissuing bounded waits still involves small orchestration turns.
4. The worker's first clock observation was 18:41:32 UTC, after its initial instruction and Git reads. Its scientific review was complete by 18:46:24 UTC and its final receipt records 18:46:56 UTC. This is about 5 minutes 24 seconds from first clock observation to finish, not an exact total dispatch duration.
5. The parent's first clock observation after handback was 18:47:11 UTC. It read the returned findings, checked two material qualifications against their cited source, and verified artifact scope. It did not redo the full scientific review. Live PR #1 was still OPEN and draft.

All times are 2026-10-10 UTC. The new review deadline was 19:01:00 UTC. The earlier Astra experiment clock was never reopened or reset.

## What this does and does not establish

| Question                                                        | Observed result                                                                                                                                                                                                                                |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Can the parent dispatch a different requested model and effort? | The exposed tool accepted GPT-6.1 Sol / High with a fresh context. No parent setting was changed.                                                                                                                                              |
| Can the parent wait without duplicating the work?               | Yes. The parent used blocking tool waits and did no parallel scientific work.                                                                                                                                                                  |
| Does the handback return automatically?                         | Yes, in the still-active parent turn. The sixth wait received the worker's final handback.                                                                                                                                                     |
| Was desktop Fast mode confirmed?                                | No. The tool metadata lists a priority service tier, but the spawn schema exposes no separate Fast argument. This pilot cannot equate that metadata with the desktop toggle.                                                                   |
| Was waiting proven to cost zero?                                | No. The tool wait is a waiting interval rather than intentional parent reasoning work, but this session has no per-call billing evidence. Dispatch, timeout handling, and reconciliation still use the parent; the worker also consumes usage. |
| Was Sol proven cheaper or faster than Astra for this review?    | No. There was one worker and no comparative run or attributable usage ledger. The observed duration is useful operational evidence, not a model benchmark.                                                                                     |
| Does it wake a closed or completed parent chat later?           | Untested. The parent remained in an active turn waiting on its child.                                                                                                                                                                          |
| Does a separate sidebar-chat handoff work the same way?         | Untested. This trial used the authorized subagent alternative.                                                                                                                                                                                 |

One account-wide usage read was made during setup. Its account-specific values are not saved here and cannot attribute costs to this pilot, either model, or the waiting interval. No usage reset or credit purchase was requested or performed.

## Recommended reuse within an authorized task

Use Astra for task framing, bounded delegation, important decisions, and reconciliation. Give a single fresh-context Sol worker a complete source list, a narrow review contract, a fixed output directory, a deadline, and explicit acceptance and stop conditions. High was adequate to produce a substantive handback here; this pilot does not compare High with Xhigh or Luna. Choose a different effort only when the actual task warrants it.

Keep the parent in blocking waits and consume the final handback directly. Reconcile material findings against cited evidence; avoid having Astra repeat the whole review. If the worker fails, report its actual result and preserved artifacts before deciding whether another run fits the user's scope and remaining budget. Do not automatically spend an unapproved retry budget.

`FUTURE-REVIEW-TEMPLATE.txt` records this pattern. It is a reusable instruction template, not an automation, a new research authorization, a changed AGENTS.md rule, or a change to global memory. The user's current pilot authorized exactly one worker; no further worker or research panel was launched. The new 25-minute conventional-control proposal remains for Ryan to select in a later round.

## Delivery and verification

The worker produced `REVIEW.md`, `review.html`, `claims.json`, and `reviewer-receipt.json`. The parent preserved those bytes, added this workflow record and `RECONCILIATION.md`, and assembled `index.html` with the workflow summary followed by the complete self-contained Sol review. Both HTML files embed the two existing scientific images and require no remote assets or JavaScript.

The worker reports 535 custody entries matched, 744 saved RMS values recomputed, and the full repository formatting check passing. The parent's narrower checks cover the newly material findings, returned artifact hashes, HTML structure and local dependencies, tracked-file preservation, and final formatting. No new scientific render, decoder call, native-app paste, phone test, physical-print test, or live report browser QA was performed. Product test/build/browser/text-browser and optional installed-extension/native-text checks were not rerun for these documentation-only additions; they are untested in this pilot, not unavailable.

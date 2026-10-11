# Browser insertion review continuation · 0.4.1

October 7, 2026. Code and package review resumed from the saved 0.4.0 checkpoint.
Gmail is Ryan's selected first real destination. Its manual acceptance remains open.

## Resolved findings

1. **Reopening could keep the previous recipe.** A new regression reproduced this
   on the checkpoint bundle. Reinvocation now closes the prior task-owned panel
   and listeners, then displays the current invocation's recipe.
2. **Layout validation omitted some typography.** Font features, variation,
   kerning, stretch, alignment, indentation, and character limit changes now
   invalidate a prepared insertion. Preview uses the same measured font properties.
3. **Insertion handlers could move the target cursor.** After the cancellable
   event, Aqrobat checks draft content, typography, editability, active field,
   and the original empty cursor before invoking Chrome's editing command.
   Tests verify that another draft is not modified by focus redirection.
4. **Plain rich-editor measurement could use the wrong font.** A cursor with
   different typography from its editor root is now refused. Formatted insertion
   remains available. This bounds the supported plain-text case explicitly.
5. **A font-loading preview could become obsolete.** Field/panel revisions and
   current draft content are checked after awaiting fonts before enabling Insert.

The existing worker still accepts library/insertion requests only from its own
specified extension pages. Only the chosen recipe is passed to the isolated
injection; no broad host grant or always-on content script was added. No image
or hidden solid QR underlay is inserted. Core/image/RTF source is preserved.

## Review result

Automated checks and actual final ZIP installation pass in their recorded scopes.
Raw decoder results remain rich 1/4 and measured plain preview 0/4. See
[validation](validation.md) for exact provenance and historical native limits.
No Gmail mailbox, sent message, owner profile, new phone scan, or physical print
was exercised by the agent.

## Next step

Use the [Gmail manual review](gmail-review.md) and the local HTML handback at
`/Users/noir/Documents/aqrobat-gmail-review-2026-10-07/index.html`. It has four
Recipe JSON downloads and separate draft layout, phone scan, Undo, saved draft,
and received-message observations, with exportable results. Start with the black
circle if testing only one recipe, because it is the positive controlled decoder
example; that is not a Gmail success claim.

Continue existing draft PR #1 on `codex/aqrobat-foundation`. npm remains
`private: true` and unpublished. Keep migration, atlas, merge, and releases
unselected. The original pause file and migration handoff are retained unchanged.

## Suggested follow-up

> Review Aqrobat 0.4.1 on codex/aqrobat-foundation using my Gmail results JSON
> and notes. Read AGENTS.md, docs/browser-insertion-review.md, and docs/validation.md;
> verify local/GitHub state before editing. Resolve concrete insertion or formatting
> defects within Aqrobat and preserve other work. Keep PR #1 draft, npm private
> and unpublished, and acceptance open until I approve the actual destination output.
> Keep formatting, raw decoding, phone, and print evidence separate. Do not move
> projects, refresh the migration handoff, merge, publish, message anyone, or launch
> other chats/agents. Retain image exports, comparison grids, RTF, all prototypes,
> Splashery, and the private PDF archive.

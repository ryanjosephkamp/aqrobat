# Extension lane: finish dependable editor insertion

Ryan selected reliable styled-text insertion into Gmail and similar editors as
the first finish line on October 23, 2026. This is direction selection, not a
request to start implementation or Goal mode in this preparation session.

## Current implementation

Aqrobat 0.4.2 is a Manifest V3 unpacked Chrome extension sharing the website's
local deterministic JavaScript core. It already has:

- Context-menu generation from selected text, a link or the current page.
- A workbench with palettes, themes, image and text comparisons, recipe import
  and exports including PNG, SVG, TXT, styled HTML and RTF.
- An explicit local library of up to 20 saved recipes and persistent appearance.
- A toolbar Make → Save → Insert journey, with only the selected recipe handed
  to the destination page.
- User-invoked formatted and font-measured plain insertion, fit checks, empty
  cursor protection, stale-preview checks and native Undo in tested fixtures.

The permissions are contextMenus, storage, activeTab and scripting. There are
no declared broad host permissions or always-on content scripts. The current
worker checks the sending extension page before accepting library/insertion
requests; injection uses an isolated world. Do not describe this inspection as
a fresh exhaustive security audit.

Current official Chrome documentation still describes
[activeTab as temporary user-invoked access](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab)
and [scripting as requiring permission plus host access](https://developer.chrome.com/docs/extensions/reference/api/scripting).
Preserve the narrow access model unless a concrete supported feature requires a
reviewed change. Broad permissions are not a prerequisite for this finish line.

## Evidence and gaps

The recorded October 8 validation covers 18 unit tests, source/offline UI,
insertion fixtures, and actual final ZIP installation in a fresh Chrome for
Testing 151 profile, including persistence across restart. It is historical
evidence, not a new test on today's browser or Ryan's installed copy.

The original native toolbar pilot covers 0.4.0. Real Gmail draft, reopened draft,
received message and newer native installed-toolbar acceptance remain open.
Ryan previously reported that native RTF looked correct; ordinary Mac clipboard
paste remained unreliable. The prose Word acceptance is a separate renderer and
does not certify this extension's insertion.

Recorded jsQR results were 1/4 rich inserted fixtures (black circle), 0/4 measured
plain previews, 0/11 image artwork examples and 0/4 ordinary text-row probes.
These results are scenario-specific. The validity of the encoded matrix and safe
insertion behavior do not establish scanning.

## Recommended first finish line

A user can make/save a named styled-text QR, choose a Gmail draft, insert at the
intended empty cursor, retain the surrounding draft, inspect the destination,
scan the actual inserted result, and Undo without damaging their other content.
Then check reopening/saving. A received-message test is a separate owner-authorized
step; never send mail automatically.

Start with the documented black-circle recipe because it is the positive local
rich-insertion control. It is a starting test case, not a declared Gmail pass.
Test the currently installed browser and final built ZIP in a fresh task-owned
profile. Owner-assisted sign-in/testing must be explicit; never reuse private
profiles, cookies, drafts or credentials as a shortcut.

After this path passes, use a small declared editor matrix to test one further
rich editor at a time. Label unsupported/untested destinations accurately.
Do not promise universal insertion into canvas editors, embedded cross-origin
editors, native applications or every webmail client.

## Code map and useful reading

- [Insertion workflow](../../browser-insertion.md)
- [Current validation and negative results](../../validation.md)
- [Insertion defect review](../../browser-insertion-review.md)
- [One-code Gmail review](../../gmail-review.md)
- [Text portability](../../text-portability.md)
- [Distribution and saved-ID cautions](../../distribution.md)
- [Older roadmap, historical](../../roadmap-2026-10-08.md)
- [Manifest](../../../extension/manifest.json)
- [Worker](../../../extension/worker.mjs)
- [Insertion module](../../../extension/insertion.mjs)
- [Popup](../../../extension/popup.mjs)
- [Workbench](../../../web/app.mjs)
- [Recipe library](../../../src/library.mjs)
- [Text rendering](../../../src/text.mjs)
- [Font spacing](../../../src/spacing.mjs)
- [Build tool](../../../tools/build.mjs)

The build replaces only its own dist/extension directory, then overwrites the
three generated downloads. Run it only in the extension lane's selected checkout
or a declared disposable copy. It must not overwrite the research or owner
checkout's accepted downloads.

## Scope options after the first acceptance

Recommended: reduce friction in the selected journey, improve refusal messages,
remember an explicit last selection, expose clear output/scan status, and make
recipe export/recovery easy. Keep the image path, RTF and existing grids working.

Proposed later: conventional QR fallback, deliberate website-to-extension recipe
transfer, broader payload builders, additional destinations and prose integration.
Each should earn a clear benefit and test plan. The current prose studio should
not be presented as a production extension feature.

No stack rewrite is requested. Targeted changes and dependencies can be considered
with compatibility, size, licensing and runtime privacy evidence.

## Validation and release boundary

For relevant product changes run npm test, npm run build, npm run test:browser,
npm run test:text-browser, npm run test:insertion and npm run format:check.
Installed-extension and native checks are valuable platform evidence; report
availability and exact scope. Focused tests should cover concrete defects and
draft preservation, rather than duplicating implementation.

The saved PR already has formatting failures in retained evidence. Plan a narrow
formatting-policy fix if selected, preserving every frozen evidence byte. Do not
run a repository-wide formatter over research.

Keep npm private/unpublished and PRs draft. No store submission, merge, release,
new host, Site/audience change or owner-installed update follows automatically
from passing tests. Keep saved extension identity/library intact.

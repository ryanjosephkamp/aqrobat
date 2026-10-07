# Saved recipes and direct browser insertion · 0.4.1

Clipboard data includes characters and, optionally, HTML. A receiving app may
choose only plain text or discard typography. The recipe already contains every
module position, so Aqrobat can rebuild its text directly inside a browser field.
No AI or remote QR service is involved.

## Use it

1. Update the files in your **existing unpacked extension folder** from the new
   ZIP, then click Reload in `chrome://extensions`. Confirm version **0.4.1**.
   Keep the same folder/extension ID; export Recipe JSON backups before reinstalling.
2. Open the toolbar → **Open generator / saved recipes**. Create or load a Recipe
   JSON file, name it, and choose **Save in extension**. The library holds 20
   recipes. This explicitly stores their payloads/settings locally until removed.
3. Open a destination browser page. Invoke Aqrobat’s toolbar, select the recipe,
   then choose **Insert a saved QR into this page**. Only that recipe is passed
   to the destination page; the rest of the library stays in the extension.
4. Click inside the intended multiline field. Place an empty cursor; selected
   draft text is preserved. Choose an insertion mode and preview.
5. **Insert at cursor**, then inspect and scan the actual result. Native Undo
   removes the insertion in our Chrome fixtures. Check saved/published/received
   output separately; Aqrobat never sends an email or submits a form.

The [standalone practice page](../downloads/aqrobat-insertion-practice.html) includes
hash, rocket, circle, and mixed demos, Recipe JSON loading, plain/rich editors,
and a plain editor font-size control. It needs no extension or server. Its
imports are temporary, not an extension-library save. The generator also links
it under Copyable text. The extension’s own practice page can use its saved library.

## Two layouts

**Formatted text** uses real `<pre>` or table/spans, inline typography, and a white
background. Width is adjustable from 200–1536 px and must fit the field. Blank
table cells have zero font/line size so an editor’s default font cannot stretch
them; glyph spans retain their measured sizing. No image or solid-module underlay
is inserted. Rich editors may sanitize this structure.

**Measured plain text** uses the destination’s actual DOM font metrics, including
font fallback and spacing. It measures whole prefixes to limit cumulative drift,
compares bounded combinations of ordinary, nonbreaking, thin/hair, and fullwidth
blanks, and pads rows toward the known module positions. It adapts horizontal
repetition and sometimes vertical repetition to that font. It keeps candidate
cell width within 10% of cell height and rejects alignment error above 20% of a
cell. These are provisional layout bounds, **not decoder guarantees**. The preview
reports pixel size and maximum error; cells can remain slightly rectangular.
TXT cannot carry these font settings to a different recipient.

Insertion rejects insufficient width, maxlength overflow, read-only fields,
single-line/password inputs, selected text, unsupported plain typography, and
drafts/styles changed after preview. It honors a cancellable `beforeinput` event,
uses Chrome editing commands for Undo, and reports detected editor changes to
inserted text or dimensions. It does not bypass an editor’s refusal with direct
DOM/value replacement. Complex controlled editors can still refuse or transform
an insertion; inspect the draft and use Undo when needed.

Reopening the toolbar replaces an older insertion panel with the newly chosen
recipe. A preview awaiting fonts is discarded if its field/panel changes.
Font features, variations, alignment, indentation, and character limits are
included in the saved layout checks. Cursor, editability, and typography are
checked again after the editor's insertion event; an event that moves focus to
another draft does not redirect the insertion. Measured plain mode refuses a
cursor with different typography from the editor root, rather than measuring
the wrong font. The [Gmail owner review](gmail-review.md) is the next acceptance step.

## Access and limits

`activeTab` plus `scripting` allows temporary, user-invoked page access. There
are no broad host permissions or always-on injected scripts. Browser settings,
other extension pages, cross-origin embedded editors, and canvas-based editors
may be inaccessible. Native TextEdit/Mail are outside a Chrome extension’s DOM;
RTF remains the working native-document route Ryan reviewed.
[Chrome activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab),
[Chrome scripting and isolated worlds](https://developer.chrome.com/docs/extensions/reference/api/scripting).

The editing command is deprecated but preserves Chrome’s Undo history in these
tests; editor implementations vary. The modern clipboard API remains available
for ordinary copy/export. [MDN editing-command limitations](https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand).

Run `npm test`, `npm run build`, `npm run test:insertion`, and the existing browser,
text-browser, and installed-extension checks. `tests/native-insertion.mjs` is an
optional interactive harness: it prepares a fresh profile and asks for real
Chrome toolbar/field actions, then reads the resulting DOM and removes only its
own profile. [Validation and negative decoder results](validation.md).

Gmail, Outlook, Substack, native clipboard destinations, received email, phone
scans, and physical print remain separate acceptance checks. Ryan’s installed
profile was not inspected or modified. The project move and emoji atlas remain
deferred. Existing image exports/grids, RTF, old prototypes, and other repositories
are preserved.

# The Chrome extension

The extension puts a code straight into the field you are writing in. Instead
of going through the clipboard, which many apps reshape, it builds the text
inside the field using that field's own font.

## Install

1. Download [the extension ZIP](../downloads/aqrobat-extension.zip) and unzip it.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Choose **Load unpacked** and pick the unzipped folder, the one that holds
   `manifest.json`.

To update, replace the files in the same folder and click **Reload** on the
extension's card. Keeping the folder keeps the extension's ID, and with it your
saved codes and settings. Before you remove the extension, save the recipes you
want to keep.

## Make and insert

Click Aqrobat in the toolbar. The popup starts with the current page's address.

- **Copy for …** copies the code shaped for the destination. On a known site,
  such as Gmail or Slack, the popup picks that destination for you.
- **Insert on this page** opens the insert panel on the page with this code. It
  is not saved.
- **Saved codes** lists codes you saved from the workbench. Choose one and click
  **Insert**.
- **Open workbench** opens the full generator inside the extension, where
  **Save** keeps a code for later. The extension holds up to 20.

Right-clicking a selection, a link, or the page opens that text in the
workbench. The text travels through the extension's session storage under a
one-time key, never in a web address.

## The insert panel

1. Click inside the field where the code should go, on an empty line.
2. Pick a format and click **Preview**.
3. Click **Insert**, then check the field and scan it. Undo removes the code.

| Format         | Use it for                                                                                                                          |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Formatted text | Email and rich editors that keep fonts. Width is adjustable and must fit the field.                                                 |
| Measured text  | Plain fields. It measures the field's font and pads each row so the squares line up.                                                |
| Emoji          | Codes drawn in emoji, in any field and any font, with ⬜ in the light squares. Apps known to keep only text start with this format. |

The panel refuses before it changes anything when the field is single-line,
read-only, too narrow, or has a character limit the code would pass, when text
is selected, or when the draft changed after the preview. It gives the editor a
chance to decline the insertion and never forces text in around it. Chrome's
editing command keeps the insertion in the editor's normal Undo history.

## What it can reach

The extension asks for `activeTab`, `scripting`, `storage`, and
`contextMenus`. It can reach a page only after you click it there, and only that
tab. It declares no access to all sites and runs nothing in the background on
pages. The insert code runs in Chrome's isolated world, and only the code you
chose is passed to the page.

Chrome does not let extensions into its own pages, other extensions, the Chrome
Web Store, or some embedded editors from other sites. Desktop apps such as
TextEdit or Mail are outside the browser; use RTF or copy and paste there.

## Practice

The [practice page](../downloads/aqrobat-insertion-practice.html) has a plain
field and a rich editor with sample codes. It works without installing anything.
Passing there shows the insertion works; it does not prove a code survives in a
particular app, so check the real destination too.

## Tests

`npm run test:insertion` drives the insert panel on the practice editors,
including Undo, refusals, and draft protection. `npm run test:extension` loads
the built ZIP in a fresh Chrome for Testing profile and checks storage, the
toolbar icon, the popup, and saved codes across a restart.
`tests/native-insertion.mjs` is an interactive check that uses the real toolbar.

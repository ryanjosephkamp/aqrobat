# Gmail quick review · 0.4.2

Start with **one QR and one draft**. No recipe-file download or import is needed.
These steps are for Chrome on your Mac; the phone scans the Mac screen.

## Update once

Download the [extension ZIP](../downloads/aqrobat-extension.zip). Replace the files
inside your **existing unpacked extension folder**, keeping that folder in place.
Open `chrome://extensions`, click Aqrobat’s **Reload**, and confirm **0.4.2**.
Keeping the same folder/extension ID preserves its local library. Before a reinstall,
export Recipe JSON backups of anything important. Your installed copy was not changed
by this task.

## Make → Save → Insert

1. Open the Aqrobat toolbar → **Open QR workbench**.
2. Enter `https://example.com`. Choose **⚫️ / Black circle**, **1 across × 1 row**,
   **Menlo**, and **328 px**. Leave **M**, **Thicken glyph ink**, and **Boost ECC if
   it fits** enabled. Click **Generate QR**.
3. Under the preview, name it **Email test**, then **Save for insertion**.
4. Switch to Gmail and **Compose** a fresh draft without a recipient. Type
   `Before the QR`, then press Enter to leave a blank line. In the compose window’s
   **More options** menu, make sure **Plain text mode** is off.
   [Google’s formatting instructions](https://support.google.com/mail/answer/8260?co=GENIE.Platform%3DDesktop&hl=en-EN).
5. While on Gmail, open the Aqrobat toolbar. Choose **Email test** →
   **Choose where to insert**.
6. Click the **blank line in the message body**. In the Aqrobat panel, keep
   **Formatted text · email / rich editors** and **328 px**. Click **Preview**, then
   **Insert QR**. If it refuses, record the exact message; the draft should remain intact.
7. Inspect and scan the **QR in the Gmail draft**, using Samsung Camera.
   Scanning the helper preview is a different test. The expected link is
   `https://example.com`.
8. With the cursor in the message body, press **⌘Z**. Did the QR disappear while
   `Before the QR` remained?

That is enough for the first review. You can leave the draft unsent. If you later
reinsert, close/reopen the draft, or send a test to yourself, report those as separate
saved-draft/received-message observations. Aqrobat never sends mail or submits a form.

## If something goes wrong

- **No saved QR:** make it in the extension’s workbench, not just the public
  website. Website Recipe export → extension Load a recipe → Save for insertion
  is an optional transfer route; ordinary Copy text does not save to the library.
- **Too narrow:** widen the compose window first. If you change the insertion
  width, report that number. Do not add spaces manually in the first recorded case.
- **Refused or distorted:** copy the panel’s message and describe where it stopped.
  Use Undo if an insertion changed. A screenshot is optional; hide private email details.
- **No scan:** report it as no scan, separately from whether the layout looks right.
  A camera opening the expected link is useful phone evidence. Exact raw-payload
  recovery is a stronger and separate check, only when the scanner exposes it.

## Reply with this

No JSON file is required. Paste this short template into our chat:

```text
Review Aqrobat 0.4.2 using these Gmail notes.
Insertion: [worked / refused / changed layout / not tested]
Panel message or where I got stuck: [...]
Actual Gmail draft scan: [expected link / no scan / not tested]
Scanner: Samsung Camera on Galaxy S25 Ultra [or other app]
Screen/browser/zoom: MacBook Pro / Chrome / [zoom]
Undo: [QR removed and original text kept / problem / not tested]
Changed settings, if any: [...]
Optional saved draft / received email / screenshots: [...]
Keep PR #1 draft and npm private/unpublished. Preserve other repositories,
original prototypes, and the PDF archive. Do not send messages, launch chats or
agents, migrate projects, or start prose-QR or emoji experiments from these notes.
Resolve concrete Aqrobat issues within the current review scope.
```

Image exports/grids and RTF remain available. Current browser fixtures are not a
Gmail compatibility claim. Phone, receiving-mail, blog, document, and physical-print
acceptance remain separate. The older four-recipe handback is preserved at
`/Users/noir/Documents/aqrobat-gmail-review-2026-10-07/index.html` for optional deeper review.

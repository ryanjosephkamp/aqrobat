# Gmail owner review · 0.4.1

Gmail is Ryan's selected first destination. This is a manual review protocol,
not evidence that Gmail already works. Use the local HTML handback for recipe
downloads, the practice page, and separate observation fields.

## Prepare

1. Export Recipe JSON backups of anything important in the installed extension.
   Update the **same unpacked extension directory** from the 0.4.1 ZIP, click
   Reload in `chrome://extensions`, and confirm version 0.4.1. Keep the same
   extension ID so its local recipes and appearance preferences remain available.
2. In the extension generator, load each provided recipe with **Load a recipe**,
   name it (Gmail · hash, rocket, circle, or mixed), then **Save in extension**.
   They all encode `https://example.com`, with Menlo, 1×1 density, requested ECC M
   with boost enabled, 328 px, and thickening 0.1. No success result is prefilled.
3. Use Chrome on the Mac for insertion. The Samsung phone is the scanner. The
   extension inserts into browser fields; it does not operate native mail apps.

## Review one recipe at a time

1. Open a fresh Gmail draft with no recipient. Start with ordinary formatting,
   no list/quote/indent, and a blank line in the message body. For formatted text,
   turn Gmail's **Plain text mode off** under the compose window's More options.
   [Google's formatting controls](https://support.google.com/mail/answer/8260?co=GENIE.Platform%3DDesktop&hl=en).
2. Invoke Aqrobat's toolbar, choose the saved recipe, and select **Insert a saved
   QR into this page**. Click the message body, put an empty cursor on the blank
   line, then **Formatted text**, 328 px, and **Preview in this field**.
3. If it fits, choose **Insert at cursor**. Inspect the actual draft for intact
   corner patterns, rows, spacing, and quiet borders. Record the panel's message.
   Scan this inserted output with Samsung Camera; use the dedicated Samsung QR
   scanner as a separate observation if desired. Do not scan the panel preview
   and count that as the Gmail result.
4. Press ⌘Z with the cursor in the body. Confirm that only the insertion is
   removed and the original draft is restored. Reinsert if proceeding. Close and
   reopen the draft to check saved formatting separately from the compose view.
5. If you choose to test delivery later, send the test to yourself and inspect
   the received message separately. No email is sent by Aqrobat or by the agent.
   Recipient formatting and scan results have their own fields in the handback.

Record **not tested**, **insertion refused**, **layout changed**, and **no scan**
as different outcomes. A camera recognizing the expected link is useful evidence,
but is not an exact-payload decoder check unless its raw decoded string is available.
Record that distinction, the scanner app, screen/browser, zoom, and any distance
or brightness sensitivity. Physical print remains untested.

## If the result changes

- Preserve the Recipe JSON, a screenshot if useful, and the panel's message.
- If width is insufficient, enlarge the compose window or choose a smaller
  formatted width within Aqrobat's existing 200–1536 px range. Record the change.
- If Gmail removes typography, record that result. **Measured plain text** is a
  separate experiment and can refuse collapsing spaces or nonuniform cursor
  typography. It does not carry font styles to the recipient.
- Do not add spaces manually for the first recorded case: we need to distinguish
  generated insertion from a later edited result. Edited variants can be recorded
  separately with notes.

Phone, recipient, and document acceptance remain open. Image exports and grids
stay available as controls; reviewed RTF remains the native document route.
No project move, emoji atlas, merge, npm release, or Store submission is selected.

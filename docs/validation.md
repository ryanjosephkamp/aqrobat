# Aqrobat 0.3.0 text review validation

October 7, 2026. Node 26.10.0, Chrome 155.0.8059.39 browser automation,
Chrome for Testing 151 installed-extension integration, and macOS AppKit/Swift.
[Detailed receipts](validation.json) retain both positive and negative results.
The 0.1.0 and 0.2.0 validation files remain archived alongside them.

- `npm test`: 16 tests passed, including portable text packing, whole emoji,
  quiet borders, safe HTML/RTF escaping, filenames, prior core/CLI behavior,
  independent matrix decoding, and mocked extension handlers.
- `npm run build`: updated offline HTML and unpacked extension ZIP. ZIP CRC,
  manifest version, and shared source bytes checked. No publication.
- `npm run test:browser`: existing image grid/exports, improved plain text in
  the image print sheet, clipboard fallback, recipe/results import/export,
  themes/icons, 320/390/760 px layout, print CSS, offline generation, and no
  page errors/third-party requests passed.
- `npm run test:text-browser`: rocket, black circle, and hash recipes all fit
  their plain-text boxes in height and width. TXT/RTF/Text HTML/custom filenames,
  both clipboard MIME formats, and an actual keyboard paste into a browser rich
  text editor passed. Image pixels stay unchanged while using text operations.
  Optional real-text comparisons and image/text observation isolation passed.
  An actual beforeunload dialog appeared on reload after unsaved recipe edits.
- `npm run test:extension` with an existing Chrome for Testing binary: installed
  MV3 page saved theme/icon preferences, real `chrome.action.setIcon` accepted
  the chosen icon paths, formatted clipboard writing succeeded, and a new tab/full restart retained the preferences.
  This used a fresh task-owned profile, removed afterward. Toolbar pixels and
  Ryan's installed copy were not inspected or changed.
- `npm run test:native-text`: AppKit laid out the exported RTF characters.
  Maximum column displacement was 0.0228 pt for rocket and 0.0251 pt for circle;
  row spacing was uniform to floating-point precision. Hash rendering was
  reviewed separately. The final circle RTF was also directly observed in
  TextEdit with aligned corner patterns; only the generated test tab was closed.
- A fresh private package consumer installed the local 0.3.0 tarball and passed
  core + `aqrobat/text` API checks. Tarball is about 26 KB compressed / 83 KB
  unpacked, with zero runtime dependencies. npm remains `private: true`.

Core source, vendored encoder, and the canvas render function are unchanged.
The print helper now takes improved selectable text separately from its image.
Eleven image raster hashes match the prior version exactly. Their jsQR 1.4.0
attempts remain **0/11 payload recoveries** in the documented 656 px, Menlo,
4×2, thickened recipe scenario; those negatives are preserved.

Four ordinary text-row probes (`#`, `🚀`, `⚫️`, mixed `🤣.☄️1:a`) also recovered
**0/4 payloads** with jsQR 1.4.0 at one controlled font/size/line-spacing scenario.
These are font-row raster probes, not a claim that every real pasted output was
independently decoded. Formatting tests and matrix-control passes do not establish
phone scan reliability. No new phone or physical-print tests were performed.

**Acceptance remains pending:** actual copied/saved output in Ryan's website/blog,
TextEdit/PDF, and email destinations; his installed extension; phone and eventual
paper scans. Plain TXT cannot retain font or line spacing. HTML recipients can
strip styles, RTF can substitute fonts and has no canvas stroke ink, and mixed
palettes need destination review. See [text portability](text-portability.md).
No atlas phase, npm publication, merge, Store submission, or other chat/agent was
started. Original prototypes and the private PDF archive were preserved; archive
verification still passed for 214 files and 39,404,697 bytes against its sources.

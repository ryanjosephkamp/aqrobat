# Proposed emoji atlas pilot

This is a bounded next phase, **not executed or approved by this document**.
Keep PR #1 a draft, npm unpublished and `private: true`, and work only in
Aqrobat. Preserve all original prototypes, Splashery, and the private PDF
archive. Use this chat without agents or new chats.

## Pin the source before choosing candidates

Use [Unicode Emoji 17.0 emoji-test.txt](https://www.unicode.org/Public/17.0.0/emoji/emoji-test.txt),
not the changing `latest` alias. Opened and hashed on October 6, 2026:

- Header: Version 17.0; data date August 4, 2025.
- File bytes: 669326.
- SHA-256: `1d8a944f88d7952f7ef7c5167fef3c67995bcae24543949710231b03a201acda`.
- Retain the [Unicode License V3](https://www.unicode.org/license.txt) with
  any copied data. No system-font images or font binaries will be redistributed.

Select 32 fully qualified emoji spanning dark geometric shapes, faces, people,
animals, food, objects, and flags. Record code points, qualification, group,
name, and data provenance. Freeze the candidate list and its hash before testing.
Include three mixed palettes, including `🤣☄️` and `🤣.☄️1:a`. Missing glyphs
and fallback uncertainty must remain explicit, not silently excluded.

## Bound the work

One payload, `https://example.com`; requested ECC M with boost disabled and
the existing thickening setting. Test 32 emoji plus three palettes, each with
Menlo/Courier New, 1×1/4×2 density, and 328/656 px: **280 raw-artwork recipes**.
Use one browser process, render sequentially, and paginate the manual board
at 12 cards. Cap generated evidence at 50 MB and the automated run at
20 minutes. Stop with a partial receipt if either cap is reached.

Run the first six diverse candidates as a smoke batch before the full pilot.
The pilot characterizes one macOS/browser environment; it cannot establish
Windows, Android, or iOS font compatibility. A full emoji census is a later
decision after this pilot is useful.

## Record font-specific metrics

Record OS/browser versions, requested font stack, installed-font versions where
available, glyph advance, ink bounds, baseline, coverage by luminance threshold,
ink centroid, and gaps between repeated glyphs. Include color as well as
grayscale coverage. Canvas fallback/font availability checks do not prove the
resolved font for every glyph; record resolved-font uncertainty explicitly.

These metrics help explain failures and rank candidates for human testing.
They are hypotheses, not a scan guarantee. Preserve the raw rendered output
and hash; never fill corners with solid blocks behind the selected glyphs.
Any layout correction needs a new renderer/version receipt and must retain
the preceding evidence.

## Separate decoder and device evidence

Pin two independent decoder implementations before running: existing jsQR
1.4.0 and a separately selected ZXing implementation. Verify their exact
versions, licenses, and clean matrix controls first. Record exact recovered
payloads or failures from **raw glyph pixels** for each decoder. A conventional
matrix control is a test fixture and must never replace the glyph artwork.
No smoothing, dilation, binarized reference, or reconstructed matrix should be
reported as a raw-artwork pass. Any processed attempt gets its own labeled record.

Phone observations use a separate record: exact recipe, displayed/exported
output, renderer version, screen/print medium, actual display width, phone,
scanner app, browser, brightness, distance, and outcome. Keep Samsung Camera
and Samsung’s dedicated QR scanner separate. Earlier prototype phone reports
are historical and must not be attached to new Aqrobat recipes. Paper remains
untested until a physical printer and scanner are available.

Deliver a JSON evidence table, small paginated HTML test board with result
export/import, and a short report explaining supported outcomes and unknowns.
Choose a small set for manual review; do not ask the owner to scan all 280
recipes at once. The resulting review decides whether a larger atlas is worth
running. No release, merge, npm publication, or Chrome Web Store submission.

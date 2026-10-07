# Aqrobat 0.2.0 review validation

Software checks on October 6–7, 2026, with Node 26.10.0 and headless Chrome
155.0.8059.39 on macOS. No new phone results or unpacked-extension notes were
attached to this review request. Native phone, installed-extension, copied-text,
and physical-print acceptance remain pending.

- `npm test`: 13 tests passed. Coverage includes mixed palettes, whole emoji,
  duplicate/whitespace handling, deterministic module cycling, v1/v2 recipe
  compatibility, exact matrix decoding at all ECC levels, and exclusive CLI
  output. Mocked extension APIs cover icon changes, startup restoration,
  invalid preference fallback, context-menu payload isolation, and permissions.
- `npm run build`: produces updated offline HTML and an unpacked extension ZIP
  with five icon colors. No publishing is part of that command.
- `npm run test:browser`: mixed symbols, five exports and recipe import, all
  theme/icon choices, appearance-only persistence, unchanged QR pixels while
  switching themes/icons, personal footer links, 320/390/760 px layout, results
  export/import, clipboard fallback, print CSS, and offline `file://` generation
  passed. No page errors or third-party requests in the source-page scenarios.
  This is browser automation, not an installed-extension test.

Eleven raw glyph/palette rasters were attempted with jsQR 1.4.0: the eight
previous single-symbol cases plus `🤣☄️`, `abc123,.//';`, and `🤣.☄️1:a`.
**None recovered the payload** for `https://example.com`, 656 px, Menlo,
4×2 density, thickening, and requested ECC M with boost enabled. These negative
results are retained in [validation.json](validation.json). They are separate
from matrix-control passes and earlier prototype phone observations.

The earlier 0.1.0 receipts remain in
[validation-0.1.0.md](validation-0.1.0.md) and its JSON. No historical scan
pass has been assigned to this version. Source text and emoji artwork exist
without a hidden solid QR; fonts and optical sampling can still prevent scanning.
The [emoji atlas pilot](emoji-atlas-plan.md) is proposed, not run.

The extension ZIP passes CRC and byte-for-byte checks against its shared source
files, with 20 packaged PNG icons and violet manifest defaults. The offline
HTML is about 103 KB and the ZIP about 67 KB. The private 0.2.0 npm tarball is
about 23 KB compressed / 74 KB unpacked; mixed-palette API and CLI checks passed
in a clean consumer folder. No npm publication occurred. Formatting and staged
whitespace checks passed before commit. A new palette/theme UI walkthrough is
included alongside the preserved 0.1.0 recordings; neither is scan acceptance.

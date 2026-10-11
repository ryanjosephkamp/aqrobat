# Foundation validation

Tested on October 6, 2026 with Node 26.10.0 and headless Chrome 155.0.8059.39
on macOS. These are software checks, not native phone or physical-print tests.

- `npm test`: 11 tests passed. An independent jsQR decoder recovered the exact
  payloads of conventional matrix controls at each ECC level, including UTF-8
  text. Controls are test fixtures, never hidden behind the site's glyphs.
- `npm run build`: generated offline HTML and the unpacked extension ZIP.
- `npm run test:browser`: source page and offline `file://` page worked; size
  controls, hostile-input escaping, five exports, recipe import, clipboard
  fallback, 12-card grid, synthetic observation export/import, atomic conflict
  rejection, mobile width, and 65 mm print CSS checks passed. No observed
  third-party page requests or page errors in those scenarios.
- `npm run format:check`: passed; preserved third-party source and generated
  downloads are excluded from formatting.
- `npm pack --ignore-scripts`: a roughly 22 KB tarball / 70 KB unpacked runtime.
  Installed into a clean consumer folder; packaged API and CLI checks passed.
  No npm publication occurred.
- Extension service-worker tests exercised selection/link/page isolation,
  oversized-input handling, stale-transfer cleanup, and permissions. This is
  a mocked API harness, **not an installed-extension acceptance test**.

Eight raw glyph raster recipes were separately attempted with jsQR 1.4.0:
`#`, `@`, `M`, `.`, `█`, `⚫️`, `🙂`, and a joined family emoji. For the one
payload `https://example.com`, Menlo, 656 px, 4×2 density, thickening, and
requested ECC M (boost enabled), **none recovered the payload in that decoder**.
See `validation.json`. This is a real negative result, not an assertion failure
that has been waived. The tests validate the interface and preserve decoding
outcomes rather than pretending every glyph is scannable.

Those raw-raster failures do not contradict the owner's earlier phone reports:
the renderer/version, scanner software, optical sampling, payload, output, and
conditions need their own evidence. No scan pass from the old prototypes is
assigned to this product. All new recipes remain untested for phone use.
Physical prints and unpacked-extension native installation still need review.

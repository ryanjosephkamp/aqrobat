# Prior art and a focused product direction

Sources below were opened on October 6, 2026. This is a bounded review, not an
exhaustive novelty search. Advertised features are not independently tested
scan or privacy claims. No code was copied from the comparison products.

| Existing work                                                                                          | Relevant overlap                                                            | Implication for Aqrobat                                                                                             |
| ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| [qrcode-terminal](https://github.com/gtanner/qrcode-terminal)                                          | npm library, CLI, terminal output, small mode, ECC options                  | A terminal/npm text QR package already exists.                                                                      |
| [node-qrcode](https://github.com/soldair/node-qrcode)                                                  | General browser/server QR package and CLI, including UTF-8 payloads         | Standard QR encoding is solved infrastructure. Emoji payloads differ from emoji artwork.                            |
| [ASCII Art Unicode QR generator](https://github.com/Felipegalind0/ascii-art-unicode-qr-code-generator) | Open repository describing an ASCII/Unicode QR application                  | A website for text-like QR artwork is not a new category.                                                           |
| [OshiQR](https://oshiqr.com/en)                                                                        | Text, compact, half-block, and custom emoji modes; text copy and image save | Whole-code custom emoji rendering already exists. Its advertised compatibility was not independently verified here. |
| [libqrencode](https://fukuchi.org/works/qrencode/)                                                     | Established QR encoding library and command-line tool                       | Use proven encoding rather than inventing a different QR format.                                                    |

The interesting product opportunity is **reproducibility and testability**:
one deterministic core across a page, CLI, and local extension; recipe files
that preserve exact settings; visible requested/actual ECC; custom graphemes;
and scan observations that retain font, medium, display size, and scanner
context. This is our proposed emphasis, not proof that nobody else does it.

## Recommended sequence

1. **Review this foundation.** The single page, CLI, exports, recipes, small
   comparison grid, offline file, and unpacked extension establish the shared
   architecture. Test the new artifact on a phone and install the extension
   manually in a test profile. Keep npm unpublished until reviewed.
2. **Make an emoji atlas.** Enumerate a pinned official Unicode emoji data
   release, retain its data license, and render every supported sequence for
   specific fonts/platforms. Names and code points are not emoji image assets.
   Review unsupported/tofu glyphs separately. [Unicode UTS #51](https://www.unicode.org/reports/tr51/).
3. **Measure candidate ink.** Compute luminance, dark coverage, bounds, holes,
   and cell-edge gaps. Start with filled shapes, then faces, people, animals,
   food, and flags. Rank candidates as hypotheses, not scan guarantees. Try
   one glyph per module, repeated glyphs, and eventually controlled hybrids.
4. **Test a bounded subset.** Decode raw output with independent software,
   then sample phone cameras and physical prints. Vary payload, size, density,
   font, and ECC; preserve pass/fail/conditional/untested per exact recipe.
   Software failure is not universal failure; one phone success is not broad
   support. Do not blend processed previews with raw-output results.
5. **Package a release and a truthful demo.** Select default recipes based on
   evidence, publish npm only with owner approval, and record actual UI exports
   and real phone scans separately. A short UI walkthrough is useful now;
   recorded scan proof needs the corresponding device observations.

“Emoji QR language” is a useful design metaphor: a recipe describes how to draw
a standard matrix. It need not be a new programming language. A future preset
catalog could give people curated, evidence-backed glyph recipes without
pretending that arbitrary emoji will always scan.

MIT is appropriate for the project code: users can modify and distribute it
while retaining the notice. Third-party notices remain; system font artwork
has its own terms. [MIT license](https://opensource.org/license/mit).

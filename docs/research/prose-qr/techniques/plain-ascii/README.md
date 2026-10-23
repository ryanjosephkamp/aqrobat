# Plain ASCII through letter choice

October 9, 2026. This is a separate technique from
[styled prose](../styled-prose/README.md).

The renderer uses one regular font at weight 400 and one black color. A
deterministic optimizer chooses complete fabricated word forms and whole-word
capitalization to create darker or lighter average ink in the underlying QR
regions. Ordinary single spaces, fixed lines, normal punctuation, natural font
advances, and a white outer margin complete the layout. No per-letter weight,
gray, font substitution, hidden modules, artificial blank QR holes, or runtime
AI is needed. Capital letters can look optically heavier because their natural
shapes contain more ink; their computed font weight remains 400.

Six generated native PNGs recover three exact payloads with recorded standard
ZXing settings. Both baseline readers fail. Three saved ASCII TXT files reproduce
their original pixels and payloads in one ordinary `<pre>` text node, with no
glyph or line child elements. Lowercasing or sorting words removes recovery.
The decoder receives unchanged pixels and ordinary options, never the expected
payload or QR matrix. Exact comparison happens after decoding.

Start with the [real URL TXT](../../phase-03/txt-url-proof/refine-005.txt) and its
[exact HTML](../../phase-03/txt-url-proof/refine-005-from-txt.html). The
[more varied forms](../../phase-03/txt-varied-proof/refine-001.txt) use a different
successful reader setting. Keep case, line breaks, spaces, font, and geometry;
TXT removes no encoding-specific formatting because none is present.

Words remain artificial, capitalization conspicuous, and fields large. Real-word
and smaller-field trials failed. A handful of alternate font/size renderings
work, but arbitrary paste, coherent prose, phone scanning, and print remain
unverified. This is a structural feasibility deliverable, not accepted hidden
natural language or a product export feature.

[Full report](../../phase-03/README.md), [review page](../../phase-03/index.html),
and [manifest](manifest.json) retain exact successful references. The earlier
styled-prose source and evidence are unchanged.

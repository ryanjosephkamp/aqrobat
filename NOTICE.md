# Third-party notices

`vendor/qrcodegen.mjs` is Project Nayuki's QR Code generator library, MIT
licensed, at upstream commit `3c6d0b3cefb4e049dc337e82237c9644399716a8`.
The preserved header includes its complete license and describes its compilation
from TypeScript 5.6.3 and the added module export. It was copied byte-for-byte
from the earlier local prototype. Upstream:
https://www.nayuki.io/page/qr-code-generator-library and
https://github.com/nayuki/QR-Code-generator.

The new core and renderers adapt the deterministic architecture and text-row
layout from Ryan Kamp's MIT-licensed local text QR prototypes. Those prototypes
and their private evidence are preserved separately; this repository contains
no PDF experiments or their native screenshots.

No emoji images, fonts, or artwork libraries are bundled. Rendered emoji use
the viewer's installed system fonts; the project license does not relicense
those fonts or their artwork. Development-only packages retain their own
licenses in their installations. They are excluded from distributed runtime
files and the extension ZIP.

The personal footer’s inline SVG icons are reused from Ryan Kamp’s MIT-licensed
Link Meteor site (`site/assets/img/icons.svg`); its copyright is Ryan Kamp,
2026, also retained in Aqrobat’s root license. Source:
https://github.com/ryanjosephkamp/link-meteor/blob/main/site/assets/img/icons.svg.

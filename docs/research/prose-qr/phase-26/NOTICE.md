# Research-only reader provenance

This phase retains an unmodified @undecaf/zbar-wasm 0.11.0 package archive and the
exact extracted runtime bytes. It is LGPL-2.1, not covered by Aqrobat's MIT license.
License is package-01/LICENSE.txt. Runtime bytes are kept as main.cjs.txt to retain
original presentation; Node loads these original bytes through its CommonJS loader.
No product/package/extension integration or npm dependency change was made.

Original wrapper source and build scripts at commit
c04ab59682681e27a24b36b36084806437a5d224 are retained as wrapper-source.tar.gz.
The build Makefile specifies ZBar 0.23.90 and Emscripten 3.1.44. The named ZBar
source distribution is retained as zbar-0.23.90.tar.gz. Download hashes and exact
URLs are in package-01/source-downloads.json; package SHA-512 registry integrity
was checked before execution. This run used the published binary, not a locally
reproducible build; bit-identical rebuild has not been demonstrated.

Primary sources opened for this decision:

- [ZBar wrapper project](https://github.com/undecaf/zbar-wasm)
- [Pinned build Makefile](https://raw.githubusercontent.com/undecaf/zbar-wasm/c04ab59682681e27a24b36b36084806437a5d224/Makefile)
- [Pinned license](https://raw.githubusercontent.com/undecaf/zbar-wasm/c04ab59682681e27a24b36b36084806437a5d224/LICENSE)

OpenCV's WeChat reader was considered but not run or downloaded. Its source uses
a ZXing-based decode path, so we chose ZBar for stronger implementation separation:
[opened OpenCV source](https://raw.githubusercontent.com/opencv/opencv_contrib/4.13.0/modules/wechat_qrcode/src/wechat_qrcode.cpp).

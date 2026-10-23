# Phase 13 — ordinary reader symbol diagnostics

Before execution, retain this plan and source hash. Fresh `run-01`, cap 2,000,000
logical bytes including source. No native rendering, payload generation, image
transformation, reader threshold change, forced corners or pixel repair.

Exactly six saved PNG inputs: phase 12 native 20 and 14, phase 11 justified,
phase 10 completed staggered-0, phase 12 full control and solid control. Verify
PNG and decoded RGBA hashes. Run unchanged default QR-format ZXing first, then
the existing baseline, then a separate `returnErrors:true` diagnostic profile.
All unspecified options retain installed defaults, including its built-in
pyramid. Report invalid results as invalid; never acceptance. Error reporting
can change search termination and is not asserted passive-equivalent to defaults.

For any returned symbol, save the reader's actual sampled luminance matrix and
position. Post-return source comparisons check nominal corners/dimension and
each 7 by 7 finder, plus horizontal, vertical and both diagonal runs through
the returned matrix centers. No expected geometry is passed to the reader.
Native finder formation requires all three complete masks, balanced five runs
and nominal dimension/corners, not a coordinate pass alone. Even this evidence
does not substitute for native payload decode, legibility or phone acceptance.
Record every error/abort/unattempted slot. No full QR generation is authorized
by this plan alone.

The pinned implementation exposes the sampled detector bits, not an encoder
reconstruction: [MatrixBarcode](https://raw.githubusercontent.com/zxing-cpp/zxing-cpp/2ecec3f5be0ee803f6e14a5a2c7028c0cfe525b4/core/src/BarcodeData.h)
and [symbol accessor](https://raw.githubusercontent.com/zxing-cpp/zxing-cpp/2ecec3f5be0ee803f6e14a5a2c7028c0cfe525b4/core/src/Barcode.cpp).
The QR reader samples detected finder sets before decoding and conditionally
returns malformed symbols when requested: [reader](https://raw.githubusercontent.com/zxing-cpp/zxing-cpp/2ecec3f5be0ee803f6e14a5a2c7028c0cfe525b4/core/src/qrcode/QRReader.cpp).

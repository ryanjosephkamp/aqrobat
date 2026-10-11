# Retained standalone-replay mismatch

The first verification script stopped at its exact-PNG assertion after saving
the standalone replay and its immediate repeat. Original captured HTML bytes,
exported HTML bytes, Selection and requested Impact face agree. Paint inventory
has91,162 visible elements, black/gray180 leaf text and no images or dark
backgrounds. The two replay PNGs are byte-identical to each other.

The replay is not pixel-identical to the original native capture:24 pixels differ,
maximum channel difference15, all at x799 and y1742..4442, one pixel to the left
of the4000px text field beginning at x800. This is an antialiasing/overhang-sized
difference; its cause has not been established. Preserve both PNGs and the failed
assertion. Do not repair, align, crop or substitute a PNG to claim exact replay.

Amend the close verification from zero decoder calls to four ordinary calls on
the unchanged replay PNG: ZXing, jsQR, OpenCV and macOS Vision. The readers get
only its path/pixels, no expected payload or supplied geometry. This is one
separate verification replay, not a new candidate or a retry of a failed decoder
input. The original candidate denominator remains75. Retain every result.

The one planned visual-detail capture remains unused by the stopped script.
Complete it in a fresh task-owned browser, with no additional full-field native
capture, and compare its pixels to the original region. Label it inspection-only.

# Measured setup change before candidate captures

The combined native atlas completed and repeated exactly. Impact's maximum
observed glyph height is19px; proposed18px leading fails the nonoverlap gate.
No heavy-font native candidate was captured at18px. Freeze the four-case batch
at80px module pitch with four lines/module,20px leading, preserving native20px
type. Arial Black measured17px maximum height. Actual requested faces are present.

Some cell-edge antialiasing from a neighboring atlas glyph contaminates horizontal
ink bounds by one edge pixel. Retain the raw atlas; use the independent native
Canvas ascent/descent and observed vertical envelope for overlap gating. Do not
claim those horizontal bounds precisely measure individual glyph overhangs.

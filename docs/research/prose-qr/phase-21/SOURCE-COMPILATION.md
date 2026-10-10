# Native source-color compilation before capture

The producer preserves its metric-based provisional HTML in the config. Before
any native PNG, the renderer measures actual DOM span midpoints after native
justification, then assigns the same two specified source foreground colors
from those positions. No image or decoder has been consulted. This is source
layout/color compilation only, never pixel repair. Save the original HTML and
the final compiled native HTML separately, plus native span source positions.
Native word bytes and font/spacing remain identical. All backgrounds must be
transparent and all foregrounds must be visible #000/#767676. Capture and repeat
the final saved compiled HTML, not the provisional version. Platform font is
checked on a native letter span, and source foreground contrast is recorded.

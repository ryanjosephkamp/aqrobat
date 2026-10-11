# Visible native corner-glyph amendment

Batch 04 has 8 native captures and 0 ordinary recoveries. The passive jsQR
diagnostic sees only 2 or 3 wrong source-aligned cells in its radius-zero cases,
but chooses a small letter cluster as one corner. Installed jsQR source scores
absolute run-length errors; the single square glyph's imperfect proportions
become a substantial error at the 336px native size.

Test a visibly explicit two-character corner ornament: a native outline square
and a smaller native filled square in its empty center. Neither character covers
the other, and no module, image or background is placed behind story letters.
These ornaments are a clear visual concession from band-023's all-letter field,
not evidence that a pure paragraph scans. Preserve this distinction in handback.

Amend the resource ceiling from 9 to 10 for one combined native measurement atlas
containing outline-square variants and a filled square. It has one native capture
and one exact repeat, actual font-face records, and zero reader calls. Use its
measured bounds to place the two foreground characters. Candidate, control,
byte and deadline limits are unchanged. Freeze each subsequent batch before
native captures. All old attempts and their exact sources remain intact.

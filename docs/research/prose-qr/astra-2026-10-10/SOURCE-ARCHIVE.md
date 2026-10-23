# Exact executed source custody

`source-archive.json` initially mapped 227 pre-format source/evidence entries to
210 content-addressed gzip snapshots. Four later entries preserve the verifier,
layout-audit plan/script, and previous current handoff, for231 entries and214
distinct snapshots in the closing catalog. Decompression yields their original SHA-256
bytes. These include the preregistered plans, executed scripts, raw JSON receipts,
and rejected sources. Repository formatting subsequently changed some current
textual files; it did not replace their executed versions.

The 28 rendered HTML/SVG source files retain their exact bytes with `.txt`
appended to the filename. This keeps formatting tools from changing whitespace,
selection, or layout in a native acceptance source. The `aliases` table maps
each original path to its retained path and hash. Copy or download the exact
bytes under the original extension to inspect them; do not rerun a sealed script
in an old output directory. Original source filenames also remain represented
in their executed manifests and snapshots.

Every PNG remains unchanged. Exact immediate repeats were compared in memory
and recorded by hash; duplicate repeat PNG files were not stored. This is a
repeat receipt, not a newly repeated capture during final verification.

`verify-run.py` independently checks snapshots, aliases, source references,
PNG and RGBA hashes, repeat receipts, reader-slot denominators, full/summary
passive agreement, saved stock-return agreement, metric arithmetic, and fixed
gate conjunctions. It makes no new acceptance reader or renderer calls. The
prior-custody verifier separately checks the historical inventory and downloads.

Only the two new run directories are included in the first milestone. All
product, extension, vendor, download, and older research files are preserved.

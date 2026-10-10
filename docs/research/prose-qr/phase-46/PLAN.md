# Phase 46 — two additional ordinary readers, read-only

Preregister exactly four calls: Apple Vision's default barcode request and the
retained default ZBar scanImageData wrapper, each receiving the unchanged full
phase 45 native PNG and one conventional URL control. No new native source,
cropping, resizing, pixel edits, geometry, reader setters or acceptance tuning.
Compare exact https://example.com/ only after each reader returns. Preserve
returned payloads, errors and any unattempted call; no selective retry.

Verify PNG/RGBA hashes against phase 45 receipts first. Vision uses the URL image
handler with an empty options dictionary and a default VNDetectBarcodesRequest.
ZBar uses the already retained package/source/WASM from phase 26, no new install,
with no scan options. The 500 MB transport bound only accommodates the existing
full native RGBA input; it is not a reader parameter. Run readers sequentially,
after phase 45's task-owned job finishes. Memory check before ZBar. Retain source
hashes, raw Vision JSON before formatting and every result. Four calls are two
implementations, not four independent engines.

Use fresh exclusive vision-01 and zbar-01 directories. Logical cap 400,000 bytes
including source; no PNG/RGBA duplication or new native sweep. The source is
fabricated regular black words on a large text page, not natural prose or normal
page usability. Native stroke gates, error-reporting symbols and initialization
replicas remain separate. No failed image becomes a phone candidate. No new phone
results, releases or messages. Preserve all existing boundaries and OPEN draft PR
1; npm private. The prose goal remains unsolved.

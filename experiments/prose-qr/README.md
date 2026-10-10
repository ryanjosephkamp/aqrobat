# Prose-QR experimental harness

This directory is isolated from Aqrobat's product/extension. The first pilot's
report and frozen evidence are in `docs/research/prose-qr/`; open its `index.html`
for manual review. No AI runtime or runtime dependency was added.

The recorded pilot used the exact initial source archived as
`pilot-02/run-executed.mjs.txt`, then the explicit diagnostic and continuation
helpers. `results.jsonl` is append-only; interpret the latest receipt per ID,
without dropping the prior partial receipt. `final-analysis.json` summarizes the
complete denominator. All negative results remain available.

## Files

- `vocabulary.mjs`: original short English words and ordinary-text negative control.
- `layout.mjs`: strict/assisted specifications, actual text rendering, conventional
  positive controls. Only the controls contain solid QR modules.
- `decoders.mjs`: pinned jsQR and locally loaded ZXing WASM, exact string comparisons.
- `run.mjs`: exclusive new output directory, calibration, metrics, fixed grid,
  screenshots, per-case logs, storage/time guards. Current version fixes the
  reporting reserve and compresses replay HTML before storage.
- `finish.mjs`: diagnostic transforms and two structural URL follow-ups.
- `continue.mjs`: lossless replay archival and only missing cases/scales.
- `summarize.mjs`: verify raw PNG hashes, full-grid counts, border/overlap metrics.
- `url-controls.mjs`: conventional URL controls, outside the candidate denominator.
- `board.mjs` / `review-template.html`: self-contained original/live review board.
- `layout.test.mjs` / `review-check.mjs`: structural/custody checks and synthetic
  manual-board checks. Synthetic notes are not owner scan observations.
- `verify-evidence.mjs`: retained denominator, raw PNG hashes, source receipt,
  compressed replay, diagnostic count, and board-receipt reconciliation.

The diagnostic/continuation/report helpers are intentionally bound to this
pilot's paths; do **not** rerun them over frozen evidence. To inspect a replay,
gunzip its `.html.gz` into a separate temporary file and open that file. Its
font/geometry depend on the recorded platform; a rerender is a new condition.

## Verification without another search

```sh
npm ci --ignore-scripts
node --test experiments/prose-qr/layout.test.mjs
node experiments/prose-qr/verify-evidence.mjs
node experiments/prose-qr/review-check.mjs
npm test
npm run build
npm run test:browser
npm run test:text-browser
npm run format:check
```

The browser checker uses a fresh headless context and writes only its own scoped
verification artifacts. Font files and the Chrome executable must already exist
locally. It does not operate Gmail, an installed owner extension, or a phone.

A later **explicitly selected** reproduction can run the current `run.mjs` with
a never-used output directory. For example:

```sh
node experiments/prose-qr/run.mjs /absolute/new-evidence-root/pilot-new
```

The parent directory must exist and be dedicated to that new approved run.
Existing output directories are rejected rather than overwritten. The runner
counts sibling evidence against its cap; running alongside this frozen 44-MB
pilot will stop early. The helpers need a deliberate new path/configuration for
an exact future reproduction. Do not reinterpret a rerun as the old receipt.

This first pilot is finished. A coherent-paragraph search, more candidates,
different fonts, crops, or an agent wording search requires the next owner choice.

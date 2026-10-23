# Empirical handback

Experimental work stopped after the parent independently inspected and rejected the faint gray228 source. No native candidate qualifies. One exploratory slot remains unused; this document does not authorize a new run.

- Start with `REPORT.html`, `handoff.json`, and the complete 24-row `batch-summary.json`/CSV.
- `verification-04.json` contains 688 recomputed evidence checks; `final-checks.json` adds closing source, formatting-exception, report, provenance and denominator checks.
- Raw ordinary stdout/stderr, exact source aliases, original PNGs, immediate repeats and lossless full passive profiles remain under their frozen batch paths.
- `runtime-provenance.json` maps actual CDP native names to installed font-file versions/hashes; the Skia variable descriptor remains unresolved.
- `reader-accounting.json` separates 37 ordinary calls, 11 instrumented passive APIs and 27 nested matrix-decoder calls. Their conservative overlapping sum is 75. Source binarizer diagnostics remain separate.

Evidence verification can be reproduced from the repository root with:

```sh
node experiments/prose-qr/integrated-2026-10-10/empirical/verify-v4.mjs
```

This invokes no browser, QR reader or passive profile. It recomputes retained custody and writes the closing `verification-04.json` receipt; copy the receipt beforehand if preserving its final handback timestamp/hash is required. It never rewrites captured source/PNG/raw reader evidence.

The exercised full-candidate runner is `run-batch-v6.mjs`; all actual batches retain their exact runner hashes. `run-batch-v7.mjs` adds an inclusive reader guard and optional historical same-run control validation. Those new branches were syntax checked but never exercised because no final native source was selected. The resource runner `run-resources-v5.mjs` preserves all declared phase grids and pauses for actual-image readability review.

Frozen batch paths are not retry targets. Source changes, amendments or reruns require a fresh source, a new preregistration and explicit remaining authority. Old deadlines and source hashes are intentional evidence, not defaults to bypass.

Executed/preregistered source and JSON evidence have narrowly recorded formatting exceptions. `format-locked-final.json` and `format-docs-final.json` identify every warning by exact live-byte hash. No formatter was applied to sealed evidence to make a global check green. Fresh sources and closing reports were checked separately. Product files, encoder and its inline MIT license remain exact baseline; no product build or platform acceptance was inferred.

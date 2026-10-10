# Aqrobat 0.4.0 browser insertion checkpoint

October 7, 2026. Paused at the owner's request. [Detailed receipts](validation.json)
preserve the test scope and negative decoder results; 0.3.0 receipts remain archived.

- `npm test`: 18 tests passed, including saved-library validation, measured spacing,
  core behavior, and isolated extension injection authorization.
- `npm run build`, `npm run format:check`, `npm run test:browser`,
  `npm run test:text-browser`, `npm run test:insertion`, and the installed-extension
  test passed during this turn. Final text/insertion browser checks and the installed-extension check followed
  the emoji table-height fix and packaging cleanup.
- Browser insertion checks cover four palettes, retained drafts, actual whitespace,
  native Undo, rich 328 px layouts, and refusals for unsupported fields, insufficient
  width, selected text, changed drafts, and cancellable input-event vetoes.
- Real Chrome for Testing toolbar interaction verified saved hash insertion in plain
  and rich fields and actual keyboard Undo in a fresh task-owned profile. Its recorded
  source SHA identifies the pilot before the final emoji table-height fix. Owner profiles
  were untouched; test-owned browsers and profiles were cleaned up.
- Independent jsQR 1.4.0 probes of actual rich inserted rasters recovered **1/4**
  payloads (black circle); measured plain preview rasters recovered **0/4**. Existing
  image and ordinary text probe negatives remain in the archived receipts. These
  results do not establish phone scan reliability.

The owner reported successful RTF review and unsuccessful clipboard formatting in
TextEdit. Direct browser insertion now offers saved recipes and destination font
measurement, while native apps continue to use RTF. Emoji table blank cells no
longer inherit the editor's font height. Core encoder, image rendering, and the
RTF generator are unchanged by this phase.

**Acceptance remains open.** No new phone/print or real external email/blog tests
were performed. Plain text still cannot retain destination font styles. The current
installed extension must be reloaded and reviewed by the owner. PR #1 remains draft;
npm remains private and unpublished. No other chat/agent, merge, or Store submission.
See [pause checkpoint](PAUSE-2026-10-07.md) for the safe continuation boundary.

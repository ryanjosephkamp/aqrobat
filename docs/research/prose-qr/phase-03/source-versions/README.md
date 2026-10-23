# Executed source custody

These files preserve versions used before later formatting or command-line
generalization. Batch manifests pin their actual source hashes; the verifier
accepts the current source or a retained byte-identical executed snapshot.

- `capture-executed.mjs.txt`: original helper used by color/plain/refinement/font
  color/word batches, before format-only cleanup. Compact uses the current helper.
- `options-executed.mjs.txt`: first 30-input, 300-attempt option sweep.
- `options-followup-executed.mjs.txt`: 12-input, 120-attempt word follow-up.
  The current options script ran the eight-input compact follow-up.
- `plain-01/` retains its aborted original renderer, runner, and helper.
  `refine-01/refine-executed.mjs.txt` preserves the refinement runner.
- Each `txt-*-proof/` directory retains its own executed proof script. The first
  `txt-proof/` uses the corresponding naming pattern and includes a source receipt.

Later source changes did not overwrite original evidence or rerun failed batches.

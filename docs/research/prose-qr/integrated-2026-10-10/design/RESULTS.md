# Construction handback

The two measured native prose mechanisms did not yield an ideal-radius construction or ordinary-reader recovery. This is a finite result for the frozen layouts and whole-glyph style model, not a proof about all readable native prose.

The exact payload is `https://example.com/` (20 UTF-8 bytes). The pinned encoder and license are unchanged. No native HTML contains a target matrix, QR image, module backgrounds, hidden characters, duplicate text or a replacement font. Canonical target matrices/codewords are separate arithmetic references. Arbitrary after-terminator padding is explicitly noncanonical and was investigated only as a mathematical construction hypothesis; no such native candidate reached a reader trial.

## Evidence ledger

| Batch               | Frozen input                                                                     | Attempted | Result                                                                                                                                                                                                |
| ------------------- | -------------------------------------------------------------------------------- | --------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| measured-01         | V10 empirical construction-02                                                    |      0/32 | Input field-contract failure: quiet samples named `base`, solver required `logical`. Original input and all 32 unattempted rows retained.                                                             |
| measured-02         | Same V10 input, explicit field rename only                                       |     32/32 | Exact canonical and exact noncanonical affine constraints inconsistent in every case. No ideal-radius solution. Earlier data-only prefix bound excluded 31; one deterministic greedy route exhausted. |
| measured-03-closure | Same original V10 native samples                                                 |     32/32 | Adding ECC parity belonging to wholly fixed data blocks excludes all 32 within-radius alternatives.                                                                                                   |
| measured-04-v5      | New 106-character V5 prose and actual native captures, empirical construction-05 |     32/32 | All 32 exact canonical/affine systems inconsistent and all 32 immutable closure bounds exceed the declared ideal radius.                                                                              |

The adapters preserve every sample coordinate/value and rename only quiet `base` to `logical`, also copying the declared geometry polarity. Earlier mechanical failures are not silently repaired or erased. The empirical lane separately retains its ownership-support failures and renderer/reader stops; this lane does not duplicate its audit.

## V10 result

The residual-ranked canonical target was V10-H mask 2. Its eight block symbol-error counts were `42,43,43,43,42,41,43,44`, each against radius 14. There were 170 function-cell mismatches and 340 dark samples among 976 supplied quiet-ring samples. The immutable closure proves at least 42 wrong codewords in the first block for that target, including fixed parity. The whole first block has 15 fixed data bytes and 28 fixed ECC bytes. Across the eight H masks its lower bound is 42–43 against radius 14.

The empirical worker reported that the actual mixed-style projection matched all 3249 predicted literal samples, preserved source/selection/fonts/repeat custody, and returned no result in all three ordinary readers. Its canonical conventional control returned the exact URL in all three. The unchanged strict gate failed balance/span/stability. Those are empirical-lane results, not new design-lane measurements.

## Changed V5 mechanism

The independently frozen new prose is:

> One word or two can tell a story.
>
> We read the words. A camera reads the ink.
>
> Our words, too, should survive.

It has 106 source characters and 110 characters with the exact two-LF paragraph separators. Its source generator is `prepare-v5.mjs`; the source/spec and two HTML states are in `v5-short-prose/`. Actual capital O characters at the two paragraph openings and the final o of the opening phrase supply the three corner roles. The actual final o of “too” in the final paragraph is the distinct alignment-role hypothesis. Words remain in source and ordinary row order. New body geometry and scaled alignment geometry were marked unmeasured before empirical capture.

At pitch 6.5 and origin 64, version 5 has 37×37 module centers, 290 function cells, one alignment pattern and no version-information cells. Version 10 had 57×57 centers, 481 function cells, six alignment patterns and 36 version-information cells. Those are exact structural counts; they do not imply feasibility. Complete large glyph ink still intrudes into the nominal quiet ring; the single uniform black article field retains it visibly.

The V5-H prefix fills the first two 11-data-byte blocks. Each has 22 fixed ECC bytes too, making 33 immutable codewords against radius 11. The actual map proves all 33 wrong in each of those two blocks for the selected H-mask-7 target. V5-L/M avoid wholly fixed parity blocks but still have at least 21–22 wrong fixed prefix codewords against radii 13/12. All 32 ECC/mask alternatives fail the local necessary bound.

The residual-ranked canonical V5 target was H mask 7: symbol errors `33,33,33,33`, each against radius 11; 108 function mismatches (finder/separator 63, format 18, timing 21, alignment 6); 637 total module mismatches; 203 dark among 656 supplied quiet samples. It is an out-of-radius projection, not an encoded native embedding.

The empirical worker reported that this projection matched all 1369 literal predicted samples and preserved source/selection/font/repeat custody. The canonical control recovered the exact URL in all three readers; the native projection returned no result in all three. First-selected normal geometry had intended dimension 37, but the strict gate still failed balance/span/stability. The selected alignment location differed from the intended location. These independent native observations remain in the empirical receipts.

## Construction API

`padding-solver.mjs` exports:

- `construct(version,ecc,mask,dataOverride)` for the exact canonical byte-mode payload, observed full codewords, RS block/interleave ownership and every cell's function/data/ECC/remainder role.
- `fitCanonical(input)` for honest whole-source-glyph regular/bold choices and a complete residual ledger.
- `solve(input)` for a coupled GF(2) affine system. Successful output includes full data/ECC codewords and native style IDs; failure includes a verified XOR contradiction. `padding:'post-terminator-affine'` changes only explicitly owned after-terminator pad bytes.
- `constructWithinRadius(input)` for a bounded, deterministic whole-codeword relaxation. Failure of that heuristic alone is not impossibility.
- `immutablePrefixBound(input)` for the original systematic-prefix-only bound.

`immutable-closure.mjs` adds `immutableClosureBound(input)`, including every ECC codeword whose complete RS data block is fixed by the prefix. It conservatively omits potentially fixed bits in partial-block parity. A wrong locked bit or contradictory requirements on one whole-glyph state proves its codeword erroneous. The bound is necessary in the sampled affine model only. Unknown-symbol radius assumes ideal ordinary QR decoding of sampled bits, without erasure side information. Locator, binarizer, resampling, function and quiet defects are separate.

The finite V10 and V5 drivers freeze input/source hashes before their cases, preserve all denominator rows, and never call a reader, locator, binarizer, renderer or app. The native sample map has one state per real source glyph; overlapping support is locked conservatively by the empirical owner. A difference between full regular and full bold adaptive binarizations is not treated as an independently composable per-glyph state.

## Source custody and validation

The original solver remained frozen at SHA-256 `8eaaa74ed8b74d809a4cd459f59e835f9decce2588da31b75bb6beb0de8a59fa` throughout both measured construction batches. The current closure module used for V5 is `1c223bf29e5eb0616cea2231ce7bdc8cc0078f386a3d62c456ece56d0f5df166`.

A formatter was applied to the closure module after measured-03 and before measured-04. This changed source bytes without changing the algorithm. The exact earlier source is archived at `measured-03-closure/immutable-closure.frozen-source.mjs.txt`; its hash `77a998ab70e0a91031a4a8aecdb72be7b01c81c73744b0a218aefc5ca09afaad` matches the measured-03 preregistration. The original and current versions are both preserved. No measured-03 results or preregistration were rewritten, and V5 froze the formatted version before use.

Fourteen pure tests pass, covering pinned canonical agreement, full cell/codeword ownership, synthetic altered-padding recovery, real-glyph state coupling, verified contradictions, field rejection, radius accounting, parity closure and exact changed-prose serialization. These tests do not establish readable rendering or native recovery. The separate final log and scope/hash manifest contain the current receipts. Frozen sources are not reformatted after use; any formatting-check exceptions are reported separately.

Design-lane allocation: zero captures, zero screenshots, zero browser/native-app launches, zero readers/locators/binarizers, zero new glyph measurements, zero installs/downloads/models, zero Git mutations. Product files and all other lanes remain untouched. Model billing/Fast status was not verified. No further captures, target swaps, agents or research were started by this lane after handback.

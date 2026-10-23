# Native prose payload construction

The concrete route is to fit an encoded matrix to **measured ink of continuous, coherent native prose**, rather than draw a matrix and place prose on top. Every body style variable belongs to a real source character. Changing one variable changes all measured module samples affected by that whole character. Native O/o finders, their extra ink, actual paragraph spaces and empty page areas remain part of the constraint system. A solution supplies a font/style recipe for the actual source; it supplies no native QR rectangles, image layer, hidden text or clipped glyphs.

This design lane used no renderer, glyph measurements, captures, locators, binarizers or readers. The empirical lane owns all such observations and any later source render. The payload objective is not established by this package.

## The three finite construction modes

1. **Canonical matrix fit.** The exact URL, canonical padding, Reed–Solomon parity, format, version, timing, alignment and finder structure are fixed by the existing encoder. `fitCanonical` chooses between the two measured native styles of each real character to minimize module-center disagreements. It reports every residual function-role disagreement and every affected codeword in its original RS block. No residual is repaired in the image.
2. **Exact affine diagnostic.** `solve` tests whether the measured native style model can equal a complete encoded matrix at every frozen sample center. Canonical mode has no free padding. A separate authorized hypothesis permits changing only bytes **after the exact URL, terminator and byte boundary**. That mode is explicitly noncanonical; ordinary-reader acceptance and standards conformance are unknown. Reed–Solomon parity remains computed by the pinned encoder. Unsatisfiable equations return a verified XOR dependency yielding `0 = 1`, which falsifies only that frozen geometry and style model.
3. **Bounded residual construction.** `constructWithinRadius` retains every native function/remainder disagreement, then attempts to fit encoded data while allowing at most `floor(ECC bytes / 2)` erroneous codeword symbols in each block. It drops whole codeword constraints using a fixed greedy rule and stops at the declared round/operation caps. A returned plan has an explicit ideal-grid symbol-error ledger; it is an exploratory payload hypothesis, not a locator, binarizer, gate or decoder result. A failed greedy route does not prove that all error allocations fail.

The matrix in any output is an **encoded target and conventional-control input only**. It must never be painted behind the native text. The actual native artifact is created solely from the real text and the returned whole-character style choices. Its pixels must be captured and checked again; a recombined regular/bold source is a new source, not a previously observed image.

## Exact payload and information budget

The pinned encoder's byte-mode representation of `https://example.com/` contains exactly **20 UTF-8 bytes**. Version10 uses a four-bit mode field, sixteen-bit byte count, 160 payload bits and four zero terminator bits: **184 fixed bits / 23 bytes**. No payload byte, slash, case, terminator or count is adjustable. Overflow is rejected.

For version10-L, dimension57:

| Component                       | Exact arithmetic                                                                                |
| ------------------------------- | ----------------------------------------------------------------------------------------------- |
| Data codewords                  | 274 bytes / 2192 bits                                                                           |
| Fixed prefix through terminator | 23 bytes / 184 bits                                                                             |
| Post-terminator padding         | 251 bytes / 2008 potentially free bits, noncanonical mode only                                  |
| RS parity                       | 72 bytes / 576 bits                                                                             |
| Blocks                          | Four, with 18 parity bytes each                                                                 |
| Ideal symbol-error radius       | Nine codewords per block; 36 total, never transferable between blocks                           |
| Native function modules         | 481, including finder/separator192, format30, version36, alignment150, timing72 and fixed-dark1 |

Padding changes cannot change function modules. Their apparent abundance also does not make pixels independent: every parity bit depends on bytes in its own block, and all samples belonging to a source character share one style choice. The solver counts only groups that actually toggle at a supplied sample as active native variables; unused declared characters add no apparent capacity. More variables than constraints does not prove feasibility, and fewer does not prove failure because equations may be dependent. Exact rank/certificates settle the supplied affine model.

The full 160-cell version/ECC capacity table and eight canonical version10-L masks are saved as pure encoder arithmetic. Neither file contains native measurements or acceptance evidence. Smaller versions are possible if their physical line layout remains readable; version1 cannot hold this exact byte-mode URL and is rejected. A larger symbol creates additional compulsory alignment/version structure as well as capacity, so dimension growth is not free design space.

## Native sample contract

The empirical owner supplies `aqrobat.native-module-constraints.v1`: the exact URL, version, ECC, mask, complete source/capture hashes and frozen geometry. `samples` must contain every coordinate `(x,y)` exactly once for a complete model. `base` is the logical intended QR bit measured from native style0 at the frozen module center. A `toggle` is present only when measured native style1 differs at that same sample, and its `group` identifies a real paragraph/code-point index. A group may instead be an explicitly declared larger text unit, at the cost of fewer degrees of freedom.

The two states must both be visible, readable native text. Regular/bold weight or a visible stroke is preferable to a faint-color state. White/transparent text on white, duplicates, pixel-wise control, custom glyph substitution and clipping are excluded. Font advance changes must not silently move the sample geometry. More than one independently styled glyph affecting the same sample is outside this affine schema and must be rejected or modeled separately; nearest-character attribution is not evidence of unique ownership. Actual native finder ink outside seven-module boxes must be retained.

Polarity is explicit. A logical complement changes the required external quiet ring too: raw white becomes logical black. A uniform visible reverse-text field is a distinct native style hypothesis; it is not a patterned QR background and must be measured separately. Supplied quiet-ring samples are reported even when dark. Omission leaves quiet-ring evidence unmeasured. Zero dark center samples is not a whole-pixel quiet-zone proof.

`sample-contract.json` is an illustrative schema, deliberately incomplete and rejected as a complete solver input. No illustrative bit or geometry is represented as measured.

## Implementation and use

The research module imports the unchanged pinned `vendor/qrcodegen.mjs`. A subclass observes the encoder's function grid, input codewords and interleaving without modifying its methods. The library itself computes parity and matrices. A separate ownership map is checked against its actual output. Affine parity coefficients are computed with the pinned GF(256) remainder/multiply methods. Generated codewords are passed back through the actual encoder, and every returned sample constraint is checked again.

```sh
node experiments/prose-qr/integrated-2026-10-10/design/solve.mjs INPUT.json FRESH_OUTPUT.json
node experiments/prose-qr/integrated-2026-10-10/design/solve.mjs INPUT.json FRESH_FIT.json canonical-fit
node experiments/prose-qr/integrated-2026-10-10/design/solve.mjs INPUT.json FRESH_RADIUS.json radius
node --test experiments/prose-qr/integrated-2026-10-10/design/padding-solver.test.mjs
```

The CLI refuses to overwrite an output, records exact input/source hashes and checks canonical parity with the stock high-level encoder first. APIs `construct`, `canonicalData`, `verifyCanonical`, `solve`, `fitCanonical`, `compareNative` and `constructWithinRadius` are available to the empirical harness. A complete successful exact solution includes full data/interleaved codewords, original block ownership, matrix, native style states and unchanged-prefix receipt. A contradiction includes actual module coordinates and an independently recomputed XOR certificate. No code invokes a reader or renderer.

## Finite handoff to the empirical owner

Freeze one coherent article and its exact two-LF paragraph separator policy as a distinct source candidate. Use its measured full-source regular/bold states at fixed positions. Version10-L, pitch6.5 and origin(64,64) are the empirical lane's current geometry, not a new design measurement or mandatory final choice. The newly measured O/o ink extends beyond nominal boxes; its actual samples and quiet-zone defects must remain visible.

For one complete sample input, consider masks0–7 in that order using only deterministic arithmetic. Retain canonical fit, exact canonical/affine outcomes and any bounded radius trace for all attempted masks. The first radius construction meeting its ideal data bound is a possible source recipe. If none meets that bound, retain the best canonical fit only as a limited exploratory proposal, with its full excess/error ledger. Never label an infeasible model a native exact matrix.

Before a native reader trial, the empirical owner must freeze a new batch with the actual generated source/style plan, control matrix/codewords, full denominator, reader order, cap accounting and stop conditions. Require a canonical conventional control at the same geometry. If padding is changed, require an additional conventional control with the **exact changed codewords** and exact URL. A wrong payload or invalid control stops that batch. No synthetic control recovery establishes native eligibility.

The native proposal must pass visible-source integrity, exact per-paragraph/full-document local selection and immediate source/repeat custody before any authorized exploratory reader call. Its every-record strict native gate remains unchanged and separately reported. Owner scanning requires the exact URL from two independent ordinary implementations on unchanged native input, custody/repeat parity and source selection, plus actual source/PNG handoff and explicit gate status. Phone, print, styled clipboard, plain clipboard and native-app transfer stay distinct and unobserved until exercised.

## Verification and limits

Pure tests cover canonical byte-mode parity against eight masks at selected versions/ECCs including version40; complete function/codeword ownership; synthetic full-matrix affine recovery across unequal blocks; exact URL and overflow rejection; tied native style variables; verified contradictions; function residual retention; and bounded route exhaustion. These tests use synthetic matrices, never glyph pixels, and therefore establish algorithm plumbing only.

No pure solution can establish that an ordinary reader selects the intended finders, samples these centers, produces these binary values or recovers the URL. No count or certificate proves a general impossibility for readable prose. Measurements requiring the empirical lane remain explicitly unverified here. Fast/model billing behavior is unverified. Earlier clocks, products, downloads, licenses and source failures remain intact.

## Closed measured construction results

See [RESULTS.md](RESULTS.md) and the final `construction.json` results ledger. The V10 and changed V5 whole-glyph mechanisms each completed32ECC/mask alternatives with zero ideal-radius constructions. Immutable closure includes fixed parity, excluding all32alternatives in both maps. Both empirical native projections returned no ordinary-reader result while their canonical controls recovered the exact URL in allthree readers. These are finite frozen-model results, not generic impossibility. This lane is stopped at the parent's request after handback; no additional routes/captures are authorized by this document.

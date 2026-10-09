# Prose-QR feasibility proposal

October 8, 2026. **Planning only; no prose candidates, metrics run, or new decoder
installation has been performed.** This phase starts only after Ryan selects it.

## Goal

Build real selectable words whose visible arrangement is recognized as a QR code
by an ordinary scanner. Progress from real-word blocks to grammatical sentences
and then coherent prose. Measure three independent qualities: meaningful reading,
QR recovery, and how obvious the QR pattern looks. Success on one does not imply
success on the others. No claim of novelty, invisibility, or security is made.

Aqrobat currently puts glyphs in dark QR modules and blanks in light ones.
The new problem is harder: ordinary prose puts ink throughout its lines. Choosing
letters by total darkness alone cannot establish the required spatial pattern.
My inference is that region-by-region ink placement, word boundaries, line breaks,
and font metrics matter more than a simple list of “good letters.” Standard QR
layout also asks for a clear four-module border.
[DENSO WAVE margin guidance](https://www.qrcode.com/en/howto/code.html).

## Two tracks, separate outcomes

1. **Strict text:** actual letters, ordinary punctuation, real words, legitimate
   spaces and line breaks; one standard font, uniform size, weight, and color.
   Word selection and arrangement are the variables. No custom font or glyph
   deformation. Even this track needs a specified font/line layout; universal
   paste portability is not assumed. Record conspicuous gaps and forced word choices.
2. **Typography-assisted text:** the same real-word requirement, with explicitly
   recorded weight, size, or spacing changes. Keep words selectable and report
   every styling dependency. No image masquerading as text. Color variation or
   custom/deformed glyphs would require a separate later choice, outside this pilot.

Neither track may hide solid QR modules under the text, substitute conventional
QR squares for the corner patterns, or count custom FontCode-style decoding as an
ordinary QR-camera pass. Do not fold this experiment into the extension.

## Bounded first pilot, after approval

Use this existing chat and Aqrobat checkout. Start with `AQROBAT-TEST`, a short
payload, and conventional QR controls; add a URL after a promising structural
result. The visible words need not spell that payload. Start with Menlo and
Courier New already available on this Mac. No font download, training, GPU job,
or corpus purchase is needed.

1. **Calibrate:** reuse pinned jsQR 1.4.0. Verify and pin one independent ZXing
   implementation/version/license before adding a development-only dependency.
   Run clean QR positive controls and text-only negative controls. Measure
   font-specific glyph and word ink coverage, advance, and baseline with a small
   original word list. The current package remains private with no AI runtime.
   [jsQR](https://github.com/cozmo/jsQR) ·
   [ZXing WASM](https://github.com/Sec-ant/zxing-wasm).
2. **Real-word structure:** generate at most **128 candidates per track**, across
   the two fonts in total. Render at three recorded display scales (initially
   320, 640, and 960 px). Evaluate the actual DOM raster with both decoders and
   compare recovered strings to the exact expected payload. Log every outcome,
   including failures. Glyph-density scores guide search but are not scan evidence.
3. **Diagnose:** blur, downsample, threshold, and crops may help explain results,
   but record them separately from the unchanged visible output. Reconstructing
   the known binary QR matrix is never a candidate pass. Keep full-block and
   crop outcomes separate, including whether a clear border was available.
4. **Hand back:** provide a small HTML board of the strongest candidates and
   honest negatives, original text/styles, raw screenshots, parameter/result JSON,
   and a short conclusion. Human review scores word quality and how much it looks
   like normal prose. Samsung Camera and the dedicated QR scanner are separate
   observations; physical print can wait. Recognition of a link without an exposed
   raw string remains phone recognition, not exact software-payload evidence.

Stop the first pilot at **60 minutes of execution or 50 MB of generated evidence**,
whichever comes first; retain attempted-case receipts. This is a checkpoint, not
a verdict that the idea is impossible. If a dependency/control cannot be verified,
report that and do not fabricate an independent-decoder result. Commit and push
verified milestones to the existing draft branch; no force push or release.

**Meaningful sentences and a coherent paragraph are later stages**, selected after
this pilot’s evidence. A bounded model-assisted wording search could help then;
the QR encoder, renderer, and decoder checks remain programmatic. No agent swarm
or new chat is needed for the first pilot. Stay on the current model/effort for it.

Proposed paths: `experiments/prose-qr/` and `docs/research/prose-qr/`. They have not
been created. Existing generation and insertion behavior stay outside that scope.

## Opened prior work

This is a small starting review, not an exhaustive novelty search. I reviewed the
following project descriptions/abstracts, not their complete experiments:

- **Optimized Text Embedding in QR Codes based on Textual Layout and Structure
  Analysis** (Yu-Jen Fang, National Tsing Hua University, 2016): combines text/word
  art with QR images using layout analysis and character deformation. This is close
  to the visual objective, but the abstract does not establish a natural paragraph
  made only from unchanged standard-font letters.
  [University thesis record and abstract](https://etd.lib.nycu.edu.tw/cgi-bin/gs32/hugsweb.cgi?o=dnthucdr&s=id%3D%22GH02103062549%22.&searchmode=basic).
- **FontCode:** hides data through glyph perturbations and uses its own decoding
  system. Useful adjacent work, not evidence of ordinary-camera QR recovery from
  readable prose. [Official project](https://www.cs.columbia.edu/cg/fontcode/) ·
  [Columbia’s explanation](https://www.cs.columbia.edu/2018/fontcode-hiding-information-in-plain-text-unobtrusively-and-across-file-types/).
- **Text2QR** (2024): generates aesthetic QR images from text prompts using diffusion
  and refinement. “Text-guided” here means prompts for imagery, not a paragraph
  made of ordinary words. [Primary paper abstract](https://arxiv.org/abs/2403.06452).

These sources suggest possible techniques, not a promise that our stricter goal
will work. Corner detection and light-region contrast are key questions for the pilot.

## Recommended approval prompt

```text
Execute the prose-QR feasibility plan in
/Users/noir/Documents/aqrobat/docs/prose-qr-plan.md.
Run the strict-text and typography-assisted tracks separately, starting with a
short test payload. Keep the first pilot within its 60-minute / 50-MB / 128-per-track
limits, retain negative results, and deliver an HTML candidate board plus receipts.
Do not claim success from a reconstructed QR or processed diagnostic alone.
Keep all work in the proposed experiment/research paths, except the pinned dev-only
decoder dependency and its lockfile if needed. Preserve existing exporters,
extension behavior, original prototypes, Splashery, and the private PDF archive.
Use this chat; launch no other chats or agents. Commit/push verified checkpoints
on codex/aqrobat-foundation, keep PR #1 draft and npm private/unpublished, and do not
merge, send messages, deploy a new host, or submit to the Chrome Web Store.
Do not start the emoji atlas or migrate the project. Pause at the pilot handback
before expanding to coherent paragraphs or a second research phase.
```

Ryan can simply reply **“Execute the prose-QR feasibility plan”** to select these
defaults, or change them first. This planning request itself does not select execution.

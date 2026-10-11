# A three-hour research run for Sol

Planning handoff, October 10, 2026. This package starts no experiment, timer,
agent, automation, or model session. Ryan will switch to GPT-6.1 Sol and submit
the run prompt. The three-hour clock starts in that execution turn.

Open [the phone-friendly handoff](index.html), browse [the idea bank](IDEAS.md),
or copy [the full execution prompt](RUN-PROMPT.md).

## Recommendation

Use one GPT-6.1 Sol session at the current extra-high effort setting. Keep this
chat and the existing repository. There is no need to create another project,
use goal mode, or add agents for this bounded run. This is a workflow
recommendation, not a measured comparison of model performance.

Give Sol freedom to move between small, preregistered experiments without asking
for approval after each failure. Keep the existing scientific and preservation
boundaries. Three hours is a ceiling, including verification and backup, rather
than a requirement to consume the full window. A disconnection can still
interrupt an interactive run; frequent checkpoints provide recovery, not a
guarantee of uninterrupted execution.

## The change in direction

The research has improved parts of a finder, but a finder is only the component
that helps a reader locate the code. It does not yet carry the requested URL.
We need to solve two linked problems: a recognizable finder made from readable
letters, and enough controllable detail in the surrounding text to carry the
data at the same scale.

Prioritize these routes:

1. **Check the scale assumptions.** Compare the current counter-derived source
   pitch with complete native stroke runs and the dimensions returned by ordinary
   readers. Also calculate how many readable text lines can occupy the proposed
   data region. These are diagnostics, not decoding evidence.
2. **Change the letter topology.** Choose a very small set of genuinely different
   counter shapes or native letter combinations based on the failing diagonal.
   Do not repeat a large font, weight, position, or size search.
3. **Connect it to an article layout.** Test larger paragraph initials or drop
   caps with smaller, still readable body text. Alternatively test a finder
   formed by several readable words. These are different source constructions,
   not another page of repeated PILL words.

If the existing full-context structure and legibility gates pass, proceed to a
small exact-payload experiment and independent ordinary decoding. If they do
not, continue a different justified mechanism while budget remains. Do not ask
Ryan to scan finder-only controls.

## What is known, and what is only a hypothesis

Session D retained 15 native captures and 15 exact immediate-repeat receipts.
All strict structure gates failed; no new source encoded a payload. PILL had
stable central rows and improved balanced spans, but its worst true-diagonal
error was 0.5563, above the unchanged 0.35 gate. Its ordinary dimension was 113
versus the source model's 125. Nothing new is a phone candidate.

There is a concrete scale hypothesis to audit. PILL's saved glyph resource has
horizontal runs `[6,4,12,4,6]` and vertical runs `[4,4,9,4,4]`. Averaging their
total spans divided by seven gives 4.0714 pixels. With the saved horizontal
finder-center separation of 430.59375 pixels, `distance / pitch + 7` is about
112.76, near the ordinary dimension 113. This may explain part of the dimension
mismatch. It does **not** fix the diagonal, prove correct finder selection, or
justify retroactively relabeling a failed source. Any new source model must be
declared before rendering a fresh case. Earlier phases already used related
run-based models; this is a targeted audit, not a claim of invention.

The body-text question is equally important: the current 64-pixel letters and
roughly 108-pixel leading are much larger than a roughly four-pixel module.
That mismatch is a reason to measure spatial freedom before building another
payload. It is not a general impossibility proof.

## A useful stopping point

An automated candidate is ready for Ryan only when unchanged full native output
recovers the exact preregistered payload in at least two independent ordinary
implementations, including one outside ZXing, and survives a fresh native
render plus a local readability review at its stated display size. The
full-context structure gates remain in force. Record which readers failed too.

A normal-page paragraph is the preferred result. A legible but repetitive or
oversized structural example remains an intermediate result. A styled example
must be labeled styled; it does not solve uniform-black or unstyled prose.
Phone acceptance is still Ryan's later test. No phone success can be inferred
from automated decoding.

## Run limits

- At most 180 minutes including intake, verification, commit/push, and handback.
  Start no new experiment after minute 160; finish cleanup by minute 180.
- At most 24 new full native source proposals across the run, including rejected
  proposals and any payload cases; at most four payload proposals, conditional
  on the existing gates. At most one immediate repeat per captured case.
- At most 40 MB of new logical files in total, including source, reports,
  captures, diagnostics, and failures; normally at most 6 MB per fresh phase,
  never more than 8 MB when preregistered with a reason. Reserve 5 MB overall
  and at least 20 minutes for closing work. No evicting outcomes to make room.
- At most 24 small native glyph-resource renders, each at most 512 × 512.
  Full native captures at most four megapixels / 16 MB uncompressed RGBA.
  All resource renders, controls, profiles, and repeats have separate counts.
- One owned browser and one CPU-heavy job at a time; reuse installed tools and
  fonts. No downloads of fonts/models, new dependencies, paid services, or
  long-running background work. Use small bounded search spaces and timeouts.
- These are ceilings, not a target denominator. Preregister each small batch
  before execution, including its conditional and unattempted slots. If a
  budget cannot fit a useful next case, seal the work rather than bypass it.

## Planning verification and custody

Before writing this package, the checkout was clean on
`codex/aqrobat-foundation`, HEAD
`227eaff4da4bdd1c631d796048f076faffa4d249`, with origin
`https://github.com/ryanjosephkamp/aqrobat.git`. PR #1 was OPEN and draft at that
same head. npm was `private: true`.

All 89 direct references from the session D custody receipt matched, including
prior and phase receipt hashes, its report inventory, direct source references,
and all three product downloads. This planning check was **not** a fresh
recursive replay of every earlier source and pixel receipt. Sol must perform
the full required research intake before new experiments.

The session D custody receipt SHA-256 is
`aca329c7c021d217718bddc19fdd9951037629a61b3a9c8eda0dc789a16d07b7`.
All changes in this package are planning documents and their static presentation;
the sealed research, product, extension, and downloads remain unchanged.

## Primary sources consulted

- [Russ Cox, QArt Codes](https://research.swtch.com/qart): useful background on
  choosing encodings to fit an image. His illustrated URL technique appends a
  numeric fragment, changing the decoded string. It cannot be imported as an
  exact-payload solution here.
- [Nayuki QR generator API](https://www.nayuki.io/res/qr-code-generator-library/javadoc/io/nayuki/qrcodegen/QrCode.html):
  exposes version, mask, segment, and error-correction choices. Use the pinned
  local encoder; these are source choices, not permission to alter readers.
- [jsQR locator source](https://github.com/cozmo/jsQR/blob/master/src/locator/index.ts):
  a reference for the locator stages. For actual work, inspect the pinned local
  1.4.0 implementation rather than assume upstream master is identical.
- [Jim's TrueType QR Code Font](https://qr.jim.sh/): converts bracketed text
  into a QR-shaped rendering using font shaping. Interesting adjacent work,
  but the encoded letters do not remain a readable paragraph in the QR region.
- [ARTcode paper](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/09/ARTcode.pdf):
  a different visual coding system with its own receiver. Its reported results
  do not establish ordinary QR-camera compatibility for native prose.

All five links were opened during planning. One additional Eurographics PDF
could not be retrieved (HTTP 403); no conclusion in this package relies on it.

## Presentation checks

The HTML was checked at 390- and 1280-pixel viewport widths: no horizontal
overflow, page errors, or external requests; all 40 ideas and nine priority
entries were present; filtering and expansion worked. The embedded prompt and
download matched `RUN-PROMPT.md` exactly. A deliberately denied clipboard
selected the entire prompt as a fallback, and a mocked successful clipboard
received the exact text. Actual device clipboard behavior remains untested.

Repository formatting passed. No product source changed, so product build and
QR/browser/extension test suites were not rerun. The presentation check created
and closed its own headless browser. No research experiment, decoder call,
phone test, three-hour timer, or background research job was started.

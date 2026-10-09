## Summary

Copying QR characters into editors can lose their layout. Codex built Aqrobat
with deterministic text/emoji QR generation, image and styled-text exports, a
static demo, private package/CLI, and an unpacked extension using Make → Save →
Insert. Product version 0.4.2, its source, and original downloads remain unchanged
by the prose experiments.

Ryan rejected the first prose pilot's word tiles and illegible letters. The new
isolated continuation uses continuous lines, ordinary single word spaces,
natural font advances, and 20-pixel native type. **Configured standard ZXing
recovers `AQROBAT-TEST` from six unchanged native frames.** Their exported HTML
reproduces the original PNG hashes and payloads exactly. Foreground gray/weight
styling carries the signal; there is no hidden solid QR underlay.

This is a feasibility lead, not an accepted hidden paragraph. All 220 raw frames
from 64 completed layouts plus extra display views fail both baseline readers.
The native successes require different reader settings and grayscale typography.
The most readable success remains a large, repetitive 63-line story block.
[Text-first review](https://ryanjosephkamp.github.io/aqrobat/docs/research/prose-qr/phase-02/)
and [report/data](https://github.com/ryanjosephkamp/aqrobat/tree/codex/aqrobat-foundation/docs/research/prose-qr/phase-02)
separate the reflowed reading excerpt from the exact tested native geometry.

## Verification

Current checks pass 18 product unit tests, 3 experimental structural/custody
tests, Prettier, and Git whitespace checks. Build, site/image browser checks, and
text-export browser checks passed in a disposable source copy; all three rebuilt
product downloads match the preserved originals byte-for-byte. No owner profile
or installed extension artifact was replaced.

Reconciliation verifies 220 raw PNG hashes, retained processed PNG hashes, 64
compressed text replays, executed-source manifests, and denominators. Six native
successful HTML replays reproduce hashes and payloads exactly; conventional
positive controls pass and two ordinary paragraph negatives do not decode.
Configured native recovery uses unchanged raster input with GlobalHistogram,
downscaleThreshold 50, and downscaleFactor 2; downscaling occurs inside ZXing.
Expected payload and source matrix are not decoder inputs.

Four board cases pass exact HTML/TXT download checks, selectable-text checks,
native source-line fidelity, and 390-pixel viewport layout, with no page errors
or automatic external requests. Agent desktop/phone-width visual inspection is
recorded separately from physical-device acceptance. jsQR 1.4.0 and development-only
zxing-wasm 3.1.5 remain pinned and load locally. Incremental phase-02 evidence,
source, and local handback occupy about 29.98 MB before final small receipts.

Earlier first-pilot receipts remain unchanged: 158 layouts, 474 raw frames with
zero baseline recoveries, and 16 processed diagnostics. Its prior tests and
deviations are preserved in its report rather than pooled with this continuation.

## Deviations

The first continuous batch rejected flow-033 before capture: natural Courier New
bold overhang 0.5078125 pixels exceeded a conservative 0.5-pixel gate. Its remaining
19 cases were not attempted. Executed sources are archived; that structural
rejection is not a decoder failure or proven letter overlap.

Small additional views produced 13 configured-reader successes across 12 inputs.
Native verification then produced six successes from 24 inputs. These are new
reader configurations, not baseline passes. Externally processed diagnostics
remain separate: 136 probes, 6 jsQR exact and 15 ZXing exact. Four ordinary
rectangular layouts and four whole-word styling variants did not decode.

## Known issues

The prose goal remains open. Letters are now visible and lines continuous, but
the ink pattern can remain conspicuous. Successful text is large, repeats its
story, can end mid-sentence, and depends on recorded Mac fonts and styles.
Black-only typography and the tested shorter-line alternatives fail. Only the
short payload `AQROBAT-TEST` has native recovery evidence; arbitrary URLs are not
established. TXT loses weight/gray, and reflow changes geometry.

No new Samsung Camera, physical print, native clipboard/RTF, actual Gmail/received
email, or owner installed-extension observation was collected. Ryan's confidence
that old examples could scan is not counted as a pass. Existing product
copyable-text/Gmail acceptance and emoji-atlas work remain separate and open.

## What was cut

No product/extension integration of prose experiments, accepted inconspicuous
article claim, emoji atlas execution, project migration, new host/ChatGPT Site,
npm publication, Chrome Web Store submission, merge, new chats/agents, or messages
to others. The existing branch Pages preview remains the demo. Splashery, original
prototypes, owner files/profiles/jobs, and the private PDF archive are preserved.
**Keep this PR a draft.**

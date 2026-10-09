# Tight but clear rows, staggered real-word spaces

Both run-01 native layouts failed ordinary OpenCV detection and the native
jsQR structural gate. All immediate repeats and RGBA replay hashes match. The
post-probe 512 px binary replicas visibly retain aligned blank row/word stripes
through dark regions. Do not present those replicas as readable text or results.

Register exactly two further native finder-only proposals in fresh dense-02:
uppercase dense vocabulary / thin lowercase words, and lowercase dense words /
the same thin words. Monaco remains native 20 px, weight 400, tracking zero.
Leading changes from 24 to 18 px; the installed glyph metrics must still leave
at least 2 px ink clearance and nonoverlapping letter bounds. No descenders in
the selected vocabulary. Module pitch stays 144, hence eight text rows per
module. 56 rows per corner, native 5040 px output, source field 1008 px.

Whole-word dynamic programming packs each line within its source width. Its
source objective rewards measured glyph ink mass in dark regions and penalizes
it in light regions. A fixed penalty of 80 discourages spaces at the preceding
row's same character column, to break repeated vertical white stripes. Words
cross module boundaries normally; only one ordinary space separates words.
Terminal slack is at most the longest word plus one space. No actual pixel is
changed after rendering. This is a source proposal model, not decoder feedback
or a guarantee of contrast. Save all source, metrics hashes, costs and recipes.

Dark uppercase vocabulary: MUM, MOM, MUMMY, MEMORY, MEMBER, MINIMUM, MONO, NUMB,
WOMEN, WARM, COMMON. Lowercase: mum, meme, mummer, mom, murmur, common, moon,
morn, women, mammal, warm. Thin vocabulary: ill, it, if, lit, till, lilt, lift,
tilt. These are readable words but not meaningful sentences. Reject the output
if native bounds or font checks fail. Keep source casing/word rules explicit.

Same controls, old-seed guard and exact immediate repeats. Independently probe
the unchanged native images with default OpenCV in a fresh detector directory.
Keep the old jsQR gate and separate intermediate diagnostics. No payload or
full-QR sweep is scheduled, and a replica pass cannot establish native recovery.

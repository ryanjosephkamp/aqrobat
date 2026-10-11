# Replay buffer correction

First replay aborted before scanning native pixels: the package checks the backing
ArrayBuffer length, ignoring the offset of an ImageData-like view. The initial
view retained the eight-byte width/height transport header in its backing buffer.
RGBA hash verification itself passed, but the reader wrapper rejected length.
The executed v1 source, manifest and error remain. Control unattempted.

Fresh replay-02 uses an exact-length copy of the same verified RGBA bytes, without
any image alteration. This corrects memory packaging, not reader configuration.
Same two-input denominator; first attempt is an error, not a decoding failure.

# Retained-pixel replay comparison correction

The first read-only replay checks all 59 retained PNGs: all RGBA hashes match,
and all ten full-QR controls pass three profiles. Its diagnostic object assertion
rejects the other 49 entries because Node deep strict comparison distinguishes
VM-realm object prototypes from parsed JSON, despite identical serialized values.
These are checker errors, not new image, locator or payload failures. Preserve
pixel-replay-01.json, pixel-replay-start.json and its exact source snapshot.

Compare the JSON-serialized diagnostic values in a second read-only replay of
the exact same fixed 39 native finder and 20 control inputs. Keep classification
labels outside numeric comparison as before. No pixel, binarizer, locator,
source text, threshold or expected geometry changes. Save exclusive 02 receipts.
This is explicit checker repair/reverification, not a new capture experiment.

# Independent native payload check

Fresh detector-01: exactly native.png and the saved phase 12 full positive
control. Verify file and decoded-pixel hashes against capture records. Use
default OpenCV QRCodeDetector detectAndDecode, without options, transformations,
expected corners or prior symbol. Save all text/points/errors, including empty
results. Fresh vision-01: same two original PNGs through default macOS
VNDetectBarcodesRequest and VNImageRequestHandler URL input. No crop, resize,
threshold, symbology restriction, revision override or geometry supplied.
Record macOS/Swift versions, request revision/default symbologies, input hashes,
all observations/confidence/payload/positions and errors. Missing engines are
unavailable, not pass or fail. Do not open decoded URLs or send anything.

Apple's API reference: [VNDetectBarcodesRequest](https://developer.apple.com/documentation/vision/vndetectbarcodesrequest).
These are independent engines, not extra profiles counted as new engines.
Only exact native payload recovery with passing source legibility gates is a
machine success. Phone/print and natural prose remain separate and untested.

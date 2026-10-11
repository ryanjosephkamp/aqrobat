import cv2, json, sys
import numpy as np

image = cv2.imread(sys.argv[1], cv2.IMREAD_GRAYSCALE)
white = (image >= 128).astype(np.uint8)
n, labels, stats, centers = cv2.connectedComponentsWithStats(white, connectivity=4)
height, width = white.shape
holes = []
for i in range(1, n):
    x, y, w, h, area = [int(v) for v in stats[i]]
    if x > 0 and y > 0 and x + w < width and y + h < height:
        holes.append({'bounds': [x, y, w, h], 'pixels': area, 'center': centers[i].tolist()})
holes.sort(key=lambda q: (-q['pixels'], q['bounds'][1], q['bounds'][0]))
print(json.dumps({'classification': 'Threshold128 renderer-only native glyph resource; not a reader input or internal trace', 'width': width, 'height': height, 'holes': holes, 'selected': holes[0] if holes else None}))

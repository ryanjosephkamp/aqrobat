import cv2,json,sys
import numpy as np
image=cv2.imread(sys.argv[1],cv2.IMREAD_GRAYSCALE)
black=(image<128).astype(np.uint8)
n,labels,stats,centers=cv2.connectedComponentsWithStats(black,connectivity=4)
height,width=black.shape
components=[]
for i in range(1,n):
 x,y,w,h,area=[int(v) for v in stats[i]]
 if x>0 and y>0 and x+w<width and y+h<height:
  components.append({'bounds':[x,y,w,h],'pixels':area,'center':centers[i].tolist()})
components.sort(key=lambda q:(q['bounds'][1],q['bounds'][0],-q['pixels']))
print(json.dumps({'classification':'Threshold128 renderer-only native i resource; not a reader input or trace','width':width,'height':height,'components':components,'selected':components[0] if len(components)>=2 else None}))

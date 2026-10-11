import cv2,json,sys
import numpy as np
image=cv2.imread(sys.argv[1],cv2.IMREAD_GRAYSCALE)
white=(image>=128).astype(np.uint8)
n,labels,stats,centers=cv2.connectedComponentsWithStats(white,connectivity=4)
h,w=white.shape
holes=[]
for i in range(1,n):
 x,y,ww,hh,area=[int(v) for v in stats[i]]
 if x>0 and y>0 and x+ww<w and y+hh<h:holes.append(dict(id=i,bounds=[x,y,ww,hh],pixels=area,center=centers[i].tolist()))
ys,xs=np.where(image<128)
ink=[int(xs.min()),int(ys.min()),int(xs.max()),int(ys.max())] if len(xs) else None
point=[int(np.floor((ink[0]+ink[2])/2+.5)),int(np.floor((ink[1]+ink[3])/2+.5))] if ink else None
if len(sys.argv)>2:
 point=json.loads(sys.argv[2]);px,py=[int(np.floor(v+.5)) for v in point]
 selected=next((a for a in holes if a['id']==int(labels[py,px])),None)
else:
 selected=sorted(holes,key=lambda a:(-a['pixels'],a['bounds'][1],a['bounds'][0]))[0] if holes else None
 point=selected['center'] if selected else None
print(json.dumps(dict(classification="Renderer-only gray128 native contour enclosure; not acceptance selection",holes=holes,inkBounds=ink,centerSample=point,selected=selected)))

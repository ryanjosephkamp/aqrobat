import cv2,json,sys,unicodedata
import numpy as np
image=cv2.imread(sys.argv[1],cv2.IMREAD_GRAYSCALE)
white=(image>=128).astype(np.uint8)
n,labels,stats,centers=cv2.connectedComponentsWithStats(white,connectivity=4)
height,width=white.shape
holes=[]
for i in range(1,n):
 x,y,w,h,area=[int(v) for v in stats[i]]
 if x>0 and y>0 and x+w<width and y+h<height:holes.append({'id':i,'bounds':[x,y,w,h],'pixels':area,'center':centers[i].tolist()})
ys,xs=np.where(image<128)
ink=None;point=None;selected=None
if len(xs):
 ink=[int(xs.min()),int(ys.min()),int(xs.max()),int(ys.max())]
 point=[int(np.floor((ink[0]+ink[2])/2+.5)),int(np.floor((ink[1]+ink[3])/2+.5))]
 if len(holes)>=2:selected=next((h for h in holes if h['id']==int(labels[point[1],point[0]])),None)
print(json.dumps({'classification':'Threshold128 renderer-only native ideograph resource; not a reader input or internal trace','width':width,'height':height,'holes':holes,'inkBounds':ink,'centerSample':point,'selected':selected,'unicodeVersion':unicodedata.unidata_version,'unicode':{c:{'name':unicodedata.name(c),'category':unicodedata.category(c)} for c in '人回'}}))

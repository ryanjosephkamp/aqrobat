import cv2,json,sys,math
im=cv2.imread(sys.argv[1],cv2.IMREAD_GRAYSCALE)
c=json.loads(sys.argv[2]); x,y=[int(math.floor(v+.5)) for v in c]
a=[]
for dx,dy in [(-1,0),(1,0),(0,-1),(0,1)]:
 t=0
 while 0<=x+t*dx<im.shape[1] and 0<=y+t*dy<im.shape[0] and im[y+t*dy,x+t*dx]>=128:t+=1
 n=0
 while 0<=x+(t+n)*dx<im.shape[1] and 0<=y+(t+n)*dy<im.shape[0] and im[y+(t+n)*dy,x+(t+n)*dx]<128:n+=1
 a.append(n)
print(json.dumps({'classification':'Source-only filled native gray128 adjacent stem runs','runs':a,'stroke':round(sum(a)/8*4)/4}))

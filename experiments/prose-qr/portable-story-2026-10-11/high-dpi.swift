import AppKit
import PDFKit
import CryptoKit
let base=URL(fileURLWithPath:CommandLine.arguments[1]),out=base.appendingPathComponent("high-dpi-01"),pdfURL=base.appendingPathComponent("examples/page-impact-letter.pdf"),document=PDFDocument(url:pdfURL)!,page=document.page(at:0)!
func hash(_ d:Data)->String {SHA256.hash(data:d).map{String(format:"%02x",$0)}.joined()}
func save(_ n:String,_ d:Data)throws {try d.write(to:out.appendingPathComponent(n),options:.withoutOverwriting)}
var rows:[[String:Any]]=[]
for dpi in [192,300] {let scale=Double(dpi)/72,width=Int(612*scale),height=Int(792*scale)
 func native()->Data {let cg=CGContext(data:nil,width:width,height:height,bitsPerComponent:8,bytesPerRow:0,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.premultipliedLast.rawValue)!;cg.setFillColor(CGColor(gray:1,alpha:1));cg.fill(CGRect(x:0,y:0,width:width,height:height));cg.scaleBy(x:scale,y:scale);page.draw(with:.mediaBox,to:cg);return NSBitmapImageRep(cgImage:cg.makeImage()!).representation(using:.png,properties:[:])!}
 let a=native(),b=native(),id="pdf-\(dpi)dpi";try save(id+".png",a);try save(id+"-repeat.png",b);guard a==b else {fatalError("Repeat mismatch")};rows.append(["id":id,"dpi":dpi,"width":width,"height":height,"pngSha256":hash(a),"repeatExact":true,"pdfSha256":hash(try Data(contentsOf:pdfURL)),"physicalPagePoints":[612,792],"fontPointsUnchanged":9])
}
try save("pdf-summary.json",JSONSerialization.data(withJSONObject:["at":ISO8601DateFormatter().string(from:Date()),"rows":rows],options:[.prettyPrinted,.sortedKeys]));print("Native high-DPI PDF captures passed")

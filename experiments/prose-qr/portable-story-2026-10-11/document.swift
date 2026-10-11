import AppKit
import PDFKit
import CryptoKit

let base = URL(fileURLWithPath: CommandLine.arguments[1])
let rtfURL = base.appendingPathComponent("examples/page-impact.rtf")
let out = base.appendingPathComponent("native-document-01")
func hash(_ d: Data) -> String { SHA256.hash(data:d).map { String(format:"%02x",$0) }.joined() }
func save(_ name: String, _ data: Data) throws {
    let url = out.appendingPathComponent(name)
    guard !FileManager.default.fileExists(atPath:url.path) else { throw NSError(domain:"AlreadyExists",code:1) }
    try data.write(to:url,options:.withoutOverwriting)
}
func json(_ name:String,_ v:Any) throws { try save(name,JSONSerialization.data(withJSONObject:v,options:[.prettyPrinted,.sortedKeys])) }
var attributes:NSDictionary?
let attributed = try NSAttributedString(url:rtfURL,options:[.documentType:NSAttributedString.DocumentType.rtf],documentAttributes:&attributes)
let expected = try String(contentsOf:out.appendingPathComponent("expected.txt"),encoding:.utf8)
func words(_ s:String)->[String] { s.split(whereSeparator:{$0.isWhitespace}).map(String.init) }
guard words(attributed.string)==words(expected) else { fatalError("Native RTF word order changed") }
let storage = NSTextStorage(attributedString:attributed)
let manager = NSLayoutManager()
storage.addLayoutManager(manager)
let container = NSTextContainer(size:NSSize(width:450,height:459))
container.lineFragmentPadding=0
manager.addTextContainer(container)
manager.ensureLayout(for:container)
let range = manager.glyphRange(for:container)
guard range.length == manager.numberOfGlyphs else { fatalError("Native document overflows") }
var lines:[[String:Any]]=[]
manager.enumerateLineFragments(forGlyphRange:range) { rect,used,_,glyphRange,_ in
 let cr=manager.characterRange(forGlyphRange:glyphRange,actualGlyphRange:nil)
 let text=(attributed.string as NSString).substring(with:cr)
 lines.append(["rect":[rect.origin.x,rect.origin.y,rect.size.width,rect.size.height],"used":[used.origin.x,used.origin.y,used.size.width,used.size.height],"text":text])
}
let nonempty=lines.filter { !words($0["text"] as! String).isEmpty }
guard nonempty.count==50 else { fatalError("Native wrapping changed: \(nonempty.count) nonempty lines") }
let lineWords=nonempty.map { words($0["text"] as! String) }
guard lineWords == expected.split(separator:"\n",omittingEmptySubsequences:false).map({words(String($0))}) else { fatalError("A native source row wrapped or merged") }

func drawText(_ cg:CGContext) {
 let ns=NSGraphicsContext(cgContext:cg,flipped:true)
 NSGraphicsContext.saveGraphicsState()
 NSGraphicsContext.current=ns
 manager.drawGlyphs(forGlyphRange:range,at:NSPoint(x:81,y:171))
 NSGraphicsContext.restoreGraphicsState()
}
func bitmap(_ draw:(CGContext)->Void) -> Data {
 let cg=CGContext(data:nil,width:816,height:1056,bitsPerComponent:8,bytesPerRow:0,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.premultipliedLast.rawValue)!
 cg.setFillColor(CGColor(gray:1,alpha:1));cg.fill(CGRect(x:0,y:0,width:816,height:1056))
 draw(cg)
 let image=cg.makeImage()!
 let rep=NSBitmapImageRep(cgImage:image)
 return rep.representation(using:.png,properties:[:])!
}
func nativeRTF()->Data { bitmap { cg in cg.translateBy(x:0,y:1056);cg.scaleBy(x:4.0/3.0,y:-4.0/3.0);drawText(cg) } }
let native=nativeRTF(),repeatNative=nativeRTF()
try save("rtf-native.png",native);try save("rtf-repeat.png",repeatNative)
guard native==repeatNative else { fatalError("Native RTF repeat differs") }
let pdfURL=base.appendingPathComponent("examples/page-impact-letter.pdf")
guard !FileManager.default.fileExists(atPath:pdfURL.path) else {fatalError("PDF exists")}
var media=CGRect(x:0,y:0,width:612,height:792)
let pdf=CGContext(pdfURL as CFURL,mediaBox:&media,nil)!
pdf.beginPDFPage(nil);pdf.translateBy(x:0,y:792);pdf.scaleBy(x:1,y:-1);drawText(pdf);pdf.endPDFPage();pdf.closePDF()
let document=PDFDocument(url:pdfURL)!
guard document.pageCount==1 else {fatalError("Not one PDF page")}
let extracted=document.string ?? ""
guard words(extracted)==words(expected) else {fatalError("PDF word sequence differs")}
let page=document.page(at:0)!
let box=page.bounds(for:.mediaBox)
guard box.width==612 && box.height==792 else {fatalError("Not US Letter")}
func nativePDF()->Data {bitmap {cg in cg.scaleBy(x:4.0/3.0,y:4.0/3.0);page.draw(with:.mediaBox,to:cg)}}
let nativePdf=nativePDF(),repeatPdf=nativePDF()
try save("pdf-native.png",nativePdf);try save("pdf-repeat.png",repeatPdf)
guard nativePdf==repeatPdf else {fatalError("PDF repeat differs")}
try save("parsed-rtf.txt",Data(attributed.string.utf8));try save("pdf-selection.txt",Data(extracted.utf8))
var faces=Set<String>(),pointSizes=Set<Double>(),paragraphs:[[String:Any]]=[]
attributed.enumerateAttributes(in:NSRange(location:0,length:attributed.length)) { a,_,_ in
 if let f=a[.font] as? NSFont {faces.insert(f.fontName);pointSizes.insert(Double(f.pointSize))}
 if let p=a[.paragraphStyle] as? NSParagraphStyle,paragraphs.isEmpty {paragraphs.append(["alignment":p.alignment.rawValue,"minLineHeight":p.minimumLineHeight,"maxLineHeight":p.maximumLineHeight,"lineSpacing":p.lineSpacing,"lineHeightMultiple":p.lineHeightMultiple])}
}
try json("results.json",["at":ISO8601DateFormatter().string(from:Date()),"os":ProcessInfo.processInfo.operatingSystemVersionString,"rtfSha256":hash(try Data(contentsOf:rtfURL)),"pdfSha256":hash(try Data(contentsOf:pdfURL)),"rtfPngSha256":hash(native),"pdfPngSha256":hash(nativePdf),"rtfRepeatExact":true,"pdfRepeatExact":true,"nativeWordSequenceExact":true,"nativeRowsExact":true,"pdfWordSequenceExact":true,"pdfPages":1,"paperPoints":[612,792],"bodyPoints":[450,459],"nativePixels":[816,1056],"nonemptyRows":nonempty.count,"fonts":Array(faces),"pointSizes":Array(pointSizes),"paragraphs":paragraphs,"lineFragments":lines,"documentAttributes":String(describing:attributes),"receivingAppPasteTested":false,"physicalPrintTested":false])
print("Native RTF/PDF verification passed")

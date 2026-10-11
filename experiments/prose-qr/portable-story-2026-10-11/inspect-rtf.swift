import AppKit
import CryptoKit
let input=URL(fileURLWithPath:CommandLine.arguments[1]),out=URL(fileURLWithPath:CommandLine.arguments[2]),expectedURL=URL(fileURLWithPath:CommandLine.arguments[3])
let strict=CommandLine.arguments.contains("--capture")
func hash(_ d:Data)->String {SHA256.hash(data:d).map{String(format:"%02x",$0)}.joined()}
func save(_ n:String,_ d:Data)throws {let p=out.appendingPathComponent(n);guard !FileManager.default.fileExists(atPath:p.path) else {fatalError("Output exists")};try d.write(to:p,options:.withoutOverwriting)}
func words(_ s:String)->[String] {s.split(whereSeparator:{$0.isWhitespace}).map(String.init)}
var doc:NSDictionary?
let a=try NSAttributedString(url:input,options:[.documentType:NSAttributedString.DocumentType.rtf],documentAttributes:&doc)
let expected=try String(contentsOf:expectedURL,encoding:.utf8),storage=NSTextStorage(attributedString:a),manager=NSLayoutManager();storage.addLayoutManager(manager)
let container=NSTextContainer(size:NSSize(width:450,height:459));container.lineFragmentPadding=0;manager.addTextContainer(container);manager.ensureLayout(for:container)
let range=manager.glyphRange(for:container)
var rows:[[String:Any]]=[]
manager.enumerateLineFragments(forGlyphRange:range) {r,u,_,gr,_ in let cr=manager.characterRange(forGlyphRange:gr,actualGlyphRange:nil);rows.append(["rect":[r.origin.x,r.origin.y,r.width,r.height],"text":(a.string as NSString).substring(with:cr)])}
let nonempty=rows.filter{!words($0["text"] as! String).isEmpty},expectedRows=expected.split(separator:"\n",omittingEmptySubsequences:false).map{words(String($0))}
let exactRows=nonempty.map{words($0["text"] as! String)}==expectedRows,allFit=range.length==manager.numberOfGlyphs,wordExact=words(a.string)==words(expected)
var faces=Set<String>(),sizes=Set<Double>(),styles:[[String:Any]]=[],colors=Set<String>()
a.enumerateAttributes(in:NSRange(location:0,length:a.length)){v,_,_ in
 if let f=v[.font] as? NSFont {faces.insert(f.fontName);sizes.insert(Double(f.pointSize))}
 if let c=v[.foregroundColor] as? NSColor {let c=c.usingColorSpace(.deviceRGB)!;colors.insert(String(format:"%.6f,%.6f,%.6f,%.6f",c.redComponent,c.greenComponent,c.blueComponent,c.alphaComponent))}
 if let p=v[.paragraphStyle] as? NSParagraphStyle {let s:[String:Any]=["alignment":p.alignment.rawValue,"minLineHeight":p.minimumLineHeight,"maxLineHeight":p.maximumLineHeight,"lineSpacing":p.lineSpacing,"lineHeightMultiple":p.lineHeightMultiple];if styles.isEmpty {styles.append(s)}}
}
try save("parsed-native.txt",Data(a.string.utf8))
var result:[String:Any]=["input":input.path,"inputSha256":hash(try Data(contentsOf:input)),"at":ISO8601DateFormatter().string(from:Date()),"nativeWordSequenceExact":wordExact,"nativeRowsExact":exactRows,"allGlyphsFitLetterBody":allFit,"nativeNonemptyRowsInBody":nonempty.count,"totalGlyphs":manager.numberOfGlyphs,"fittingGlyphs":range.length,"fonts":Array(faces),"pointSizes":Array(sizes),"colors":Array(colors),"paragraphs":styles,"lineFragments":rows,"documentAttributes":String(describing:doc),"captureRequested":strict,"captured":false]
if strict && exactRows && allFit && wordExact {
 func png()->Data {let cg=CGContext(data:nil,width:816,height:1056,bitsPerComponent:8,bytesPerRow:0,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.premultipliedLast.rawValue)!;cg.setFillColor(CGColor(gray:1,alpha:1));cg.fill(CGRect(x:0,y:0,width:816,height:1056));cg.translateBy(x:0,y:1056);cg.scaleBy(x:4.0/3.0,y:-4.0/3.0);let ns=NSGraphicsContext(cgContext:cg,flipped:true);NSGraphicsContext.saveGraphicsState();NSGraphicsContext.current=ns;manager.drawGlyphs(forGlyphRange:range,at:NSPoint(x:81,y:171));NSGraphicsContext.restoreGraphicsState();return NSBitmapImageRep(cgImage:cg.makeImage()!).representation(using:.png,properties:[:])!}
 let one=png(),two=png();try save("native.png",one);try save("repeat.png",two);result["captured"]=true;result["repeatExact"]=one==two;result["pngSha256"]=hash(one);guard one==two else {fatalError("Repeat mismatch")}
} else if strict {result["stopReason"]="Native source rows or complete text did not fit the intended Letter body; no reader calls or transformed substitute."}
try save("native-results.json",JSONSerialization.data(withJSONObject:result,options:[.prettyPrinted,.sortedKeys]))
print(String(data:try JSONSerialization.data(withJSONObject:["wordExact":wordExact,"rowsExact":exactRows,"allFit":allFit,"fonts":Array(faces),"pointSizes":Array(sizes),"captured":result["captured"]!],options:[.sortedKeys]),encoding:.utf8)!)

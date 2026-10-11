import AppKit
import PDFKit
import CryptoKit

let args = CommandLine.arguments
let input = URL(fileURLWithPath: args[1])
let output = URL(fileURLWithPath: args[2])
let dpi = Double(args[3])!
let expected = try String(contentsOfFile: args[4], encoding: .utf8)
func hash(_ d: Data) -> String { SHA256.hash(data:d).map { String(format:"%02x",$0) }.joined() }
func words(_ s: String) -> [String] { s.split(whereSeparator: {$0.isWhitespace}).map(String.init) }
func save(_ n: String, _ data: Data) throws {
    let p = output.appendingPathComponent(n)
    guard !FileManager.default.fileExists(atPath:p.path) else { fatalError("Output exists") }
    try data.write(to:p,options:.withoutOverwriting)
}
let doc = PDFDocument(url:input)!
let selection = doc.string ?? ""
try save("pdf-selected.txt",Data(selection.utf8))
guard doc.pageCount == 1 else { fatalError("Expected one standard page") }
guard words(selection) == words(expected) else { fatalError("Native PDF source words differ") }
let page = doc.page(at:0)!
let box = page.bounds(for:.mediaBox)
guard abs(box.width-595.3)<0.3 && abs(box.height-841.9)<0.3 else { fatalError("Expected A4 within native export rounding tolerance of 0.3pt") }
let scale = dpi/72
let width = Int((box.width*scale).rounded()), height = Int((box.height*scale).rounded())
func render() -> Data {
    let cg = CGContext(data:nil,width:width,height:height,bitsPerComponent:8,bytesPerRow:0,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.premultipliedLast.rawValue)!
    cg.setFillColor(CGColor(gray:1,alpha:1));cg.fill(CGRect(x:0,y:0,width:width,height:height))
    cg.scaleBy(x:scale,y:scale)
    page.draw(with:.mediaBox,to:cg)
    return NSBitmapImageRep(cgImage:cg.makeImage()!).representation(using:.png,properties:[:])!
}
let first = render(), repeatImage = render()
try save("native.png",first);try save("repeat.png",repeatImage)
guard first == repeatImage else { fatalError("Native PDF immediate repeat differs") }
let result: [String:Any] = ["at":ISO8601DateFormatter().string(from:Date()),"input":input.path,"pdfSha256":hash(try Data(contentsOf:input)),"dpi":dpi,"paperPoints":[box.width,box.height],"pixels":[width,height],"pages":doc.pageCount,"nativeSelectionWordsExact":true,"pngSha256":hash(first),"repeatExact":true,"postCaptureTransforms":"none; full page drawn directly by native PDFKit at the declared DPI","sourceLane":"Actual receiving application's PDF export; reader result is separate"]
try save("capture.json",JSONSerialization.data(withJSONObject:result,options:[.prettyPrinted,.sortedKeys]))
print(String(data:try JSONSerialization.data(withJSONObject:result,options:[.sortedKeys]),encoding:.utf8)!)

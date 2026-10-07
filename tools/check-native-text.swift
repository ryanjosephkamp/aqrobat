// Optional macOS evidence helper. Reads task exports; never opens or edits a UI.
import AppKit
let input = CommandLine.arguments[1]
let output = CommandLine.arguments[2]
let data = try Data(contentsOf: URL(fileURLWithPath: input))
let text = try NSAttributedString(data: data, options: [.documentType: NSAttributedString.DocumentType.rtf], documentAttributes: nil)
let storage = NSTextStorage(attributedString: text)
let manager = NSLayoutManager()
let container = NSTextContainer(size: NSSize(width: 10000, height: 10000))
container.lineFragmentPadding = 0
storage.addLayoutManager(manager)
manager.addTextContainer(container)
manager.ensureLayout(for: container)
let bounds = manager.usedRect(for: container)
let width = Int(ceil(bounds.width)) + 20
let height = Int(ceil(bounds.height)) + 20
let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: width, pixelsHigh: height, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
NSColor.white.setFill()
NSRect(x:0,y:0,width:width,height:height).fill()
let transform = NSAffineTransform()
transform.translateX(by: 10, yBy: CGFloat(height) - 10)
transform.scaleX(by: 1, yBy: -1)
transform.concat()
NSGraphicsContext.current = NSGraphicsContext(cgContext: NSGraphicsContext.current!.cgContext, flipped: true)
manager.drawGlyphs(forGlyphRange: NSRange(location: 0, length: manager.numberOfGlyphs), at: .zero)
NSGraphicsContext.restoreGraphicsState()
try bitmap.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath:output))
var positions: [[String:Any]] = []
let ns = text.string as NSString
var row = 0, column = -1
for i in 0..<ns.length {
 let c = ns.character(at:i)
 if c == 9 { column += 1 }
 else if c == 0x2028 || c == 10 { row += 1; column = -1 }
 else if c != 32 && c != 0xFE0F && !(c >= 0xDC00 && c <= 0xDFFF) {
  let g = manager.glyphIndexForCharacter(at:i)
  let point = manager.location(forGlyphAt:g)
  let rect = manager.lineFragmentRect(forGlyphAt:g,effectiveRange:nil)
  positions.append(["row":row,"column":column,"x":point.x + rect.minX,"y":point.y + rect.minY])
 }
}
let report:[String:Any] = ["engine":"macOS AppKit TextKit", "input":URL(fileURLWithPath:input).lastPathComponent,"widthPoints":bounds.width,"heightPoints":bounds.height,"glyphPositions":positions]
let json = try JSONSerialization.data(withJSONObject:report,options:[.prettyPrinted,.sortedKeys])
try json.write(to: URL(fileURLWithPath:output + ".json"))
print("Native RTF evidence: \(width) × \(height) points")

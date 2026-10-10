import Foundation
import Vision
import CryptoKit
let paths = ["docs/research/prose-qr/phase-28/run-01/native.png", "docs/research/prose-qr/phase-12/run-01/raw/full.png"]
func hash(_ data: Data) -> String { SHA256.hash(data:data).map{String(format:"%02x",$0)}.joined() }
var rows:[[String:Any]]=[]
for path in paths {
 var row:[String:Any] = ["input":path]
 do {
  row["pngSha256"]=hash(try Data(contentsOf:URL(fileURLWithPath:path)))
  let request=VNDetectBarcodesRequest()
  row["revision"]=request.revision
  row["defaultSymbologies"]=request.symbologies.map{$0.rawValue}
  let start=Date()
  try VNImageRequestHandler(url:URL(fileURLWithPath:path),options:[:]).perform([request])
  row["seconds"]=Date().timeIntervalSince(start)
  row["observations"]=(request.results ?? []).map { r -> [String:Any] in
   ["payload":r.payloadStringValue ?? NSNull(),"symbology":r.symbology.rawValue,"confidence":r.confidence,"boundingBox":[r.boundingBox.origin.x,r.boundingBox.origin.y,r.boundingBox.size.width,r.boundingBox.size.height],"topLeft":[r.topLeft.x,r.topLeft.y],"topRight":[r.topRight.x,r.topRight.y],"bottomRight":[r.bottomRight.x,r.bottomRight.y],"bottomLeft":[r.bottomLeft.x,r.bottomLeft.y]]
  }
  row["exact"]=(request.results ?? []).contains{$0.payloadStringValue=="https://example.com/"}
 } catch { row["error"]=String(describing:error) }
 rows.append(row)
}
let result:[String:Any] = ["at":ISO8601DateFormatter().string(from:Date()),"os":ProcessInfo.processInfo.operatingSystemVersionString,"sourceSha256":hash(try Data(contentsOf:URL(fileURLWithPath:"experiments/prose-qr/whole-word-payload/vision.swift"))),"planSha256":hash(try Data(contentsOf:URL(fileURLWithPath:"docs/research/prose-qr/phase-28/PLAN.md"))),"inputTransforms":"none; URL handler and default request","planned":2,"results":rows]
print(String(data:try JSONSerialization.data(withJSONObject:result,options:[.prettyPrinted,.sortedKeys]),encoding:.utf8)!)

import Foundation
import Vision
import CryptoKit

func hash(_ data: Data) -> String {
    SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
}
var rows: [[String: Any]] = []
for path in CommandLine.arguments.dropFirst() {
    var row: [String: Any] = ["path": path]
    do {
        row["pngSha256"] = hash(try Data(contentsOf: URL(fileURLWithPath: path)))
        let request = VNDetectBarcodesRequest()
        row["revision"] = request.revision
        row["defaultSymbologies"] = request.symbologies.map { $0.rawValue }
        let start = Date()
        try VNImageRequestHandler(url: URL(fileURLWithPath: path), options: [:]).perform([request])
        row["seconds"] = Date().timeIntervalSince(start)
        row["texts"] = (request.results ?? []).compactMap { $0.payloadStringValue }
        row["observations"] = (request.results ?? []).map { r -> [String: Any] in
            ["payload": r.payloadStringValue ?? NSNull(), "symbology": r.symbology.rawValue,
             "confidence": r.confidence, "boundingBox": [r.boundingBox.origin.x, r.boundingBox.origin.y,
                 r.boundingBox.size.width, r.boundingBox.size.height]]
        }
    } catch { row["error"] = String(describing: error) }
    rows.append(row)
}
let result: [String: Any] = ["at": ISO8601DateFormatter().string(from: Date()),
    "os": ProcessInfo.processInfo.operatingSystemVersionString,
    "invocation": "VNDetectBarcodesRequest(); VNImageRequestHandler(url:options:[:]); all defaults",
    "inputTransforms": "none", "rows": rows]
print(String(data: try JSONSerialization.data(withJSONObject: result, options: [.prettyPrinted, .sortedKeys]), encoding: .utf8)!)

import Foundation
import Vision
import CryptoKit
let path = CommandLine.arguments[1]
func hash(_ data: Data) -> String {
    return SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
}
var row: [String: Any] = [:]
row["input"] = path
row["sourceSha256"] = hash(try Data(contentsOf: URL(fileURLWithPath: "experiments/prose-qr/context-vision-replay/vision.swift")))
row["os"] = ProcessInfo.processInfo.operatingSystemVersionString
do {
    row["pngSha256"] = hash(try Data(contentsOf: URL(fileURLWithPath: path)))
    let request = VNDetectBarcodesRequest()
    row["revision"] = request.revision
    row["defaultSymbologies"] = request.symbologies.map { $0.rawValue }
    let start = Date()
    try VNImageRequestHandler(url: URL(fileURLWithPath: path), options: [:]).perform([request])
    row["seconds"] = Date().timeIntervalSince(start)
    var observations: [[String: Any]] = []
    for result in request.results ?? [] {
        var record: [String: Any] = [:]
        if let payload = result.payloadStringValue { record["payload"] = payload }
        else { record["payload"] = NSNull() }
        record["symbology"] = result.symbology.rawValue
        record["confidence"] = result.confidence
        let box = result.boundingBox
        record["boundingBox"] = [box.origin.x, box.origin.y, box.size.width, box.size.height]
        record["topLeft"] = [result.topLeft.x, result.topLeft.y]
        record["topRight"] = [result.topRight.x, result.topRight.y]
        record["bottomRight"] = [result.bottomRight.x, result.bottomRight.y]
        record["bottomLeft"] = [result.bottomLeft.x, result.bottomLeft.y]
        observations.append(record)
    }
    row["observations"] = observations
    row["exact"] = (request.results ?? []).contains { $0.payloadStringValue == "https://example.com/" }
} catch { row["error"] = String(describing: error) }
let output = try JSONSerialization.data(withJSONObject: row, options: [.sortedKeys, .prettyPrinted])
print(String(data: output, encoding: .utf8)!)

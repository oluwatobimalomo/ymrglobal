import Foundation
import Vision
import ImageIO

let folder = URL(fileURLWithPath: CommandLine.arguments[1])
let files = try FileManager.default.contentsOfDirectory(at: folder, includingPropertiesForKeys: nil)
  .filter { $0.lastPathComponent.hasSuffix(".jpg") }
  .sorted { $0.lastPathComponent < $1.lastPathComponent }
for file in files {
  guard let source = CGImageSourceCreateWithURL(file as CFURL, nil), let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else { continue }
  let request = VNRecognizeTextRequest()
  request.recognitionLevel = .accurate
  request.usesLanguageCorrection = true
  try VNImageRequestHandler(cgImage: image).perform([request])
  print("\n--- \(file.lastPathComponent) ---")
  for item in request.results ?? [] {
    if let text = item.topCandidates(1).first?.string { print(text) }
  }
}

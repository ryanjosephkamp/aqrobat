import AppKit
for name in NSFontManager.shared.availableFonts.sorted() {if name.hasPrefix("Arial") {print(name)}}

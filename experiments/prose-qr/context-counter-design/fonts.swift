import AppKit
let terms = ["Hiragino", "Heiti", "Kaiti", "YuGothic", "Osaka"]
for name in NSFontManager.shared.availableFonts.sorted() {
    if terms.contains(where: { name.localizedCaseInsensitiveContains($0) }) {
        print(name)
    }
}

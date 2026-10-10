import AppKit
let terms = ["Silom", "Phosphate", "BankGothic", "Eurostile"]
for name in NSFontManager.shared.availableFonts.sorted() {
 if terms.contains(where: {name.localizedCaseInsensitiveContains($0)}) {print(name)}
}

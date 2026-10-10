import AppKit
for name in NSFontManager.shared.availableFonts.sorted() {
 if ["DIN", "Copperplate", "AmericanTypewriter", "Verdana", "Geneva", "GillSans", "Arial", "Phosphate", "Silom", "Bank", "Eurostile"].contains(where:{name.hasPrefix($0)}) { print(name) }
}

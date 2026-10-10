import AppKit
for name in NSFontManager.shared.availableFonts.sorted() {
    if name.localizedCaseInsensitiveContains("Songti") || name.localizedCaseInsensitiveContains("PingFang") {
        print(name)
    }
}

import AppKit
let terms = ["Gothic", "Klee", "Kai", "Baoli", "Hei", "Yuppy", "Wawati", "Weibei"]
for name in NSFontManager.shared.availableFonts.sorted() {
    if terms.contains(where: { name.localizedCaseInsensitiveContains($0) }) {
        print(name)
    }
}

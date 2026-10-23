import { generate, fromRecipe } from "./src/core.mjs";
import { LIBRARY_KEY, readLibrary } from "./src/library.mjs";
import { openInsertion } from "./extension/insertion.mjs";

const demos = ["#", "🚀", "⚫️", "🤣.☄️1:a"].map((glyph, i) => ({
  id: `00000000-0000-4000-8000-00000000000${i}`,
  name: ["Demo · hash", "Demo · rocket", "Demo · black circle", "Demo · mixed"][
    i
  ],
  recipe: generate("https://example.com", {
    glyph,
    repeatX: 1,
    repeatY: 1,
    width: 328,
  }).recipe,
}));
let practiceEntries = demos;
if (location.protocol === "chrome-extension:") {
  try {
    practiceEntries = [
      ...readLibrary(
        (await chrome.storage.local.get(LIBRARY_KEY))[LIBRARY_KEY],
      ),
      ...demos,
    ];
  } catch {
    document.getElementById("status").textContent =
      "Saved library unavailable. Demo recipes remain available.";
  }
}
document.getElementById("start").onclick = () => openInsertion(practiceEntries);
document.getElementById("practice-font-size").oninput = (event) => {
  const size = Number(event.target.value);
  if (Number.isInteger(size) && size >= 6 && size <= 32) {
    document.getElementById("plain").style.fontSize = `${size}px`;
    document.getElementById("plain").style.lineHeight = `${size * 1.5}px`;
  }
};
document.getElementById("import").onchange = async (event) => {
  try {
    const file = event.target.files[0];
    if (!file || file.size > 20000)
      throw new Error("Choose a Recipe JSON file under 20 KB.");
    const recipe = fromRecipe(JSON.parse(await file.text())).recipe;
    practiceEntries = [
      {
        id: crypto.randomUUID(),
        name: "Imported · " + file.name.slice(0, 60),
        recipe,
      },
      ...practiceEntries.slice(0, 23),
    ];
    document.getElementById("status").textContent =
      "Recipe loaded for this practice page only. Choose recipe and field to preview it.";
  } catch (error) {
    document.getElementById("status").textContent = error.message;
  }
  event.target.value = "";
};

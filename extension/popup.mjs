document.getElementById("open").onclick = () =>
  chrome.tabs.create({ url: chrome.runtime.getURL("index.html") });
document.getElementById("insert").onclick = async () => {
  const status = document.getElementById("status");
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    const result = await chrome.runtime.sendMessage({
      action: "insert",
      tabId: tab?.id,
      recipeId: document.getElementById("recipe").value,
    });
    if (!result?.ok)
      throw new Error(result?.error || "Insertion could not start.");
    window.close();
  } catch {
    status.textContent =
      "Chrome cannot insert on this page. Try a normal website or the practice page. Browser settings, other extensions, and cross-origin embedded editors may be restricted.";
  }
};
if (location.hash === "#restricted")
  document.getElementById("status").textContent =
    "Chrome blocked access to that editor. Try the toolbar on a normal page. Cross-origin frames and browser settings may be restricted.";
import { LIBRARY_KEY, readLibrary } from "./src/library.mjs";
let popupEntries = [];
function selectedPayload() {
  const entry = popupEntries.find(
    (e) => e.id === document.getElementById("recipe").value,
  );
  document.getElementById("payload").textContent = entry
    ? `Encodes: ${entry.recipe.payload}`
    : "Open the QR workbench, then Save for insertion.";
  document.getElementById("insert").disabled = !entry;
}
try {
  popupEntries = readLibrary(
    (await chrome.storage.local.get(LIBRARY_KEY))[LIBRARY_KEY],
  );
  for (const entry of popupEntries) {
    const option = document.createElement("option");
    option.value = entry.id;
    option.textContent = entry.name;
    document.getElementById("recipe").append(option);
  }
  selectedPayload();
} catch {
  document.getElementById("status").textContent =
    "Saved recipes could not be read. Open the QR workbench to check the library.";
}
document.getElementById("recipe").onchange = selectedPayload;

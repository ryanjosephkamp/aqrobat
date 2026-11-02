import { LIBRARY_KEY, readLibrary, addRecipe } from "./src/library.mjs";

const menus = [
  {
    id: "selection",
    title: "Make a text QR from selection",
    contexts: ["selection"],
  },
  { id: "link", title: "Make a text QR from this link", contexts: ["link"] },
  { id: "page", title: "Make a text QR from this page", contexts: ["page"] },
];
chrome.runtime.onInstalled.addListener(async () => {
  await chrome.contextMenus.removeAll();
  for (const menu of menus) chrome.contextMenus.create(menu);
});
export async function launchInsertion(
  tabId,
  recipeId,
  frameId = 0,
  recipe = null,
) {
  if (!Number.isInteger(tabId) || !Number.isInteger(frameId))
    throw new Error("Choose a browser page first.");
  // A one-off code from the popup is validated like a saved one, not stored.
  const entry = recipe
    ? readLibrary([{ id: crypto.randomUUID(), name: "This code", recipe }])[0]
    : readLibrary(
        (await chrome.storage.local.get(LIBRARY_KEY))[LIBRARY_KEY],
      ).find((e) => e.id === recipeId);
  if (!entry)
    throw new Error("Choose a saved code in Aqrobat’s toolbar first.");
  const target = { tabId, frameIds: [frameId] };
  await chrome.scripting.executeScript({
    target,
    files: ["insertion.js"],
    world: "ISOLATED",
  });
  await chrome.scripting.executeScript({
    target,
    world: "ISOLATED",
    func: (chosen) => {
      const open = globalThis.__aqrobatOpenInsertion;
      delete globalThis.__aqrobatOpenInsertion;
      open([chosen]);
    },
    args: [entry],
  });
}

let libraryWrite = Promise.resolve();
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  // Only our extension pages can save/delete recipes or request insertion.
  if (
    ![
      chrome.runtime.getURL("index.html"),
      chrome.runtime.getURL("popup.html"),
    ].includes(sender.url?.split(/[?#]/)[0])
  )
    return;
  const run = async () => {
    if (message?.action === "insert") {
      await launchInsertion(
        message.tabId,
        message.recipeId,
        0,
        message.recipe ?? null,
      );
      return { ok: true };
    }
    if (!["save-recipe", "delete-recipe"].includes(message?.action))
      throw new Error("Unknown Aqrobat action.");
    const data = await chrome.storage.local.get(LIBRARY_KEY);
    const entries = readLibrary(data[LIBRARY_KEY]);
    let next;
    if (message.action === "save-recipe")
      next = addRecipe(
        entries,
        message.name,
        message.recipe,
        crypto.randomUUID(),
      );
    else {
      if (!entries.some((e) => e.id === message.id))
        throw new Error("Saved recipe no longer exists.");
      next = entries.filter((e) => e.id !== message.id);
    }
    await chrome.storage.local.set({ [LIBRARY_KEY]: next });
    return { ok: true };
  };
  libraryWrite = libraryWrite.catch(() => {}).then(run);
  libraryWrite.then(respond, (error) =>
    respond({ ok: false, error: error.message }),
  );
  return true;
});
chrome.contextMenus.onClicked.addListener(async (info) => {
  const payload =
    info.menuItemId === "selection"
      ? info.selectionText
      : info.menuItemId === "link"
        ? info.linkUrl
        : info.menuItemId === "page"
          ? info.pageUrl
          : null;
  if (typeof payload !== "string") return;
  // The generator shows an error for oversized content; never silently shorten.
  if (new TextEncoder().encode(payload).length > 1024) {
    await chrome.tabs.create({ url: chrome.runtime.getURL("too-long.html") });
    return;
  }
  const all = await chrome.storage.session.get(null);
  const stale = Object.keys(all).filter(
    (k) => k.startsWith("aqrobat:") && Date.now() - all[k].time >= 60_000,
  );
  if (stale.length) await chrome.storage.session.remove(stale);
  const token = crypto.randomUUID(),
    key = `aqrobat:${token}`;
  await chrome.storage.session.set({ [key]: { payload, time: Date.now() } });
  await chrome.tabs.create({
    url: chrome.runtime.getURL("index.html") + "#handoff=" + token,
  });
});

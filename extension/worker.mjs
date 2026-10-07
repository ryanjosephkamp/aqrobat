import { APPEARANCE_KEY, appearance, iconPaths } from "./web/appearance.mjs";

let iconUpdate = Promise.resolve();
function restoreIcon() {
  iconUpdate = iconUpdate
    .catch(() => {})
    .then(async () => {
      const data = await chrome.storage.local.get(APPEARANCE_KEY);
      await chrome.action.setIcon({
        path: iconPaths(appearance(data[APPEARANCE_KEY]).icon),
      });
    });
  return iconUpdate;
}
// Run on every worker wake, plus browser startup, installation, and preference changes.
const initialIcon = restoreIcon().catch(() => {});
chrome.runtime.onStartup.addListener(restoreIcon);
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area === "local" && Object.hasOwn(changes, APPEARANCE_KEY))
    await restoreIcon();
});

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
  await initialIcon;
  await restoreIcon();
  await chrome.contextMenus.removeAll();
  for (const menu of menus) chrome.contextMenus.create(menu);
});
chrome.action.onClicked.addListener(() =>
  chrome.tabs.create({ url: chrome.runtime.getURL("index.html") }),
);
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

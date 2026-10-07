import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { APPEARANCE_KEY, appearance, iconPaths } from "../web/appearance.mjs";
import { webcrypto } from "node:crypto";
test("extension handlers isolate selection/link/page and keep payload out of URLs", async () => {
  const callbacks = {},
    menu = [],
    tabs = [],
    stored = {},
    removed = [],
    icons = [],
    preferences = {};
  const chrome = {
    runtime: {
      onInstalled: { addListener: (f) => (callbacks.install = f) },
      onStartup: { addListener: (f) => (callbacks.startup = f) },
      getURL: (p) => `chrome-extension://test/${p}`,
    },
    action: {
      onClicked: { addListener: (f) => (callbacks.action = f) },
      setIcon: async (value) => icons.push(value),
    },
    contextMenus: {
      removeAll: async () => {},
      create: (m) => menu.push(m),
      onClicked: { addListener: (f) => (callbacks.menu = f) },
    },
    tabs: { create: async (t) => tabs.push(t) },
    storage: {
      local: { get: async () => ({ ...preferences }) },
      onChanged: { addListener: (f) => (callbacks.preferences = f) },
      session: {
        get: async () => ({ ...stored }),
        set: async (data) => Object.assign(stored, data),
        remove: async (keys) => {
          for (const key of keys) {
            delete stored[key];
            removed.push(key);
          }
        },
      },
    },
  };
  vm.runInNewContext(
    (
      await readFile(
        new URL("../extension/worker.mjs", import.meta.url),
        "utf8",
      )
    ).replace(/^import[^;]*;\s*/gm, ""),
    {
      chrome,
      crypto: webcrypto,
      TextEncoder,
      Date,
      APPEARANCE_KEY,
      appearance,
      iconPaths,
    },
  );
  await callbacks.install();
  assert.equal(menu.length, 3);
  assert.equal(icons.at(-1).path[16], "icons/violet-16.png");
  preferences[APPEARANCE_KEY] = { theme: "midnight", icon: "coral" };
  await callbacks.preferences(
    { [APPEARANCE_KEY]: { newValue: preferences[APPEARANCE_KEY] } },
    "local",
  );
  assert.equal(icons.at(-1).path[128], "icons/coral-128.png");
  await callbacks.startup();
  assert.equal(icons.at(-1).path[32], "icons/coral-32.png");
  preferences[APPEARANCE_KEY] = { icon: "../../oops" };
  await callbacks.startup();
  assert.equal(icons.at(-1).path[48], "icons/violet-48.png");
  const count = icons.length;
  await callbacks.preferences({ [APPEARANCE_KEY]: {} }, "session");
  assert.equal(icons.length, count);
  for (const [menuItemId, expected] of [
    ["selection", "selected"],
    ["link", "https://link.test/"],
    ["page", "https://page.test/"],
  ]) {
    await callbacks.menu({
      menuItemId,
      selectionText: "selected",
      linkUrl: "https://link.test/",
      pageUrl: "https://page.test/",
    });
    const token = tabs.at(-1).url.split("handoff=")[1];
    assert.equal(stored[`aqrobat:${token}`].payload, expected);
    assert(!tabs.at(-1).url.includes(expected));
  }
  await callbacks.menu({ menuItemId: "unknown", selectionText: "ignored" });
  assert.equal(tabs.length, 3);
  await callbacks.menu({
    menuItemId: "selection",
    selectionText: "x".repeat(1025),
  });
  assert(tabs.at(-1).url.endsWith("too-long.html"));
  stored["aqrobat:old"] = { time: 0, payload: "old" };
  await callbacks.menu({ menuItemId: "selection", selectionText: "new" });
  assert(removed.includes("aqrobat:old"));
  const manifest = JSON.parse(
    await readFile(
      new URL("../extension/manifest.json", import.meta.url),
      "utf8",
    ),
  );
  assert.deepEqual(manifest.permissions, ["contextMenus", "storage"]);
  assert(!manifest.host_permissions);
  assert(!manifest.content_scripts);
});

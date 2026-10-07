import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { webcrypto } from "node:crypto";
test("extension handlers isolate selection/link/page and keep payload out of URLs", async () => {
  const callbacks = {},
    menu = [],
    tabs = [],
    stored = {},
    removed = [];
  const chrome = {
    runtime: {
      onInstalled: { addListener: (f) => (callbacks.install = f) },
      getURL: (p) => `chrome-extension://test/${p}`,
    },
    action: { onClicked: { addListener: (f) => (callbacks.action = f) } },
    contextMenus: {
      removeAll: async () => {},
      create: (m) => menu.push(m),
      onClicked: { addListener: (f) => (callbacks.menu = f) },
    },
    tabs: { create: async (t) => tabs.push(t) },
    storage: {
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
    await readFile(new URL("../extension/worker.mjs", import.meta.url), "utf8"),
    { chrome, crypto: webcrypto, TextEncoder, Date },
  );
  await callbacks.install();
  assert.equal(menu.length, 3);
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

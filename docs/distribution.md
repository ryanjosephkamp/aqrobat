# Website, extension, and package

## Website and offline file

Source is a static single page with local modules, no account, backend,
analytics, remote fonts, or QR API. GitHub Pages hosts those files; GitHub receives
ordinary page requests, but the generator does not send the entered payload.
The self-contained `downloads/aqrobat-offline.html` works directly from disk.
The source `index.html` uses modules and should be served over HTTP.

The initial Pages preview may be configured from `codex/aqrobat-foundation`.
After owner review/merge, change the publishing source to `main` at `/`.

## Unpacked Chrome extension

1. Download and extract `downloads/aqrobat-extension.zip`.
2. Open `chrome://extensions` and enable Developer mode.
3. Choose **Load unpacked** and select the extracted folder containing
   `manifest.json`.
4. Click Aqrobat's toolbar action to open the local generator. Right-click a
   selection, link, or page and choose its specific text QR command.

The MV3 extension bundles the same page/core. It requests `contextMenus` and
`storage`, with no host permissions or injected content scripts. It receives
selected text/link/page URLs only after the user's menu action. A one-time random
key transfers content through session storage, then the generator removes it.
Unconsumed handoffs are pruned on later menu actions after 60 seconds and are
cleared when the browser session ends. Do not treat that expiry as immediate
erasure if no later action happens. There is no server upload.

This is not submitted to the Chrome Web Store, and the project does not alter
your browser profile or install itself. Updates require loading a new build.
The build creates the ZIP; `dist/extension/` can also be loaded directly.
[Chrome context menu API](https://developer.chrome.com/docs/extensions/reference/api/contextMenus).
[Chrome session storage](https://developer.chrome.com/docs/extensions/reference/api/storage).

## npm readiness

`npm pack` produces a small ESM library/CLI with zero runtime dependencies.
It includes core/types/renderers, the vendored encoder, notices, and agent docs;
browser test tools and the extension are excluded.

Not yet published. `private: true` deliberately blocks `npm publish`. Before an
owner-led release: choose/check a package name and scope using the owner's npm
account, remove the private guard, run unit/browser/build/format checks, inspect
`npm pack --dry-run`, test the tarball in an empty consumer directory, and review
phone/extension acceptance. The repository name does not reserve an npm name.
Owner authentication and publication remain outside this setup.

No custom MCP server is needed for version one. A CLI and JSON recipes are
enough for Codex, Claude Code, or another agent to use deterministically.

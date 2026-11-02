# Website, offline page, extension, and package

## Website

The site is a static page with local modules: no account, backend, analytics,
remote fonts, or QR service. The host receives ordinary page requests; the text
you type is never sent. The source `index.html` uses ES modules, so serve it
over HTTP (`npm run serve`) rather than opening it from disk.

The theme, the last destination you picked, and your last square color are
saved in this browser. Codes and scan results are not saved unless you export them.

## Offline page

`downloads/aqrobat-offline.html` is the same generator in one file, with every
script and style inline. It works straight from disk with no network. Some
browsers block storage for local files, so preferences may not stick there;
making codes still works.

## Chrome extension

`downloads/aqrobat-extension.zip` is the Manifest V3 extension, built from the
same core and page. Install it unpacked; see
[the extension guide](browser-insertion.md). It is not listed in the Chrome Web
Store. The build also leaves the unpacked folder at `dist/extension/`.

## Package

`npm pack` produces a small ES module library and command-line tool with no
runtime dependencies: the core, renderers, text formats, the vendored encoder,
the notices, and the command-line guide. Browser tests and the extension are
left out. The package is marked private and is not published.

## Building

`npm run build` replaces `dist/extension/`, bundles the offline page (with the
logo inline) and the practice page, and writes the three files in
`downloads/`. It publishes nothing.

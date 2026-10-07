# Aqrobat

**QR codes, in character.** A small, free text and emoji QR generator built by
Codex for Ryan Kamp. Generation is deterministic and runs locally. No AI,
account, API key, or QR service is required.

This is a first-version foundation for review, not a scan compatibility promise.
The website, Node API/CLI, and unpacked Chrome extension share one core.
The implementation is on `codex/aqrobat-foundation` while its PR remains a draft;
the public Pages preview is published from that branch. `main` retains its
initial state until review.

## Try it

- [Browser generator](https://ryanjosephkamp.github.io/aqrobat/)
- [Standalone offline HTML](downloads/aqrobat-offline.html): download and open it
  in a browser; no local server is needed.
- [Unpacked extension ZIP](downloads/aqrobat-extension.zip): extract and load
  unpacked in Chrome. See [installation](docs/distribution.md).

On the page, enter a link or text, choose one or more symbols or complete emoji, adjust
size/density/font/ECC, and scan the **exact displayed output**. Export TXT, PNG,
SVG, a printable HTML sheet, or a reusable JSON recipe. The comparison grid lets
you mark 12 recipes and export/import your observations. Results stay in the
open page until exported; they are not uploaded or automatically persisted.

Enter `🤣☄️`, `abc123,.//';`, or `🤣.☄️1:a` in **Custom symbols / emoji**.
Unique graphemes cycle through dark modules in first-entry order; repeats and
spaces are ignored. Each chosen symbol repeats within its module. The input
limit is 4096 UTF-8 bytes. PNG preserves the rendered palette; copied emoji
text can lose its grid when receiving fonts use different widths.

Expand **Page theme & icon color** for five page themes and five icon colors.
Violet is the default. Appearance preferences alone persist locally; they do
not change QR artwork or recipes. In the extension, icon color also updates
the toolbar icon. The page includes Ryan’s personal social/sponsor footer.

## What works without AI

The standard encoder computes the QR matrix. Aqrobat draws its dark modules
with actual glyphs and its light modules with spaces. An agent can choose
parameters and call the same tool used by a human. It never needs to draw or
guess the QR pattern. [How it works](docs/how-it-works.md).

```sh
git clone --branch codex/aqrobat-foundation https://github.com/ryanjosephkamp/aqrobat.git
cd aqrobat
node bin/aqrobat.mjs 'https://example.com' --glyph '#' --density 4x2 --thick
node bin/aqrobat.mjs 'https://example.com' --format recipe --out qr.json
node bin/aqrobat.mjs --recipe qr.json --format svg --out qr.svg
```

The CLI/API need Node 22 or newer and **zero installed runtime dependencies**.
Output paths are created exclusively; an existing file is never replaced.
Without an argument, stdin is read exactly, including any final newline.
Use `printf` when you do not want a newline encoded.

```js
import { generate, toSvg } from "./src/core.mjs";
const qr = generate("https://example.com", {
  glyph: "⚫️",
  repeatX: 1,
  repeatY: 1,
  width: 700,
  ecc: "H",
});
console.log(qr.text, qr.recipe, qr.scanStatus); // "untested"
const svg = toSvg(qr); // font-dependent experimental artwork
```

The npm package is prepared but **not published**. `private: true` prevents
accidental publication. Choose/check the final npm name and remove that guard
only for an owner-approved release. No Chrome Web Store submission is planned.
[Agent usage](docs/agents.md) · [Distribution and release checklist](docs/distribution.md).

## Scan evidence and limits

Every generated recipe starts **untested**. Matrix validity, software decoding,
phone observations, and paper scans are different evidence. Characters with
good dark coverage may scan more easily; sparse dots and colorful emoji can be
fragile. Fonts, copied spacing, cameras, brightness, and distance matter.
PNG preserves this browser's artwork. TXT and SVG depend on receiving fonts.
Print sheets have not been physically tested in this version.

The earlier private prototypes received encouraging phone reports, including
conditional dot results. Those observations do not certify this new renderer,
every payload, or another device. No historic pass is automatically assigned to
a new recipe. Text QR artwork is not encryption or protection against a machine
reading the payload.

## Development

```sh
npm ci
npm test
npm run build
npm run test:browser
npm run format:check
npm run serve
```

Build/browser checks use installed Chrome when available on macOS, or
`CHROME_PATH=/path/to/chromium`. Else install a Playwright Chromium separately
with `npx playwright install chromium`. Builds replace only `dist/extension/`
and their own generated download files. No application build step is required
to serve the source page. Serve binds only to `127.0.0.1`.

## Prior art and direction

Text QR is not new. Terminal packages and custom emoji websites already exist.
The value we are exploring is the combination of a small shared toolchain,
font-aware glyph layouts, portable recipes, and visible scan testing.
[Opened-source review and roadmap](docs/prior-art-and-roadmap.md).
The next bounded research proposal is the [emoji atlas pilot](docs/emoji-atlas-plan.md);
it has not been executed.

## Demo and validation

[Current palette/theme walkthrough](docs/demo/palette-themes.webm) ·
[Current GIF](docs/demo/palette-themes.gif) ·
[Original UI walkthrough](docs/demo/walkthrough.webm) ·
[Animated GIF](docs/demo/walkthrough.gif) (0.1.0 historical UI) ·
[Software evidence and negative results](docs/validation.md).
The demo shows the real generator changing settings and creating comparisons;
it contains no phone scan or print acceptance claim.

## License

MIT: free to use, modify, and redistribute with the included copyright and
permission notices. No software purchase or subscription is required. The
Nayuki encoder's notice is preserved. System emoji fonts remain separately
licensed. See [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md).

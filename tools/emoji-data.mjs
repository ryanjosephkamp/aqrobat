// Builds web/emoji-data.mjs, the emoji picker's categories, names, search
// words, and lightness, from Unicode's emoji list and CLDR's English
// annotations (Unicode License v3; see NOTICE.md).
//
//   node tools/emoji-data.mjs
//
// Lightness is measured in Noto Color Emoji, the emoji Gmail draws, so the
// script needs Playwright and network access to Google Fonts.
import { chromium } from "playwright";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const SOURCES = {
  list: "https://www.unicode.org/Public/emoji/16.0/emoji-test.txt",
  annotations:
    "https://raw.githubusercontent.com/unicode-org/cldr/release-46/common/annotations/en.xml",
  derived:
    "https://raw.githubusercontent.com/unicode-org/cldr/release-46/common/annotationsDerived/en.xml",
};
// Emoji 15.1 (2023) shows on current phones and computers. Newer emoji can
// appear as empty boxes on older systems.
const MAX_VERSION = 15.1;
// Categories in the order phone emoji keyboards use.
const CATEGORIES = [
  ["Smileys & People", ["Smileys & Emotion", "People & Body"]],
  ["Animals & Nature", ["Animals & Nature"]],
  ["Food & Drink", ["Food & Drink"]],
  ["Activities", ["Activities"]],
  ["Travel & Places", ["Travel & Places"]],
  ["Objects", ["Objects"]],
  ["Symbols", ["Symbols"]],
  ["Flags", ["Flags"]],
];

const text = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response.text();
};
const [list, annotations, derived] = await Promise.all(
  Object.values(SOURCES).map(text),
);

// emoji-test.txt: fully qualified emoji in keyboard order, without skin
// tones, which keyboards offer as variants of the base emoji.
const groups = new Map();
let group = null;
for (const line of list.split("\n")) {
  const heading = line.match(/^# group: (.+)$/);
  if (heading) group = heading[1];
  const entry = line.match(
    /^[0-9A-F ]+;\s*fully-qualified\s*# (\S+) E(\d+\.\d+) (.+)$/,
  );
  if (
    !entry ||
    Number(entry[2]) > MAX_VERSION ||
    /[\u{1F3FB}-\u{1F3FF}]/u.test(entry[1])
  )
    continue;
  if (!groups.has(group)) groups.set(group, []);
  groups.get(group).push({ emoji: entry[1], name: entry[3] });
}

// CLDR: a short name ("tts") and search words for each emoji.
const xml = (s) =>
  s
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
const words = new Map(),
  names = new Map();
for (const source of [annotations, derived])
  for (const [, cp, tts, body] of source.matchAll(
    /<annotation cp="([^"]+)"( type="tts")?>([^<]*)<\/annotation>/g,
  )) {
    const key = xml(cp);
    if (tts) names.set(key, xml(body));
    else words.set(key, xml(body));
  }
const lookup = (map, emoji) =>
  map.get(emoji) ?? map.get(emoji.replace(/️/g, ""));
const split = (s) => s.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

const entries = [];
for (const [name, sources] of CATEGORIES)
  for (const source of sources)
    for (const e of groups.get(source) ?? []) {
      // Unicode's list name joins CLDR's search words, where it differs.
      const listName = e.name;
      e.category = name;
      e.name = (lookup(names, e.emoji) ?? listName).toLowerCase();
      const own = new Set(split(e.name));
      e.words = [
        ...new Set(
          [lookup(words, e.emoji) ?? "", listName]
            .flatMap(split)
            .filter((w) => !own.has(w)),
        ),
      ].join(" ");
      entries.push(e);
    }

// Lightness from 0 (black) to 1 (white), averaged over the emoji's square,
// measured as the page measures it: drawn at 54 px in a 64 px canvas.
const executablePath =
  process.env.CHROME_PATH ||
  (existsSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
    ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    : undefined);
const browser = await chromium.launch({ executablePath });
const page = await browser.newPage();
await page.setContent(
  `<!doctype html><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=block">`,
);
const lightness = await page.evaluate(
  async (all) => {
    await document.fonts.load('54px "Noto Color Emoji"', all.join(""));
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.font = '54px "Noto Color Emoji"';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    return all.map((emoji) => {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = "#000";
      ctx.fillText(emoji, 32, 34);
      const data = ctx.getImageData(0, 0, 64, 64).data;
      let sum = 0;
      for (let i = 0; i < data.length; i += 4)
        sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      return Math.round((sum / (255 * 64 * 64)) * 100);
    });
  },
  entries.map((e) => e.emoji),
);
await browser.close();
entries.forEach((e, i) => (e.lightness = lightness[i]));

// One line per emoji: emoji, name, search words, lightness in hundredths.
const data = CATEGORIES.map(([name]) => [
  name,
  entries
    .filter((e) => e.category === name)
    .map((e) => [e.emoji, e.name, e.words, e.lightness].join("\t"))
    .join("\n"),
]);
const out = new URL("../web/emoji-data.mjs", import.meta.url).pathname;
await writeFile(
  out,
  `// Generated by tools/emoji-data.mjs; do not edit. Emoji ${MAX_VERSION} and
// earlier from Unicode emoji-test.txt 16.0, with names and search words from
// CLDR 46 English annotations. Copyright © 1991-2026 Unicode, Inc. Unicode
// License v3; see NOTICE.md. Each line: emoji, name, search words, and
// lightness in Noto Color Emoji from 0 (black) to 100 (white), tab separated.
export const EMOJI_CATEGORIES = ${JSON.stringify(data, null, 1)};\n`,
);
execFileSync("node", ["--check", out]);
console.log(
  `${entries.length} emoji in ${CATEGORIES.length} categories, ${(Buffer.byteLength(JSON.stringify(data)) / 1024).toFixed(0)} KB`,
);

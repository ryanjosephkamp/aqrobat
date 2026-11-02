import { pasteText, DARK_TILES, LIGHT_TILE } from "./portable.mjs";
import { formattedText } from "./text.mjs";

// How each destination receives a copied code. Every format carries the
// code's own characters. "formatted" adds inline typography as HTML, with
// plain text for apps that drop formatting. "plain" leaves the font to the
// app. "markdown" fences monospace text; "blocks" leaves the fence off for
// pasting into an existing code block. "png" is the image artwork.
// "tested" names the characters that have scanned after pasting there.
const SQUARES_TESTED = Object.freeze({
  glyphs: DARK_TILES,
  light: LIGHT_TILE,
  name: "Emoji squares",
});
const BLOCKS_TESTED = Object.freeze({
  glyphs: Object.freeze(["█"]),
  light: null,
  name: "Full blocks",
});
export const FORMATS = Object.freeze({
  formatted: {
    name: "Formatted text",
    note: "Pastes as text that keeps its font and spacing. Apps that drop formatting, such as Gmail on a phone, get plain text instead.",
    tested: SQUARES_TESTED,
  },
  plain: {
    name: "Plain text",
    note: "Pastes as plain text in the app's own font. Emoji line up in any font; letters and symbols need a monospace one.",
    tested: SQUARES_TESTED,
  },
  markdown: {
    name: "Code block",
    note: "Pastes inside a Markdown code block, which keeps a monospace font.",
    tested: BLOCKS_TESTED,
  },
  blocks: {
    name: "Code-block text",
    note: "Make a code block first, then paste into it, so it keeps a monospace font.",
    tested: BLOCKS_TESTED,
  },
  png: {
    name: "Image",
    note: "Copies the artwork as a PNG. It looks the same everywhere, but it is a picture, not text.",
    tested: null,
  },
});

export const DESTINATIONS = Object.freeze(
  [
    {
      id: "gmail",
      name: "Gmail",
      format: "formatted",
      hosts: ["mail.google.com"],
      how: "Click into the message body, paste, and send yourself a test before you rely on it.",
    },
    {
      id: "outlook",
      name: "Outlook",
      format: "formatted",
      hosts: [
        "outlook.live.com",
        "outlook.office.com",
        "outlook.office365.com",
      ],
      how: "Paste into the message body with formatting kept.",
    },
    {
      id: "word",
      name: "Word",
      format: "formatted",
      hosts: ["word.cloud.microsoft", "onedrive.live.com"],
      how: "Paste with Keep Source Formatting.",
    },
    {
      id: "docs",
      name: "Google Docs",
      format: "plain",
      hosts: ["docs.google.com"],
      how: "Paste on an empty line. Keep line spacing at 1.15 or less; if rows wrap, make the font smaller.",
    },
    {
      id: "notes",
      name: "Apple Notes",
      format: "plain",
      hosts: [],
      how: "Paste into a note on its own lines. If rows wrap, make the font smaller.",
    },
    {
      id: "slack",
      name: "Slack",
      format: "plain",
      hosts: ["app.slack.com"],
      how: "Paste into the message box and check the preview before sending.",
    },
    {
      id: "discord",
      name: "Discord",
      format: "plain",
      hosts: ["discord.com"],
      limit: 2000,
      how: "Paste into the message box. Messages hold 2,000 characters.",
    },
    {
      id: "notion",
      name: "Notion",
      format: "blocks",
      hosts: ["www.notion.so", "notion.so"],
      how: "Type /code to make a code block, then paste into it. Notion's loose line spacing pulls emoji rows apart.",
    },
    {
      id: "markdown",
      name: "GitHub or Markdown",
      format: "markdown",
      hosts: ["github.com", "gist.github.com"],
      how: "Paste into a comment, README, or any Markdown editor.",
    },
    {
      id: "plain",
      name: "Plain text",
      format: "plain",
      hosts: [],
      how: "Paste anywhere that accepts text and shows emoji.",
    },
    {
      id: "image",
      name: "Image",
      format: "png",
      hosts: [],
      how: "Insert the PNG like any picture.",
    },
  ].map((d) => Object.freeze({ ...d, hosts: Object.freeze(d.hosts) })),
);

export function destination(id) {
  return DESTINATIONS.find((d) => d.id === id) ?? DESTINATIONS[0];
}

export function destinationForHost(hostname) {
  return DESTINATIONS.find((d) => d.hosts.includes(hostname)) ?? null;
}

/**
 * What a copy for this destination puts on the clipboard: always the code's
 * own characters. Formatted output needs browser font metrics from
 * textMetrics(qr); the other formats do not.
 */
export function clipboardFor(qr, id, metrics) {
  const format = destination(id).format;
  if (format === "formatted")
    return {
      format,
      html: formattedText(qr, metrics),
      text: pasteText(qr).text,
    };
  if (format === "markdown" || format === "blocks")
    return {
      format,
      html: null,
      text: pasteText(qr, { quiet: qr.quiet, fence: format === "markdown" })
        .text,
    };
  if (format === "plain")
    return { format, html: null, text: pasteText(qr).text };
  return { format, html: null, text: null };
}

/**
 * Whether the code's characters, its parts' included, have been
 * scan-tested after pasting into this destination. Other characters still
 * paste; they are experimental.
 */
export function pasteCheck(qr, id) {
  const tested = FORMATS[destination(id).format].tested;
  return {
    tested,
    ok:
      !tested ||
      (qr.glyphs.every(
        (glyph) => glyph === qr.light || tested.glyphs.includes(glyph),
      ) &&
        (!qr.light || qr.light === tested.light)),
  };
}

/** Characters as most apps count them: one per code point. */
export function characterCount(text) {
  return [...text].length;
}

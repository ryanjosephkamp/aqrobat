import { readFile, writeFile } from "node:fs/promises";
import { DEFAULT_RECIPE } from "./generator.mjs";
import { prose } from "./layout.mjs";
const root = "docs/research/prose-qr/portable-story-2026-10-11/";
const single = JSON.parse(
  await readFile(root + "batch-01/page-impact-preserve-layout.json"),
).plainText;
const accented =
  "At the café, Ana reads a résumé and orders tea.\nHer naïve first sketch becomes a useful design.\tThe words stay in order, with accents intact; no one needs to type in capitals. A small printed page should leave enough room to read, share, and test the exact link.";
const cases = [
  {
    id: "accepted-replay",
    spec: DEFAULT_RECIPE,
    replay: "batch-01/page-impact-preserve.png",
  },
  {
    id: "new-prose-complete",
    spec: {
      ...DEFAULT_RECIPE,
      gray: 200,
      quiet: 4,
      text: "Morning light crossed the quiet room, and Mara opened the notebook she had carried for years. She wrote about the river, the neighbors, and the small habits that made an ordinary day feel worth remembering. Outside, a bicycle bell rang twice. Someone laughed near the corner shop. She paused, listened, and decided that the next sentence should leave enough space for another person to enter the story with their own memories.",
    },
  },
  {
    id: "narrow-complete",
    spec: { ...DEFAULT_RECIPE, gray: 200, quiet: 4, text: prose.narrow },
  },
  {
    id: "broad-complete",
    spec: { ...DEFAULT_RECIPE, gray: 200, quiet: 4, text: prose.broad },
  },
  {
    id: "black-complete",
    spec: {
      ...DEFAULT_RECIPE,
      font: "Avenir Next Condensed",
      fontSize: 10,
      darkWeight: 900,
      lightWeight: 100,
      gray: 0,
      quiet: 4,
    },
  },
  {
    id: "single-copy",
    spec: { ...DEFAULT_RECIPE, text: single, repeat: false },
    replay: "batch-01/page-impact-preserve.png",
  },
  {
    id: "accented-complete",
    spec: { ...DEFAULT_RECIPE, text: accented, gray: 200, quiet: 4 },
  },
  {
    id: "longer-url-complete",
    spec: {
      ...DEFAULT_RECIPE,
      payload: "https://example.com/aqrobat?size=small",
      fontSize: 10,
      gray: 200,
      quiet: 4,
    },
  },
];
await writeFile(
  "experiments/prose-qr/portable-story-2026-10-11/workbench-test-01.json",
  JSON.stringify(
    {
      id: "workbench-test-01",
      hypothesis:
        "Exercise the offline UI and real exports. Preserve whole copies rather than the earlier fixture’s partial final repetitions; verify new wording, difficult streams, black weights, one exact nonrepeated 1136-word source, raw whitespace/accents, and an exact longer URL. Two explicitly planned baseline replays receive no duplicate reader calls if native bytes match.",
      cases,
      plannedNativeCaptures: 8,
      plannedImmediateRepeats: 8,
      maximumPrimaryReaderCalls: 24,
      plannedUniquePrimaryReaderCalls: 18,
      errorChecks: [
        "source overflow even with repeat",
        "insufficient source without repeat",
        "unsupported script",
        "vertical overlap",
        "stale download disabled",
      ],
      clipboard:
        "Stub navigator.clipboard inside a fresh test-owned browser; no OS clipboard writes. Native CUA transfer is separate.",
    },
    null,
    2,
  ) + "\n",
  { flag: "wx" },
);

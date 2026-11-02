# Gmail view simulator

A dev-only check of how a code's plain text looks to someone reading it in
Gmail, and whether a camera can read it there. The Gmail phone app pastes plain
text, so this is what a recipient sees when a code is copied on a phone.

It models three things Gmail does to a pasted message:

- Runs of spaces collapse to one, so letter codes lose their shape.
- Text is set in Arial at Gmail's small size.
- Emoji become Google's Noto images, the same size as each other. Gmail draws
  ⬜ as a light gray tile, about as bright as most emoji.

Each render goes through 12 camera-like trials: scaled to 3.4 to 4.9 px a
square, blurred 0.8 to 1.3 px, 15% contrast loss, 4% noise, and up to 3° of
tilt. Each trial is decoded with ZXing and jsQR; a pass is the exact payload
from either. `--view=web` (the default) uses Gmail's taller web rows, 1.25
times as tall as they are wide; `--view=print` uses square rows.

## Calibration

Seven codes were sent through Gmail from a phone and scanned from a large
screen: four on October 28, 2026, and three on October 29 in the page's
current layout for emoji other than the squares, with ▫️ in the light squares
and ⬛ for the three corner markers. The simulator agrees with all seven.

| Layout sent                       | Phone        | Web view | Print view |
| --------------------------------- | ------------ | -------: | ---------: |
| ⬛ squares with ⬜ blanks         | Scanned      |    10/12 |      12/12 |
| 🍇 grapes with ⬜ blanks          | Did not scan |     0/12 |       0/12 |
| 🙂 smileys with ⬜ blanks         | Did not scan |     0/12 |       0/12 |
| `#` letters with spaces           | Did not scan |     0/12 |       0/12 |
| 🍇 grapes, ▫️ blanks, ⬛ corners  | Scanned      |     9/12 |      12/12 |
| 🖤 hearts, ▫️ blanks, ⬛ corners  | Scanned      |    10/12 |      12/12 |
| 🙂 smileys, ▫️ blanks, ⬛ corners | Did not scan |     0/12 |       5/12 |

Emoji whose average lightness in Google's emoji is above about 0.8 rarely
pass (🙂, 🐱, 🧍, 🏁, 🔥, 🐧); the page warns about them. Between 0.77 and
0.80, such as 😍, 😀, 🤡, and 🎃, they passed 7 of 12 in the web view. Letters
fail in every plain-text layout tried, including full-width characters and
no-break spaces.

## Parts

The page's Parts give the corner markers' frames, their centers, and the
light squares their own characters. None of these has been tried on a phone.

| Layout                             | Web view | Print view |
| ---------------------------------- | -------: | ---------: |
| 🍇 with its own corners            |     0/12 |       5/12 |
| 🖤 with its own corners            |     6/12 |      11/12 |
| 🍇 with ⬛ frames, its own centers |     0/12 |       1/12 |
| 🍇 with its own frames, ⬛ centers |     3/12 |       9/12 |
| 🍇 with 🟪 corners                 |     8/12 |      12/12 |
| 🖤 with 🟥 corners                 |     9/12 |      12/12 |
| ⬛ with 🤍 light squares           |     9/12 |      12/12 |
| ⬛ with 🟨 light squares           |     5/12 |      10/12 |
| ⬛ with 🙂 light squares           |     1/12 |       5/12 |

Corners need solid squares, in any color, at both the frames and the centers.
Light squares need a character that is nearly white all over; a face's eyes
and mouth read as dark squares.

## Limits

Four phone results are a small calibration. The camera model is a stand-in
for a phone, not a phone, and the view models only Gmail. A pass here is a
reason to try a code on a phone, not proof that it scans.

## Run

It needs the paste lab's dependencies and network access to Google Fonts for
the Noto emoji.

```sh
npm install --prefix tools/paste-lab --ignore-scripts
node tools/gmail-sim/run.mjs                       # calibration and current layouts
node tools/gmail-sim/run.mjs 🍇 🖤 🙂              # current layout for these characters
node tools/gmail-sim/run.mjs 🍇 --corners= --centers=   # parts: corners follow the code
node tools/gmail-sim/run.mjs ⬛ --light=🤍          # parts: a light character
node tools/gmail-sim/run.mjs --view=print --trials=24 --out=test-results/gmail-sim
```

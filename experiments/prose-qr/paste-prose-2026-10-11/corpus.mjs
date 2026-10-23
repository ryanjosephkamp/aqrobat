// Original research prose, frozen before its first captures. No owner documents.
export const passages = [
  {
    id: "dialogue",
    text: `“Are we early?” Mira asked. “Only by seven minutes,” said Jo, checking the clock above the door. The room smelled of fresh paint, but the tables were already covered with paper. A small sign read: Bring a question; leave with an idea. Mira put her notebook beside a blue cup and wrote, “What makes a useful first attempt?” Jo drew a crooked circle. Neither expected a perfect answer that morning. They wanted something they could try, explain, and improve together, without pretending that a promising sketch was already a finished plan.`,
  },
  {
    id: "accents",
    text: `At the café, Zoë set a résumé beside René’s notebook. “The façade looks different in the rain,” she said. André agreed, then turned back to a small map of the marché. They had promised to meet Anaïs at noon, near the old hôtel. A handwritten note offered crème brûlée and a warm welcome. The accents belonged to the words; removing them would change the source. When the clouds cleared, the group walked slowly toward the river, comparing the quiet street with the busy square they remembered from yesterday.`,
  },
  {
    id: "numbers",
    text: `At 8:45 a.m., the workshop had 12 chairs, 3 lamps, and 27 unfinished cards. By 9:10, two volunteers had sorted them into boxes marked A, B, and C. The first card said “Measure twice”; the next asked whether 0.25 was close enough. A third listed 2026, 2027, and 2030 as possible dates. Nobody treated a neat number as proof. They recorded what happened, kept the original notes, and compared the next attempt with the first. At 11:05, the room was untidy again, but every box had a clear label.`,
  },
  {
    id: "narrow",
    text: `Little lilies lit a still hill in the late light. Jill lifted a thin tin lid and listened. Inside lay a list, a pencil, and a tiny bell. It was a simple kit, but it invited a small experiment. She drew a line, tilted the lid, and let the bell roll until it stopped. Then she tried again from a different place. The list grew slowly. Jill did not invent a larger story for the result. She kept the little details because they might explain why the next trial felt different.`,
  },
  {
    id: "wide",
    text: `Warm waves moved around the wooden wharf while Morgan watched a wide-winged gull above the water. Down below, a workman moved an enormous brown box from a wagon. “Wow,” whispered Mae, who had never seen the old warehouse open. Windows glowed along the upper wall. Someone was making room for a weekend exhibition of maps, models, and photographs. Morgan wondered how many journeys had begun beside those doors. Mae wondered whether the enormous box held a model boat. Both questions seemed worth keeping, even though neither could be answered from the wharf.`,
  },
  {
    id: "long-words",
    text: `The committee discussed interoperability, accessibility, reproducibility, and responsibility before choosing a demonstration. These were useful words, but a visitor would need a concrete explanation. The demonstration therefore began with an ordinary paragraph and a visible change. Participants could inspect the source, compare the output, and ask what had been preserved. A misunderstanding was corrected before the next session. Nobody shortened a troublesome word to make the arrangement look better. If a requirement could not be met, the record said so. The explanation became more understandable when every important claim pointed to something another person could examine.`,
  },
  {
    id: "paragraphs",
    text: `A folded note waited on the kitchen table.\n\n“Please bring the green folder,” it began. There was no signature, only a small drawing of a leaf. Sam checked the shelf, found two green folders, and paused. One held recipes; the other held plans for the garden.\n\nInstead of guessing, Sam carried both to the porch. The note’s author laughed and opened the garden plans. They spent the afternoon deciding where to put a bench. The recipes remained on a nearby chair, and later provided a useful answer to a completely different question.`,
  },
  {
    id: "punctuation",
    text: `The sign said: “Open the box (carefully), then count what’s inside.” There were pencils, postcards, and a note marked ‘Read me first.’ Alex asked, “Is this everyone’s work—or just today’s?” The answer was written on the back: some pieces were finished; others were waiting for a second pair of eyes. Alex made a list: names, dates, questions. One postcard had an exclamation mark! Another ended with an ellipsis… Nobody corrected the writers’ punctuation. The collection was useful precisely because its small differences had survived, and because an uncertain detail remained a question rather than becoming a confident guess.`,
  },
  {
    id: "ordinary",
    text: `On Saturday we repaired the gate behind the library. The hinge was loose, the paint was old, and one board had split near the bottom. We brought a brush, a small tin of paint, and the tools we could carry. The work took longer than expected because the rain returned twice. Between showers, we sat beneath the roof and listened to a reader describe her favorite book. When the gate finally closed without scraping the path, we stood back to look. It was a modest change, but people could use the entrance comfortably again.`,
  },
  {
    id: "technical",
    text: `The display showed Input, Preview, and Export. Each label described an action a person could understand. The input remained available after generation, including its original line breaks. A preview wrapped complete words into rows and used two visible ink colors. Export produced editable text with explicit formatting. The program rejected material that would not fit instead of dropping the last sentence. A saved recipe recorded the chosen font, size, spacing, and link. These details did not guarantee a successful scan. They made a failed attempt easier to inspect, reproduce, and discuss without losing the source.`,
  },
  {
    id: "walk",
    text: `After lunch, the group followed a path through the orchard. The grass was wet, and the trees cast thin shadows across the stones. Near the far wall, a child had arranged fallen apples in a spiral. Nobody knew whether it was a game, a map, or the beginning of an artwork. They left it in place and continued toward the hill. From the top, the workshop looked smaller than it had that morning. Its windows reflected the sky. The day had made room for several useful questions, and there was still time to carry them home.`,
  },
  {
    id: "closing",
    text: `Before leaving, Mira returned to her first question. A useful attempt, she decided, was one that another person could understand well enough to change. Jo added that it should keep a clear record of what happened. They put the crooked circle beside a photograph of the repaired gate and a page of careful measurements. None told the whole story alone. Together, the pieces showed where an idea had worked and where it still needed attention. They switched off the lamps, checked the door, and left the notebooks ready for the next morning.`,
  },
];

export const longProse = passages.map((p) => p.text).join("\n\n");
export const corpus = [
  ...passages.slice(0, 10).map((p) => ({ ...p, repeat: true })),
  { id: "long-single-copy", text: longProse, repeat: false },
];

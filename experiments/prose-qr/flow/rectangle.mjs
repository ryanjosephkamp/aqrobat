import { build } from "./layout.mjs";
// A foreground-text layout adapter: preserve font advance, words, and glyph
// styling; shorten ordinary line spacing rather than squeezing letters.
export function rectangle(spec, metrics) {
  const l = build(spec, metrics),
    lineHeight = spec.fontSize * 1.25;
  const ratio = lineHeight / l.lineHeight;
  const fullHeight = l.modules * l.unit,
    bodyHeight = fullHeight * ratio;
  const padY = l.pad * ratio;
  const update = (s) =>
    s
      .replaceAll(
        `line-height:${l.lineHeight}px`,
        `line-height:${lineHeight}px`,
      )
      .replaceAll(`/${l.lineHeight}px `, `/${lineHeight}px `)
      .replaceAll(`height:${l.lineHeight}px`, `height:${lineHeight}px`)
      .replaceAll(`height:${fullHeight}px`, `height:${bodyHeight}px`)
      .replaceAll(`padding:${l.pad}px`, `padding:${padY}px ${l.pad}px`);
  return {
    ...l,
    markup: update(l.markup),
    content: update(l.content),
    lineHeight,
    padY,
    width: l.side,
    height: Math.ceil(bodyHeight + 2 * padY),
    bodyWidth: l.modules * l.unit,
    bodyHeight,
    structural: {
      ...l.structural,
      lineHeightEm: 1.25,
      maxOpticalHeightToLineHeight:
        l.structural.maxOpticalHeightToLineHeight / ratio,
      aspectRatio: l.unit / (lineHeight * (spec.linesPerModule || 1)),
    },
  };
}

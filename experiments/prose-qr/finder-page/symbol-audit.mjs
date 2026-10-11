/** Post-return diagnostics only. Geometry is never passed to a reader. */
export function auditSymbol(r, layout) {
  const s = r.symbol,
    w = s?.width,
    h = s?.height;
  if (!s?.data?.length || w !== h || w < 21)
    return { complete: false, reason: "Missing square sampled symbol" };
  const finders = [
    [0, 0],
    [w - 7, 0],
    [0, h - 7],
  ].map(([ox, oy]) => {
    let wrong = 0;
    for (let y = 0; y < 7; y++)
      for (let x = 0; x < 7; x++) {
        const expected =
          x === 0 ||
          x === 6 ||
          y === 0 ||
          y === 6 ||
          (x >= 2 && x <= 4 && y >= 2 && y <= 4);
        if ((s.data[(oy + y) * w + ox + x] === 0) !== expected) wrong++;
      }
    const rays = [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, -1],
    ].map(([dx, dy]) => {
      const values = [];
      for (let t = -3; t <= 3; t++)
        values.push(
          s.data[(oy + 3 + dy * t) * w + ox + 3 + dx * t] === 0 ? 1 : 0,
        );
      return {
        dx,
        dy,
        values,
        exact: JSON.stringify(values) === "[1,0,1,1,1,0,1]",
      };
    });
    return { wrong, rays, complete: wrong === 0 && rays.every((r) => r.exact) };
  });
  const lo = layout.quiet * layout.unit,
    hi = (layout.quiet + layout.modules) * layout.unit - 1,
    expected = [
      [lo, lo],
      [hi, lo],
      [hi, hi],
      [lo, hi],
    ],
    actual = [
      r.position.topLeft,
      r.position.topRight,
      r.position.bottomRight,
      r.position.bottomLeft,
    ];
  const intendedQuad = actual.every(
      (p, i) =>
        Math.hypot(p.x - expected[i][0], p.y - expected[i][1]) < layout.unit,
    ),
    intendedDimension = w === layout.modules && h === layout.modules;
  return {
    finders,
    intendedQuad,
    intendedDimension,
    complete:
      intendedQuad && intendedDimension && finders.every((f) => f.complete),
  };
}

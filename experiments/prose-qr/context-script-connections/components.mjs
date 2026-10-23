export function nativeBinaryMetrics(bin) {
  const w = bin.width,
    h = bin.height,
    seen = new Uint8Array(w * h),
    queue = new Int32Array(w * h);
  let ink = 0,
    area = 0,
    emptyRows = 0,
    components = 0,
    largest = null;
  for (let y = 25; y < h - 25; y++) {
    let rowInk = 0;
    for (let x = 25; x < w - 25; x++) {
      rowInk += bin.get(x, y) ? 1 : 0;
      area++;
    }
    ink += rowInk;
    if (!rowInk) emptyRows++;
  }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const pos = y * w + x;
      if (seen[pos] || !bin.get(x, y)) continue;
      let head = 0,
        tail = 1,
        minX = x,
        maxX = x,
        minY = y,
        maxY = y;
      seen[pos] = 1;
      queue[0] = pos;
      while (head < tail) {
        const p = queue[head++],
          px = p % w,
          py = Math.floor(p / w);
        minX = Math.min(minX, px);
        maxX = Math.max(maxX, px);
        minY = Math.min(minY, py);
        maxY = Math.max(maxY, py);
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const xx = px + dx,
              yy = py + dy,
              pp = yy * w + xx;
            if (
              xx < 0 ||
              yy < 0 ||
              xx >= w ||
              yy >= h ||
              seen[pp] ||
              !bin.get(xx, yy)
            )
              continue;
            seen[pp] = 1;
            queue[tail++] = pp;
          }
      }
      components++;
      const c = {
        pixels: tail,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
        bounds: [minX, minY, maxX, maxY],
      };
      c.minimumSpan = Math.min(c.width, c.height);
      c.balance = c.minimumSpan / Math.max(c.width, c.height);
      if (
        !largest ||
        c.minimumSpan > largest.minimumSpan ||
        (c.minimumSpan === largest.minimumSpan && c.pixels > largest.pixels)
      )
        largest = c;
    }
  return {
    occupancy: ink / area,
    ink,
    area,
    emptyRows,
    measuredRows: h - 50,
    components,
    largestBalancedSpanComponent: largest,
    classification:
      "Actual unchanged native jsQR binarization of a word resource; not a finder or reader recovery",
  };
}

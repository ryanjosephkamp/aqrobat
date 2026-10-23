export function geometricRuns(bin, point) {
  const x = Math.round(point.x),
    y = Math.round(point.y),
    result = {};
  for (const [k, dx, dy] of [
    ["horizontal", 1, 0],
    ["vertical", 0, 1],
    ["diagonalDown", 1, 1],
    ["diagonalUp", 1, -1],
  ]) {
    if (!bin.get(x, y)) {
      result[k] = [0, 0, 0, 0, 0];
      continue;
    }
    const ray = (sign) => {
      const lengths = [0, 0, 0];
      let state = 0;
      for (let t = 0; t < Math.max(bin.width, bin.height) * 2; t++) {
        const px = x + sign * dx * t,
          py = y + sign * dy * t;
        if (px < 0 || py < 0 || px >= bin.width || py >= bin.height) break;
        const b = Boolean(bin.get(px, py));
        if (b !== (state % 2 === 0)) {
          state++;
          if (state === 3) break;
        }
        lengths[state]++;
      }
      return lengths;
    };
    const a = ray(-1),
      b = ray(1),
      scale = Math.hypot(dx, dy);
    result[k] = [a[2], a[1], a[0] + b[0] - 1, b[1], b[2]].map((v) => v * scale);
  }
  return result;
}

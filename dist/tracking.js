/* Deterministic silhouette mapping: seeking and export use the same transform. */
const BATrack = (() => {
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  function crop(w, h, zoom, ax, ay) {
    const scale = Math.max(640 / w, 480 / h) * zoom;
    const width = 640 / scale, height = 480 / scale;
    const cx = clamp(ax * w, width / 2, w - width / 2);
    const cy = clamp(ay * h, height / 2, h - height / 2);
    return {x: cx - width / 2, y: cy - height / 2, width, height, cx, cy};
  }
  function bounds(rgba, w, h) {
    const cols = new Uint32Array(w), rows = new Uint32Array(h);
    let total = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (.2126 * rgba[i] + .7152 * rgba[i + 1] + .0722 * rgba[i + 2] < 100) {
        cols[x]++; rows[y]++; total++;
      }
    }
    if (total < Math.max(4, w * h * .0005)) return null;
    // Trim isolated compression specks, then retain a small antialias margin.
    function extent(hist) {
      const tail = total * .002;
      let a = 0, b = hist.length - 1, n = 0;
      while (a < b && n + hist[a] <= tail) n += hist[a++];
      n = 0;
      while (b > a && n + hist[b] <= tail) n += hist[b--];
      return [Math.max(0, a - 3), Math.min(hist.length - 1, b + 3)];
    }
    const [left, right] = extent(cols), [top, bottom] = extent(rows);
    return {x: left, y: top, width: right - left + 1, height: bottom - top + 1};
  }
  return {crop, bounds};
})();
if (typeof module !== 'undefined') module.exports = BATrack;

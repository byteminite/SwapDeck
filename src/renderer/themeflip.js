// The light / dark switch (rail in the Library layout, top bar in Classic). The new colours pour in from the
// button in a shape that is different on every click: an ink splash with random lobes, or a wavy wipe at a
// random angle. Built on the browser's view transitions: the old screen is a still picture, the new one is
// revealed through an animated clip shape.
const rnd = (a, b) => a + Math.random() * (b - a);
const N = 56;

// A smooth closed curve through the points (Catmull-Rom as cubic Beziers), so the edge never shows corners.
function curve(pts) {
  const n = pts.length, f = v => v.toFixed(1), p = i => pts[(i + n) % n];
  let d = 'M' + f(pts[0][0]) + ' ' + f(pts[0][1]);
  for (let i = 0; i < n; i++) {
    const a = p(i - 1), b = p(i), c = p(i + 1), e = p(i + 2);
    d += 'C' + f(b[0] + (c[0] - a[0]) / 6) + ' ' + f(b[1] + (c[1] - a[1]) / 6) + ' ' + f(c[0] - (e[0] - b[0]) / 6) + ' ' + f(c[1] - (e[1] - b[1]) / 6) + ' ' + f(c[0]) + ' ' + f(c[1]);
  }
  return "path('" + d + "Z')";
}

// Ink splash: a blob around the button whose outline wobbles with a few random waves, growing past every corner.
function splash(ox, oy, W, H) {
  const far = Math.hypot(Math.max(ox, W - ox), Math.max(oy, H - oy)) * 1.25;
  const waves = [0, 1, 2].map(() => ({ k: Math.round(rnd(2, 9)), amp: rnd(0.08, 0.32), ph: rnd(0, 6.28) }));
  const spin = rnd(-0.6, 0.6);
  const shape = (r, twist, calm) => Array.from({ length: N }, (_, i) => {
    const a = (i / N) * Math.PI * 2;
    const wob = waves.reduce((s, w) => s + w.amp * Math.sin(w.k * a + w.ph + twist), 0) * (1 - calm);
    const rr = Math.max(0, r * (1 + wob));
    return [ox + Math.cos(a) * rr, oy + Math.sin(a) * rr];
  });
  return [shape(0.5, 0, 0), shape(far * rnd(0.28, 0.42), spin, 0), shape(far * 1.05, spin * 2, 0.6)].map(curve);
}

// Wavy wipe: a front with a random wavy edge sweeps across at a random angle, starting from the button's side.
function wipe(ox, oy, W, H) {
  const ang = Math.atan2(H / 2 - oy, W / 2 - ox) + rnd(-0.9, 0.9), dx = Math.cos(ang), dy = Math.sin(ang), px = -dy, py = dx;
  const D = Math.hypot(W, H), cx = W / 2, cy = H / 2;
  const waves = [0, 1].map(() => ({ f: rnd(1.5, 6) / D, amp: rnd(D * 0.02, D * 0.08), ph: rnd(0, 6.28) }));
  const M = N - 2;
  const at = front => {
    const pts = [];
    for (let i = 0; i < M; i++) {
      const s = -D + (2 * D * i) / (M - 1);
      const w = waves.reduce((t, v) => t + v.amp * Math.sin(v.f * s * 6.28 + v.ph), 0);
      const along = front + w;
      pts.push([cx + dx * along + px * s, cy + dy * along + py * s]);
    }
    pts.push([cx + dx * -D * 3 + px * D, cy + dy * -D * 3 + py * D], [cx + dx * -D * 3 - px * D, cy + dy * -D * 3 - py * D]);
    return curve(pts);
  };
  return [at(-D * 0.75), at(rnd(-0.2, 0.1) * D), at(D * 0.8)];
}

export function flipTheme(btn, apply) {
  const quiet = !document.startViewTransition || document.querySelector('.ls.rm') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (quiet) { apply(); return; }
  const r = btn.getBoundingClientRect(), W = window.innerWidth, H = window.innerHeight;
  const ox = r.left + r.width / 2, oy = r.top + r.height / 2;
  const frames = (Math.random() < 0.6 ? splash : wipe)(ox, oy, W, H);
  document.documentElement.classList.add('flipping');
  const t = document.startViewTransition(apply);
  t.ready.then(() => {
    document.documentElement.animate({ clipPath: frames, offset: [0, rnd(0.35, 0.55), 1] }, { duration: rnd(1400, 1750), easing: 'cubic-bezier(.4,0,.2,1)', pseudoElement: '::view-transition-new(root)' });
  }).catch(() => {});
  t.finished.finally(() => document.documentElement.classList.remove('flipping'));
}

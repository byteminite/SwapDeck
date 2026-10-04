// Settings → Displays: the "Normal setup" map and monitor list.
// The map previews the normal layout the way main/display.js normalLayout() builds it:
// monitors in use at their remembered spot (or to the right at their best mode), the main one at 0,0.
// Monitors that aren't in use are drawn dashed after the others, where Windows would put them.

const MAP_W = 520, MAP_H = 150, PAD = 14;

function preview(mons, onIds, mainId, pos) {
  const on = new Set(onIds);
  const boxes = mons.map(m => {
    const used = on.has(m.id) || m.id === mainId;
    const p = pos[m.id] || (m.attached ? { x: m.x, y: m.y, w: m.w, h: m.h } : null);
    return { m, used, x: p ? p.x : null, y: p ? p.y : null, w: (p && p.w) || m.w || 1920, h: (p && p.h) || m.h || 1080 };
  });
  // Boxes without a known spot, and unused ones, go after the used ones.
  const usedB = boxes.filter(b => b.used && b.x != null);
  let right = usedB.length ? Math.max(...usedB.map(b => b.x + b.w)) : 0;
  for (const b of boxes) if (b.used && b.x == null) { b.x = right; b.y = 0; right += b.w; }
  const top = usedB.length ? Math.min(...usedB.map(b => b.y)) : 0;
  for (const b of boxes) if (!b.used) { b.x = right + 200; b.y = top; right = b.x + b.w; }
  const minX = Math.min(...boxes.map(b => b.x)), minY = Math.min(...boxes.map(b => b.y));
  const maxX = Math.max(...boxes.map(b => b.x + b.w)), maxY = Math.max(...boxes.map(b => b.y + b.h));
  const k = Math.min((MAP_W - PAD * 2) / (maxX - minX), (MAP_H - PAD * 2) / (maxY - minY));
  const ox = (MAP_W - (maxX - minX) * k) / 2, oy = (MAP_H - (maxY - minY) * k) / 2;
  return boxes.map(b => ({ ...b, l: ox + (b.x - minX) * k, t: oy + (b.y - minY) * k, pw: b.w * k - 4, ph: b.h * k - 4 }));
}

const spec = m => m.w + '×' + m.h + (m.hz ? ' · ' + m.hz + ' Hz' : '');

// st: { monitors, settings: { normalOn, normalMon }, monPos }; ui: { applying, err }
// act: { setNormal(patch), apply() }
export function displayVals(st, ui, act) {
  const mons = st.monitors || [];
  const s = st.settings || {};
  const onIds = s.normalOn || mons.filter(m => m.attached).map(m => m.id);
  const mainId = s.normalMon;
  const on = new Set(onIds);
  const used = m => on.has(m.id) || m.id === mainId;

  const toggle = m => {
    if (m.id === mainId) return; // the main monitor is always in use
    act.setNormal({ normalOn: used(m) ? onIds.filter(x => x !== m.id) : [...onIds, m.id] });
  };
  const makeMain = m => act.setNormal({ normalMon: m.id, normalOn: used(m) ? onIds : [...onIds, m.id] });

  const boxes = mons.length ? preview(mons, onIds, mainId, st.monPos || {}) : [];
  // Percentages of the map box (which keeps a 520:150 shape), so it scales with the window.
  const dLayout = boxes.map(b => ({
    l: (b.l / MAP_W * 100) + '%', t: (b.t / MAP_H * 100) + '%', w: (b.pw / MAP_W * 100) + '%', h: (b.ph / MAP_H * 100) + '%',
    num: b.m.num, name: b.m.label, primary: b.m.id === mainId, off: !b.used,
    fs: b.ph > 70 ? '18px' : '13px',
    bd: b.m.id === mainId ? '1.5px solid var(--accent)' : b.used ? '1.5px solid rgba(var(--fg-rgb),.3)' : '1.5px dashed rgba(var(--fg-rgb),.22)',
    bg: b.m.id === mainId ? 'rgba(var(--accent-rgb),.14)' : b.used ? 'rgba(var(--fg-rgb),.06)' : 'transparent',
    op: b.used ? 1 : 0.6,
    tip: b.m.label + ' (' + b.m.num + ') · ' + spec(b.m) + (b.used ? '' : ' · click to use it normally'),
    on: () => toggle(b.m),
  }));

  const dMons = mons.map(m => {
    const u = used(m), main = m.id === mainId;
    return {
      num: m.num, name: m.label, spec: spec(m),
      now: m.attached ? (m.primary ? 'on, main now' : 'on now') : 'off in Windows now',
      bd: main ? 'rgba(var(--accent-rgb),.45)' : 'rgba(var(--fg-rgb),.1)',
      bg: main ? 'rgba(var(--accent-rgb),.06)' : 'transparent',
      useLabel: u ? 'In use' : 'Not used',
      useBd: u ? 'rgba(var(--fg-rgb),.2)' : 'rgba(var(--fg-rgb),.1)',
      useBg: u ? 'rgba(var(--fg-rgb),.07)' : 'transparent',
      useFg: u ? 'var(--text)' : 'var(--text-subtle)',
      mainBd: main ? 'var(--accent)' : 'rgba(var(--fg-rgb),.12)',
      mainBg: main ? 'rgba(var(--accent-rgb),.16)' : 'transparent',
      mainFg: main ? 'var(--accent-strong)' : 'var(--text-subtle)',
      onUse: () => toggle(m), onMain: () => makeMain(m),
    };
  });

  // Does the current Windows layout match the normal setup?
  const dirty = mons.length > 0 && mons.some(m => m.attached !== used(m) || (m.id === mainId && !m.primary));
  const mainMon = mons.find(m => m.id === mainId);

  return {
    dLayout, dMons, dDirty: dirty && !st.session, dApplying: !!ui.applying, dErr: ui.err || null,
    dNoMons: mons.length ? null : "Couldn't read your monitors.",
    dTestName: mainMon ? mainMon.label : 'a monitor',
    onDApply: act.apply,
  };
}

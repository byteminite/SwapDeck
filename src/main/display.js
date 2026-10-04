// Monitor control for per-game display profiles: list monitors, make one primary, use only one,
// and restore the layout SwapDeck saved before changing anything.
// The work happens in display-helper.cs, compiled once by PowerShell into a DLL in app data.

const { screen } = require('electron');
const { createHelper } = require('./native');

const run = createHelper({ name: 'display', version: 8, source: 'display-helper.cs', cls: 'SDDisplay' });

async function rawList() {
  const out = await run('list');
  return JSON.parse(out.slice(out.indexOf('[')));
}

// A monitor's id is its stable hardware key (EDID id + instance). Windows' \.DISPLAYn name can change
// (a switched-off monitor may sit on any free output), so it's only used when talking to Windows.
// Older settings stored the DISPLAYn name, so ids that look like one still match.
const idOf = m => m.key || m.name;
const byId = (raw, id) => raw.find(m => idOf(m) === id) || raw.find(m => m.name === id) || null;
function nameOf(raw, id) {
  const m = byId(raw, id);
  if (!m) throw new Error("That monitor isn't connected right now.");
  return m.name;
}

// Monitors with model names (from EDID; Electron's label as a fallback for active ones).
// Switched-off monitors report their best mode, since that's what SwapDeck would switch them on with.
async function list() {
  const raw = await rawList();
  const eds = screen.getAllDisplays().map(d => ({ d, r: screen.dipToScreenRect(null, d.bounds) }));
  const mons = raw.map(m => {
    const e = m.attached ? eds.find(x => Math.abs(x.r.x - m.x) < 4 && Math.abs(x.r.y - m.y) < 4) : null;
    const label = m.monitor || (e && e.d.label) || '';
    const w = m.attached ? m.w : m.bw, h = m.attached ? m.h : m.bh, hz = m.attached ? m.hz : m.bhz;
    return { id: idOf(m), name: m.name, hwid: m.hwid, label, attached: m.attached, primary: m.primary, x: m.x, y: m.y, w, h, hz, or: m.or, portrait: h > w };
  });
  // Number them like Windows does (DISPLAY1 → 1), and name unnamed ones.
  for (const m of mons) { m.num = (m.name.match(/(\d+)$/) || [, '?'])[1]; if (!m.label) m.label = 'Display ' + m.num; }
  return mons;
}

// Saved layouts name each monitor by its hardware key, not DISPLAYn: Windows can renumber the outputs when
// monitors are switched on and off (e.g. turning the sim rig monitor on for a game). Just before a layout is
// applied, toNames() swaps each key for the monitor's current DISPLAYn name. Older saved layouts that still
// use DISPLAYn names are matched by name.
const serialize = raw => raw.map(m => [m.key || m.name, m.attached ? 1 : 0, m.primary ? 1 : 0, m.x, m.y, m.w, m.h, m.hz, m.fo == null ? -1 : m.fo, m.or == null ? -1 : m.or].join('|')).join(';');
function toNames(layout, raw) {
  return layout.split(';').filter(Boolean).map(part => {
    const f = part.split('|'), m = byId(raw, f[0]);
    return m ? [m.name, ...f.slice(1)].join('|') : null; // a monitor that's been unplugged is skipped
  }).filter(Boolean).join(';');
}
async function runLayout(layout) { return run('restore', toNames(layout, await rawList())); }

async function check(out) {
  if (out !== 'ok') throw new Error('Windows refused the display change (' + out.replace(/^error:/, '') + ').');
}

// Resolutions a monitor offers: [{ w, h, hz }], biggest first.
async function modes(id) {
  const out = await run('modes', nameOf(await rawList(), id));
  return JSON.parse(out.slice(out.indexOf('['))).map(([w, h, hz]) => ({ w, h, hz }));
}

// A layout with one monitor at a different resolution (and optionally stretched). Monitors to the
// right of / below it move by the size difference so the desktop stays joined up.
function withResolution(raw, name, res) {
  const t = raw.find(m => m.name === name && m.attached);
  if (!t) throw new Error("That monitor isn't switched on.");
  const dw = res.w - t.w, dh = res.h - t.h;
  return serialize(raw.map(m => {
    if (m === t) return { ...m, w: res.w, h: res.h, hz: res.hz || 0, fo: res.stretch ? 2 : (t.fo === 2 ? 0 : t.fo) };
    if (!m.attached) return m;
    return { ...m, x: m.x >= t.x + t.w ? m.x + dw : m.x, y: m.y >= t.y + t.h ? m.y + dh : m.y };
  }));
}

// A snapshot of the current setup, to restore later: Windows' own display configuration (exact, including
// rotation, and independent of DISPLAYn numbering) plus SwapDeck's per-monitor layout as a fallback.
async function snapshot(raw) {
  const ccd = await run('ccdsave').catch(() => '');
  return (ccd.startsWith('ccd:') ? ccd : '') + '\n' + serialize(raw || await rawList());
}

// Game display profile: optionally make a monitor primary / the only one, then optionally change
// the resolution of that monitor (or of the primary). Returns the snapshot from before the change,
// so the caller can persist it for "Restore display now".
async function apply(id, mode, res) {
  const raw0 = await rawList();
  const before = await snapshot(raw0);
  const name = id ? nameOf(raw0, id) : null;
  if (name) {
    // A failed change can leave some monitors already written: put the old layout back.
    try { await check(await run(mode === 'only' ? 'only' : 'primary', name)); }
    catch (e) { await restore(before).catch(() => {}); throw e; }
  }
  if (res && res.w && res.h) {
    try {
      const raw = await rawList();
      const t = name ? raw.find(m => m.name === name) : raw.find(m => m.primary);
      if (!t) throw new Error("Couldn't find the monitor to change.");
      await check(await runLayout(withResolution(raw, t.name, await pickMode(t, res))));
    } catch (e) { await restore(before).catch(() => {}); throw e; }
  }
  return before;
}

// Match a resolution profile to a mode the monitor really offers. With no refresh rate in the
// profile, the fastest one available at that size is used.
async function pickMode(t, res) {
  const out = await run('modes', t.name);
  const all = JSON.parse(out.slice(out.indexOf('['))).map(([w, h, hz]) => ({ w, h, hz }));
  const label = t.monitor || t.name;
  const same = all.filter(m => m.w === res.w && m.h === res.h);
  if (!same.length) {
    const err = new Error(label + " doesn't offer " + res.w + '×' + res.h + '. If you made it in the NVIDIA or AMD control panel, check it was made for this monitor and that the panel’s Test passed, then restart SwapDeck.');
    err.code = 'NO_MODE';
    throw err;
  }
  if (res.hz && !same.some(m => m.hz === res.hz)) {
    const err = new Error(label + ' runs ' + res.w + '×' + res.h + ' at ' + same.map(m => m.hz + ' Hz').join(', ') + ', not ' + res.hz + ' Hz. Clear the Hz box to use the fastest.');
    err.code = 'NO_MODE';
    throw err;
  }
  return { ...res, hz: res.hz || Math.max(...same.map(m => m.hz)) };
}

// Put a snapshot back. Returns { fallback: true } when only Windows' "Extend" worked, so the caller can then
// apply the normal setup (to switch off monitors that aren't part of it).
async function restore(saved) {
  if (!saved) throw new Error('Nothing to restore.');
  const nl = saved.indexOf('\n'), ccd = nl >= 0 ? saved.slice(0, nl) : '', layout = nl >= 0 ? saved.slice(nl + 1) : saved;
  // 1. Windows' saved configuration: exact, rotation included.
  if (ccd.startsWith('ccd:') && (await run('ccdrestore', ccd.slice(4)).catch(() => '')) === 'ok') return { ok: true };
  // 2. SwapDeck's per-monitor layout.
  if (layout) { try { await check(await runLayout(layout)); return { ok: true }; } catch {} }
  // 3. A monitor probably dropped out (many DisplayPort monitors disconnect when they're switched off):
  //    let Windows switch every connected monitor on in its remembered arrangement, like Win+P > Extend.
  await check(await run('extend'));
  return { ok: true, fallback: true };
}

// The user's normal setup as a layout string: monitors in normalOn switched on (at their remembered
// position, or to the right of the others at their best mode), everything else off, normalMon primary at 0,0.
function normalLayout(raw, onIds, primaryId, pos) {
  const on = new Set(onIds);
  if (primaryId) on.add(primaryId);
  const ms = raw.map(m => {
    const id = idOf(m), want = on.has(id) || on.has(m.name), main = id === primaryId || m.name === primaryId;
    if (!want && !main) return { ...m, attached: false, primary: false };
    const p = pos[id] || pos[m.name] || (m.attached ? { x: m.x, y: m.y, w: m.w, h: m.h, hz: m.hz, or: m.or } : null);
    // Normal setup never keeps a game's stretched scaling.
    return { ...m, attached: true, primary: main, fo: m.fo === 2 ? 0 : m.fo, ...(p || { x: null, y: null, w: m.bw, h: m.bh, hz: m.bhz }) };
  });
  if (!ms.some(m => m.attached && m.w > 0)) throw new Error('Pick at least one monitor for your normal setup.');
  if (!ms.some(m => m.primary)) { const f = ms.find(m => m.attached); f.primary = true; }
  let right = Math.max(0, ...ms.filter(m => m.attached && m.x != null).map(m => m.x + m.w));
  for (const m of ms) if (m.attached && m.x == null) { m.x = right; m.y = 0; right += m.w; }
  const p = ms.find(m => m.primary), dx = p.x, dy = p.y;
  for (const m of ms) if (m.attached) { m.x -= dx; m.y -= dy; }
  return serialize(ms);
}

async function applyNormal(onIds, primaryId, pos) {
  let raw = await rawList();
  // A monitor of the normal setup is off: let Windows switch everything on first (it remembers rotation and
  // position), then switch off what isn't part of the normal setup.
  const want = new Set([...(onIds || []), primaryId].filter(Boolean));
  if ([...want].some(id => { const m = byId(raw, id); return !m || !m.attached; })) {
    await run('extend').catch(() => {});
    raw = await rawList();
  }
  await check(await runLayout(normalLayout(raw, onIds, primaryId, pos)));
}

async function makePrimary(id) {
  await check(await run('primary', nameOf(await rawList(), id)));
}

module.exports = { list, modes, apply, restore, snapshot, applyNormal, normalLayout, withResolution, makePrimary, rawList, serialize, toNames };

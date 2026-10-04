// Monitor control for per-game display profiles: list monitors, make one primary, use only one,
// and restore the layout SwapDeck saved before changing anything.
// The work happens in display-helper.cs, compiled once by PowerShell into a DLL in app data.

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { app, screen } = require('electron');

const VERSION = 4;
const PS1 = `param([string]$Op, [string]$Target, [string]$DllPath, [string]$SrcPath)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $DllPath)) { Add-Type -Path $SrcPath -OutputAssembly $DllPath -OutputType Library }
Add-Type -Path $DllPath
$t = if ($Target -eq '_none_') { '' } else { $Target }
[SDDisplay]::Run($Op, $t)
`;

let paths = null;
function ensureFiles() {
  if (paths) return paths;
  const dir = app.getPath('userData');
  const src = path.join(dir, `sd-display-v${VERSION}.cs`);
  const ps1 = path.join(dir, `sd-display-v${VERSION}.ps1`);
  const dll = path.join(dir, `sd-display-v${VERSION}.dll`);
  // Copy out of the (possibly packed) app so PowerShell can read it.
  if (!fs.existsSync(src)) fs.writeFileSync(src, fs.readFileSync(path.join(__dirname, 'display-helper.cs'), 'utf8'));
  fs.writeFileSync(ps1, PS1);
  paths = { src, ps1, dll };
  return paths;
}

function run(cmd, arg) {
  const p = ensureFiles();
  return new Promise((resolve, reject) => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', p.ps1,
      '-Op', cmd, '-Target', arg || '_none_', '-DllPath', p.dll, '-SrcPath', p.src],
    { windowsHide: true, timeout: 60000 }, (err, stdout, stderr) => {
      const out = String(stdout || '').trim();
      if (err && !out) return reject(new Error(String(stderr || err.message).trim().split('\n')[0]));
      resolve(out);
    });
  });
}

async function rawList() {
  const out = await run('list');
  return JSON.parse(out.slice(out.indexOf('[')));
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
    return { id: m.name, hwid: m.hwid, label, attached: m.attached, primary: m.primary, x: m.x, y: m.y, w, h, hz, portrait: h > w };
  });
  // Number them like Windows does (DISPLAY1 → 1), and name unnamed ones.
  for (const m of mons) { m.num = (m.id.match(/(\d+)$/) || [, '?'])[1]; if (!m.label) m.label = 'Display ' + m.num; }
  return mons;
}

const serialize = raw => raw.map(m => [m.name, m.attached ? 1 : 0, m.primary ? 1 : 0, m.x, m.y, m.w, m.h, m.hz, m.fo == null ? -1 : m.fo].join('|')).join(';');

async function check(out) {
  if (out !== 'ok') throw new Error('Windows refused the display change (' + out.replace(/^error:/, '') + ').');
}

// Resolutions a monitor offers: [{ w, h, hz }], biggest first.
async function modes(id) {
  const out = await run('modes', id);
  return JSON.parse(out.slice(out.indexOf('['))).map(([w, h, hz]) => ({ w, h, hz }));
}

// A layout with one monitor at a different resolution (and optionally stretched). Monitors to the
// right of / below it move by the size difference so the desktop stays joined up.
function withResolution(raw, id, res) {
  const t = raw.find(m => m.name === id && m.attached);
  if (!t) throw new Error("That monitor isn't switched on.");
  const dw = res.w - t.w, dh = res.h - t.h;
  return serialize(raw.map(m => {
    if (m === t) return { ...m, w: res.w, h: res.h, hz: res.hz || 0, fo: res.stretch ? 2 : (t.fo === 2 ? 0 : t.fo) };
    if (!m.attached) return m;
    return { ...m, x: m.x >= t.x + t.w ? m.x + dw : m.x, y: m.y >= t.y + t.h ? m.y + dh : m.y };
  }));
}

// Game display profile: optionally make a monitor primary / the only one, then optionally change
// the resolution of that monitor (or of the primary). Returns the layout from before the change,
// so the caller can persist it for "Restore display now".
async function apply(id, mode, res) {
  const before = serialize(await rawList());
  if (id) await check(await run(mode === 'only' ? 'only' : 'primary', id));
  if (res && res.w && res.h) {
    const raw = await rawList();
    const target = id || (raw.find(m => m.primary) || {}).name;
    try { await check(await run('restore', withResolution(raw, target, res))); }
    catch (e) { await run('restore', before).catch(() => {}); throw e; }
  }
  return before;
}

async function restore(saved) {
  if (!saved) throw new Error('Nothing to restore.');
  await check(await run('restore', saved));
}

// The user's normal setup as a layout string: monitors in normalOn switched on (at their remembered
// position, or to the right of the others at their best mode), everything else off, normalMon primary at 0,0.
function normalLayout(raw, onIds, primaryId, pos) {
  const on = new Set(onIds);
  if (primaryId) on.add(primaryId);
  const ms = raw.map(m => {
    if (!on.has(m.name)) return { ...m, attached: false, primary: false };
    const p = pos[m.name] || (m.attached ? { x: m.x, y: m.y, w: m.w, h: m.h, hz: m.hz } : null);
    // Normal setup never keeps a game's stretched scaling.
    return { ...m, attached: true, primary: m.name === primaryId, fo: m.fo === 2 ? 0 : m.fo, ...(p || { x: null, y: null, w: m.bw, h: m.bh, hz: m.bhz }) };
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
  await check(await run('restore', normalLayout(await rawList(), onIds, primaryId, pos)));
}

async function makePrimary(id) {
  await check(await run('primary', id));
}

module.exports = { list, modes, apply, restore, applyNormal, normalLayout, withResolution, makePrimary, rawList, serialize };

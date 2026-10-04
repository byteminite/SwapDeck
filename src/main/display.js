// Monitor control for per-game display profiles: list monitors, make one primary, use only one,
// and restore the layout SwapDeck saved before changing anything.
// The work happens in display-helper.cs, compiled once by PowerShell into a DLL in app data.

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { app, screen } = require('electron');

const VERSION = 3;
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

const serialize = raw => raw.map(m => [m.name, m.attached ? 1 : 0, m.primary ? 1 : 0, m.x, m.y, m.w, m.h, m.hz].join('|')).join(';');

async function check(out) {
  if (out !== 'ok') throw new Error('Windows refused the display change (' + out.replace(/^error:/, '') + ').');
}

// Returns the layout before the change, so the caller can persist it for "Restore display now".
async function apply(id, mode) {
  const before = serialize(await rawList());
  await check(await run(mode === 'only' ? 'only' : 'primary', id));
  return before;
}

async function restore(saved) {
  if (!saved) throw new Error('Nothing to restore.');
  await check(await run('restore', saved));
}

async function makePrimary(id) {
  await check(await run('primary', id));
}

module.exports = { list, apply, restore, makePrimary, rawList, serialize };

// Minecraft modpacks installed with Modrinth, CurseForge or Prism Launcher, listed as games. Everything here only
// reads the launchers' files; packs are started the way the launchers' own "Create shortcut" does it, and
// Minecraft itself is found by the javaw.exe whose command line points at the pack's folder.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn, execFile } = require('child_process');
const { shell } = require('electron');

const env = k => process.env[k] || '';
const exists = p => { try { return !!p && fs.existsSync(p); } catch { return false; } };
const firstFile = list => list.find(exists) || null;
const hash = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 16);
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Pack ids end up in a link or a command-line argument: no control characters, no path or URL syntax, no "-" start.
const safeId = s => typeof s === 'string' && s.length > 0 && s.length < 200 && !/[\u0000-\u001f\\/?#"]/.test(s) && !s.startsWith('-');

const LAUNCHERS = {
  modrinth: { label: 'Modrinth', exe: () => firstFile([path.join(env('LOCALAPPDATA'), 'Modrinth App', 'Modrinth App.exe'), path.join(env('LOCALAPPDATA'), 'Programs', 'Modrinth App', 'Modrinth App.exe'), path.join(env('ProgramFiles'), 'Modrinth App', 'Modrinth App.exe')]) },
  curseforge: { label: 'CurseForge', exe: () => firstFile([path.join(env('LOCALAPPDATA'), 'Programs', 'CurseForge Windows', 'CurseForge.exe'), path.join(env('ProgramFiles(x86)'), 'Overwolf', 'OverwolfLauncher.exe')]) },
  prism: { label: 'Prism Launcher', exe: () => firstFile([path.join(env('LOCALAPPDATA'), 'Programs', 'PrismLauncher', 'prismlauncher.exe'), path.join(env('ProgramFiles'), 'PrismLauncher', 'prismlauncher.exe')]) },
};

// Modrinth App: its own database lists every instance with its id (as used in its launch link), folder and icon.
function modrinth() {
  const base = path.join(env('APPDATA'), 'ModrinthApp'), db = path.join(base, 'app.db'), exe = LAUNCHERS.modrinth.exe();
  if (!exe || !exists(db)) return [];
  let rows = [];
  try {
    const { DatabaseSync } = require('node:sqlite');
    const d = new DatabaseSync(db, { readOnly: true });
    try { rows = d.prepare("select id, path, name, icon_path, last_played, submitted_time_played, recent_time_played from instances where install_stage = 'installed'").all(); }
    finally { d.close(); }
  } catch { return []; }
  return rows.filter(r => safeId(r.id) && typeof r.path === 'string').map(r => ({
    launcher: 'modrinth', packId: r.id, name: String(r.name || r.path), folder: path.join(base, 'profiles', r.path),
    icon: typeof r.icon_path === 'string' ? r.icon_path : null, lastPlayed: (Number(r.last_played) || 0) * 1000,
    secs: (Number(r.submitted_time_played) || 0) + (Number(r.recent_time_played) || 0), exe,
  }));
}

// CurseForge: one minecraftinstance.json per pack; its guid is what the app's own shortcuts use.
function curseforge() {
  const root = path.join(env('USERPROFILE'), 'curseforge', 'minecraft', 'Instances'), exe = LAUNCHERS.curseforge.exe();
  if (!exe || !exists(root)) return [];
  const out = [];
  for (const dir of fs.readdirSync(root, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const folder = path.join(root, dir.name);
    try {
      const j = JSON.parse(fs.readFileSync(path.join(folder, 'minecraftinstance.json'), 'utf8'));
      if (!GUID.test(String(j.guid))) continue;
      const own = typeof j.profileImagePath === 'string' && j.profileImagePath ? j.profileImagePath : null;
      out.push({ launcher: 'curseforge', packId: String(j.guid), name: String(j.name || dir.name), folder,
        icon: firstFile([own, path.join(folder, 'cf-modpack.ico')]), lastPlayed: Date.parse(j.lastPlayed) || 0,
        secs: (Number(j.timePlayed) || 0) / 1000, exe });
    } catch { /* not a pack folder, or half-installed */ }
  }
  return out;
}

// Prism Launcher: instances\<id>\instance.cfg; the folder name is the id its --launch option takes.
function prism() {
  const base = path.join(env('APPDATA'), 'PrismLauncher'), root = path.join(base, 'instances'), exe = LAUNCHERS.prism.exe();
  if (!exe || !exists(root)) return [];
  const out = [];
  for (const dir of fs.readdirSync(root, { withFileTypes: true })) {
    if (!dir.isDirectory() || !safeId(dir.name)) continue;
    const folder = path.join(root, dir.name), cfgFile = path.join(folder, 'instance.cfg');
    if (!exists(cfgFile)) continue;
    const cfg = Object.fromEntries(fs.readFileSync(cfgFile, 'utf8').split(/\r?\n/).map(l => { const i = l.indexOf('='); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : null; }).filter(Boolean));
    const icon = cfg.iconKey ? firstFile(['.png', '.jpg', '.ico'].map(x => path.join(base, 'icons', cfg.iconKey + x))) : null;
    out.push({ launcher: 'prism', packId: dir.name, name: cfg.name || dir.name, folder, icon,
      lastPlayed: Number(cfg.lastLaunchTime) || 0, secs: (Number(cfg.totalTimePlayed) || 0), exe });
  }
  return out;
}

// Scans are cheap but the library is rebuilt often, so keep the result for a few seconds.
let cache = null, cacheAt = 0;
function scan(enabled = true) {
  if (!enabled || process.platform !== 'win32') return [];
  if (cache && Date.now() - cacheAt < 15000) return cache;
  const list = [];
  for (const f of [modrinth, curseforge, prism]) { try { list.push(...f()); } catch { /* one launcher failing never hides the others */ } }
  cache = list.map(p => ({ ...p, id: 'mc:' + p.launcher + ':' + hash(p.launcher + '\n' + p.packId), label: LAUNCHERS[p.launcher].label }));
  cacheAt = Date.now();
  return cache;
}
const iconOf = key => { const p = (cache || scan()).find(x => x.id.endsWith(':' + key)); return p && exists(p.icon) ? p.icon : null; };

// Start a pack exactly as the launcher's own desktop shortcut would.
function launch(p) {
  if (p.launcher === 'curseforge') {
    if (!GUID.test(p.packId)) throw new Error("This pack's id doesn't look right.");
    return shell.openExternal('curseforge://launch-game?instanceId=' + p.packId + '&gameId=432');
  }
  if (!safeId(p.packId) || !exists(p.exe)) throw new Error(LAUNCHERS[p.launcher].label + " isn't installed where SwapDeck expects it.");
  const args = p.launcher === 'modrinth'
    ? ['modrinth://launch/instance/' + encodeURIComponent(p.packId).replace(/%3A/gi, ':')]
    : ['--launch', p.packId];
  const c = spawn(p.exe, args, { cwd: path.dirname(p.exe), detached: true, stdio: 'ignore', windowsHide: false });
  c.on('error', () => {});
  c.unref();
}

// Minecraft runs as java(w).exe with the pack folder on its command line (--gameDir and the classpath).
function findGame(folder) {
  const want = path.resolve(folder).toLowerCase().replace(/[\\/]+$/, '');
  // UTF-8 output, or folder names like "Prominence™ II" would never match.
  const ps = "[Console]::OutputEncoding = [Text.Encoding]::UTF8; Get-CimInstance Win32_Process -Filter \"Name='javaw.exe' OR Name='java.exe'\" | ForEach-Object { [string]$_.ProcessId + [char]9 + $_.CommandLine }";
  return new Promise(resolve => execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { windowsHide: true, timeout: 20000, encoding: 'utf8' }, (e, out) => {
    for (const line of String(out || '').split(/\r?\n/)) {
      const i = line.indexOf('\t');
      if (i > 0 && line.slice(i + 1).toLowerCase().replace(/\//g, '\\').includes(want)) return resolve(Number(line.slice(0, i)));
    }
    resolve(null);
  }));
}
const alive = pid => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };

module.exports = { scan, iconOf, launch, findGame, alive, safeId, LAUNCHERS };

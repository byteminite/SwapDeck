// Everything that touches the local Steam install: registry, process, loginusers.vdf,
// avatars and installed games.

const fs = require('fs');
const path = require('path');
const { execFile, spawn } = require('child_process');
const vdf = require('./vdf');

const REG_KEY = 'HKCU\\Software\\Valve\\Steam';
const STEAMID64_BASE = 76561197960265728n;
const DEFAULT_DIRS = [
  'C:\\Program Files (x86)\\Steam',
  'C:\\Program Files\\Steam',
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

function run(cmd, args, opts = {}) {
  return new Promise(resolve => {
    execFile(cmd, args, { windowsHide: true, timeout: 15000, ...opts }, (err, stdout, stderr) => {
      resolve({ err, stdout: String(stdout || ''), stderr: String(stderr || '') });
    });
  });
}

// ---------- registry ----------

async function regRead(key) {
  const { err, stdout } = await run('reg', ['query', key]);
  if (err) return {};
  const out = {};
  for (const line of stdout.split(/\r?\n/)) {
    const m = line.match(/^\s{4}(.+?)\s{4}(REG_\w+)\s{4}(.*)$/) || line.match(/^\s{4}(.+?)\s{4}(REG_\w+)$/);
    if (!m) continue;
    let v = m[3] ?? '';
    if (m[2] === 'REG_DWORD' || m[2] === 'REG_QWORD') v = parseInt(v, 16);
    out[m[1]] = v;
  }
  return out;
}

async function regSet(name, type, data) {
  const { err, stderr } = await run('reg', ['add', REG_KEY, '/v', name, '/t', type, '/d', String(data), '/f']);
  if (err) throw new Error('Registry write failed: ' + (stderr.trim() || err.message));
}

async function readSteamReg() {
  const [main, active] = await Promise.all([regRead(REG_KEY), regRead(REG_KEY + '\\ActiveProcess')]);
  return {
    steamExe: main.SteamExe || null,
    steamPath: main.SteamPath || null,
    autoLoginUser: main.AutoLoginUser || '',
    activeUser: typeof active.ActiveUser === 'number' ? active.ActiveUser : 0,
    runningAppId: typeof main.RunningAppID === 'number' ? main.RunningAppID : 0,
  };
}

// ---------- locating Steam ----------

function exeIn(dir) {
  const p = path.join(dir, 'steam.exe');
  return fs.existsSync(p) ? p : null;
}

async function locate(customExe) {
  const checked = [];
  if (customExe) {
    checked.push(customExe);
    if (fs.existsSync(customExe)) return { exe: customExe, dir: path.dirname(customExe), checked };
  }
  const reg = await readSteamReg();
  checked.push(REG_KEY);
  for (const cand of [reg.steamExe, reg.steamPath && path.join(reg.steamPath, 'steam.exe')]) {
    if (cand) {
      const p = path.normalize(cand);
      if (fs.existsSync(p)) return { exe: p, dir: path.dirname(p), checked };
    }
  }
  for (const d of DEFAULT_DIRS) {
    checked.push(d + '\\');
    const p = exeIn(d);
    if (p) return { exe: p, dir: d, checked };
  }
  return { exe: null, dir: null, checked };
}

// ---------- process ----------

async function isRunning() {
  const { stdout } = await run('tasklist', ['/FI', 'IMAGENAME eq steam.exe', '/FO', 'CSV', '/NH']);
  return /"steam\.exe"/i.test(stdout);
}

function sidFromAccountId(id) {
  return (STEAMID64_BASE + BigInt(id)).toString();
}
function accountIdFromSid(sid) {
  return Number(BigInt(sid) - STEAMID64_BASE);
}

async function status() {
  const [running, reg] = await Promise.all([isRunning(), readSteamReg()]);
  return {
    running,
    activeSid: running && reg.activeUser ? sidFromAccountId(reg.activeUser) : null,
    autoLoginUser: reg.autoLoginUser,
  };
}

function splitArgs(s) {
  const out = [];
  const re = /"([^"]*)"|(\S+)/g;
  let m;
  while ((m = re.exec(s || ''))) out.push(m[1] ?? m[2]);
  return out;
}

function start(exe, extraArgs, args = []) {
  const child = spawn(exe, [...splitArgs(extraArgs), ...args], {
    cwd: path.dirname(exe), detached: true, stdio: 'ignore', windowsHide: false,
  });
  child.on('error', () => {});
  child.unref();
}

async function waitFor(fn, timeoutMs, stepMs = 500) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (await fn()) return true;
    await sleep(stepMs);
  }
  return false;
}

async function shutdown(exe) {
  if (!(await isRunning())) return;
  if (exe) start(exe, '', ['-shutdown']);
  if (await waitFor(async () => !(await isRunning()), 10000)) return;
  // Graceful shutdown timed out; force it like other switchers do.
  await run('taskkill', ['/F', '/T', '/IM', 'steam.exe']);
  if (await waitFor(async () => !(await isRunning()), 5000)) return;
  const e = new Error("Steam didn't close");
  e.code = 'CLOSE_TIMEOUT';
  throw e;
}

// ---------- loginusers.vdf ----------

function loginUsersPath(dir) {
  return path.join(dir, 'config', 'loginusers.vdf');
}

function readLoginUsersRaw(dir) {
  const p = loginUsersPath(dir);
  if (!fs.existsSync(p)) return { users: {} };
  const data = vdf.parse(fs.readFileSync(p, 'utf8'));
  if (!vdf.get(data, 'users')) data.users = {};
  return data;
}

function writeLoginUsersRaw(dir, data) {
  const p = loginUsersPath(dir);
  if (fs.existsSync(p)) fs.copyFileSync(p, p + '.swapdeck.bak');
  const tmp = p + '.swapdeck.tmp';
  fs.writeFileSync(tmp, vdf.stringify(data), 'utf8');
  fs.renameSync(tmp, p);
}

function listAccounts(dir) {
  if (!dir) return [];
  const users = vdf.get(readLoginUsersRaw(dir), 'users') || {};
  return Object.entries(users)
    .filter(([sid, u]) => /^\d{17}$/.test(sid) && u && typeof u === 'object')
    .map(([sid, u]) => ({
      sid,
      login: vdf.get(u, 'AccountName') || '',
      persona: vdf.get(u, 'PersonaName') || vdf.get(u, 'AccountName') || sid,
      remember: vdf.get(u, 'RememberPassword') === '1',
      mostRecent: vdf.get(u, 'MostRecent') === '1',
      timestamp: Number(vdf.get(u, 'Timestamp') || 0),
    }));
}

function loginUsersMtime(dir) {
  try { return fs.statSync(loginUsersPath(dir)).mtimeMs; } catch { return 0; }
}

function markMostRecent(dir, sid) {
  const data = readLoginUsersRaw(dir);
  const users = vdf.get(data, 'users');
  for (const [id, u] of Object.entries(users)) {
    if (!u || typeof u !== 'object') continue;
    const me = id === sid;
    vdf.set(u, 'MostRecent', me ? '1' : '0');
    // Current Steam uses "AutoLogin"; older builds used "AllowAutoLogin". Only keep the one this install uses.
    const hasNew = vdf.get(u, 'AutoLogin') !== undefined;
    const hasOld = vdf.get(u, 'AllowAutoLogin') !== undefined;
    if (hasNew || !hasOld) vdf.set(u, 'AutoLogin', me ? '1' : '0');
    if (hasNew && hasOld) delete u[Object.keys(u).find(k => k.toLowerCase() === 'allowautologin')];
    else if (hasOld) vdf.set(u, 'AllowAutoLogin', me ? '1' : '0');
    if (me) {
      vdf.set(u, 'RememberPassword', '1');
      vdf.set(u, 'WantsOfflineMode', '0');
      vdf.set(u, 'SkipOfflineModeWarning', '0');
    }
  }
  writeLoginUsersRaw(dir, data);
}

// Steam's "Ask which account to use each time Steam starts" (the "Who's playing?" picker) overrides
// AutoLoginUser, so it has to be off for one-click switching. Targeted text edit: config.vdf is big
// and holds Steam's own escaped JSON blobs, so we don't round-trip the whole file.
function disableUserChooser(dir) {
  const p = path.join(dir, 'config', 'config.vdf');
  let text;
  try { text = fs.readFileSync(p, 'utf8'); } catch { return false; }
  const re = /("AlwaysShowUserChooser"[ \t]+)"-?1"/g; // Steam also stores "-1"
  if (!re.test(text)) return false;
  fs.copyFileSync(p, p + '.swapdeck.bak');
  const tmp = p + '.swapdeck.tmp';
  fs.writeFileSync(tmp, text.replace(re, '$1"0"'), 'utf8');
  fs.renameSync(tmp, p);
  return true;
}

function clearAutoLogin(dir) {
  const data = readLoginUsersRaw(dir);
  for (const u of Object.values(vdf.get(data, 'users'))) {
    if (!u || typeof u !== 'object') continue;
    vdf.set(u, 'MostRecent', '0');
    if (vdf.get(u, 'AutoLogin') !== undefined) vdf.set(u, 'AutoLogin', '0');
    if (vdf.get(u, 'AllowAutoLogin') !== undefined) vdf.set(u, 'AllowAutoLogin', '0');
  }
  writeLoginUsersRaw(dir, data);
}

function removeAccount(dir, sid) {
  const data = readLoginUsersRaw(dir);
  const users = vdf.get(data, 'users');
  const u = users[sid];
  delete users[sid];
  writeLoginUsersRaw(dir, data);
  return u ? vdf.get(u, 'AccountName') : null;
}

// ---------- avatars ----------

function avatar(dir, sid) {
  if (!dir) return null;
  for (const ext of ['png', 'jpg']) {
    const p = path.join(dir, 'config', 'avatarcache', `${sid}.${ext}`);
    try {
      const buf = fs.readFileSync(p);
      return `data:image/${ext === 'jpg' ? 'jpeg' : 'png'};base64,${buf.toString('base64')}`;
    } catch {}
  }
  return null;
}

// ---------- installed games ----------

const TOOL_NAME = /redistributable|proton|steam linux runtime|steamworks|steamvr|dedicated server|sdk/i;

function libraryDirs(dir) {
  const dirs = new Set([path.join(dir, 'steamapps')]);
  for (const f of [path.join(dir, 'steamapps', 'libraryfolders.vdf'), path.join(dir, 'config', 'libraryfolders.vdf')]) {
    try {
      const data = vdf.parse(fs.readFileSync(f, 'utf8'));
      const lf = vdf.get(data, 'libraryfolders') || {};
      for (const v of Object.values(lf)) {
        const p = typeof v === 'object' ? vdf.get(v, 'path') : v;
        if (p && typeof p === 'string' && /[\\/]/.test(p)) dirs.add(path.join(p, 'steamapps'));
      }
    } catch {}
  }
  return [...dirs];
}

function gameIcon(dir, appid) {
  const lc = path.join(dir, 'appcache', 'librarycache');
  const tryRead = p => {
    try { return 'data:image/jpeg;base64,' + fs.readFileSync(p).toString('base64'); } catch { return null; }
  };
  // Newer layout: librarycache/<appid>/<sha1>.jpg is the small icon
  try {
    const sub = path.join(lc, String(appid));
    const icon = fs.readdirSync(sub).find(f => /^[0-9a-f]{40}\.jpg$/i.test(f));
    if (icon) return tryRead(path.join(sub, icon));
  } catch {}
  return tryRead(path.join(lc, `${appid}_icon.jpg`));
}

function installedGames(dir) {
  if (!dir) return [];
  const games = new Map();
  for (const lib of libraryDirs(dir)) {
    let files = [];
    try { files = fs.readdirSync(lib).filter(f => /^appmanifest_\d+\.acf$/i.test(f)); } catch { continue; }
    for (const f of files) {
      try {
        const st = vdf.get(vdf.parse(fs.readFileSync(path.join(lib, f), 'utf8')), 'AppState');
        const appid = String(vdf.get(st, 'appid'));
        const name = vdf.get(st, 'name');
        if (!name || TOOL_NAME.test(name) || games.has(appid)) continue;
        const installdir = vdf.get(st, 'installdir');
        games.set(appid, { appid, name, folder: installdir ? path.join(lib, 'common', installdir) : null });
      }
      catch {}
    }
  }
  return [...games.values()]
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
    .map(g => ({ ...g, icon: gameIcon(dir, g.appid) }));
}

// Last played + playtime per app, merged across every account on this PC
// (userdata/<accountid>/config/localconfig.vdf). Cached by file mtime.
const playCache = new Map();
function localPlaytime(dir) {
  const out = {};
  if (!dir) return out;
  const ud = path.join(dir, 'userdata');
  let ids = [];
  try { ids = fs.readdirSync(ud).filter(x => /^\d+$/.test(x)); } catch { return out; }
  for (const id of ids) {
    const f = path.join(ud, id, 'config', 'localconfig.vdf');
    let mt;
    try { mt = fs.statSync(f).mtimeMs; } catch { continue; }
    let apps = playCache.get(f);
    if (!apps || apps.mt !== mt) {
      try {
        let n = vdf.get(vdf.parse(fs.readFileSync(f, 'utf8')), 'UserLocalConfigStore');
        for (const k of ['Software', 'Valve', 'Steam']) n = vdf.get(n, k);
        apps = { mt, data: vdf.get(n, 'apps') || {} };
      } catch { apps = { mt, data: {} }; }
      playCache.set(f, apps);
    }
    for (const [appid, v] of Object.entries(apps.data)) {
      if (!v || typeof v !== 'object') continue;
      const last = Number(vdf.get(v, 'LastPlayed') || 0) * 1000, mins = Number(vdf.get(v, 'Playtime') || 0);
      if (!last && !mins) continue;
      const o = out[appid] || (out[appid] = { last: 0, mins: 0 });
      o.last = Math.max(o.last, last);
      o.mins += mins;
    }
  }
  return out;
}

// Cached library art (cover / hero / logo) if Steam has it locally.
// Steam's library art. Older games keep it flat (librarycache/<appid>/library_600x900.jpg); newer ones
// keep each image in a hashed subfolder, and call the portrait cover library_capsule.jpg.
const ART_NAMES = {
  'library_600x900.jpg': ['library_600x900.jpg', 'library_capsule.jpg', 'library_600x900_2x.jpg'],
  'library_hero.jpg': ['library_hero.jpg'],
  'logo.png': ['logo.png'],
};
const artCache = new Map(); // "<dir>|<appid>" -> { mtime, files: { name: fullPath } }

function artFile(dir, appid, file) {
  if (!dir) return null;
  const base = path.join(dir, 'appcache', 'librarycache', String(appid));
  let st;
  try { st = fs.statSync(base); } catch { return null; }
  const key = dir + '|' + appid;
  let c = artCache.get(key);
  if (!c || c.mtime !== st.mtimeMs) {
    const files = {};
    const add = (name, p) => { if (!files[name]) files[name] = p; };
    try {
      for (const e of fs.readdirSync(base, { withFileTypes: true })) {
        if (e.isFile()) add(e.name, path.join(base, e.name));
        else if (e.isDirectory()) {
          try { for (const f of fs.readdirSync(path.join(base, e.name))) add(f, path.join(base, e.name, f)); } catch {}
        }
      }
    } catch {}
    c = { mtime: st.mtimeMs, files };
    artCache.set(key, c);
  }
  for (const name of ART_NAMES[file] || [file]) if (c.files[name]) return c.files[name];
  return null;
}

module.exports = {
  localPlaytime, artFile, splitArgs,
  locate, status, isRunning, shutdown, start, waitFor, readSteamReg, regSet,
  listAccounts, loginUsersMtime, markMostRecent, clearAutoLogin, disableUserChooser, removeAccount,
  avatar, installedGames, sidFromAccountId, accountIdFromSid, loginUsersPath, sleep,
};

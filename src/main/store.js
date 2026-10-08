// Small JSON store in userData for settings, per-account meta and cached stats.
// Sign-in tokens live in a separate file, encrypted with Electron's safeStorage (DPAPI on Windows).

const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const vault = require('./vault');

const DEFAULTS = {
  settings: {
    steamExe: null,
    launchAfter: false,
    defaultGame: null,
    closeAfter: false,
    steamArgs: '',
    uiScale: 'auto',
    base: 'dark',            // dark | oled | light
    accent: 'cyan',          // cyan | violet | amber | red | green | pink | windows | custom
    customAccent: '#c084fc',
    followTag: false,        // accent follows the running game's tag
    reduceMotion: false,
    startView: 'acc',        // acc | lib: the screen SwapDeck opens on
    accountStyle: 'grid',    // grid ("Who's playing?") | gallery (the 1.0 sideways panels)
    tray: false,             // keep running in the tray when the window is closed
    hotkeyOn: false,         // global shortcut that opens the tray panel (only while the tray is on)
    hotkey: require('./hotkey').DEFAULT_KEY, // Electron accelerator, checked by hotkey.isValidKey
    lastSeenVersion: null,   // the version whose What's new was last shown
    tagList: [],             // every tag used on a game or account, in first-used order (keeps tag order stable)
    normalOn: null,          // device names switched on in the normal setup (null = whatever was on at first run)
    normalMon: null,         // device name of the normal primary monitor (\\.\DISPLAYn)
  },
  meta: {},   // sid -> { tags, note, pinned, launch, lastUsed }
  cache: {},  // sid -> { pub, pubAt, stats, statsAt }
};
const DEFAULT_GAME = { acct: null, tags: [], fav: false, opts: '', display: { mon: null, mode: 'primary', restore: true, res: null }, audio: null, apps: [], launcher: null, lastPlayed: 0, playMs: 0 };
// display.res = resolution profile id · audio = playback device id · apps = companion apps [{ path, args, close }]
// launcher = an .exe to start instead of the Steam game (e.g. Content Manager for Assetto Corsa)

const SCALES = [0.8, 0.9, 1, 1.1, 1.25, 1.5];

let file, tokenFile, data, tokens, existed = false;

function load() {
  vault.load();
  file = path.join(app.getPath('userData'), 'swapdeck.json');
  tokenFile = path.join(app.getPath('userData'), 'tokens.json');
  data = {};
  existed = fs.existsSync(file);
  if (existed) {
    try {
      data = JSON.parse(fs.readFileSync(file, 'utf8'));
      // Keep a copy of the last file that loaded fine.
      try { fs.copyFileSync(file, file + '.bak'); } catch (e) { logError('backup', e); }
    } catch (e) {
      // Never silently replace a file we couldn't read: set it aside so nothing is lost.
      logError('load', e);
      try { fs.copyFileSync(file, file.replace(/.json$/, '') + '.unreadable-' + Date.now() + '.json'); } catch {}
      try { data = JSON.parse(fs.readFileSync(file + '.bak', 'utf8')); logError('load', 'restored from swapdeck.json.bak'); } catch { data = {}; }
    }
  }
  // Before scaleBase 0.9, 100% meant raw zoom 1.0. Now 100% = raw 0.9, so convert a saved fixed scale
  // to the preset that looks the same (the old 90% becomes the new 100%).
  const raw = data.settings || {};
  if (raw.scaleBase !== 0.9 && typeof raw.uiScale === 'number') {
    const target = raw.uiScale / 0.9;
    raw.uiScale = SCALES.reduce((a, b) => Math.abs(b - target) < Math.abs(a - target) ? b : a);
  }
  raw.scaleBase = 0.9;
  data.settings = raw;
  data = {
    settings: { ...DEFAULTS.settings, ...(data.settings || {}) },
    meta: data.meta || {},
    cache: data.cache || {},
    window: data.window || null,
    games: data.games || {},             // gameId -> per-game settings (DEFAULT_GAME shape)
    customGames: data.customGames || [], // non-Steam games: { id, name, exe, img, iconMode }
    displaySaved: data.displaySaved || null, // monitor layout before SwapDeck changed it
    resProfiles: data.resProfiles || [], // user-made resolution profiles: { id, name, w, h, hz, stretch }
    monPos: data.monPos || {},
    playLog: data.playLog || {},
    sessions: data.sessions || [],       // recent sessions [{ sid, gid, start, ms }], newest first
    cs2: data.cs2 || {},                 // account sid -> { autoexec }         // account sid -> game id -> { ms, n, last }: sessions launched through SwapDeck           // device name -> last normal-time { x, y, w, h, hz }
  };
  try { tokens = JSON.parse(fs.readFileSync(tokenFile, 'utf8')); } catch { tokens = {}; }
}

let saveTimer = null, pendingSince = 0;
function save() {
  // Debounced, but never put off for more than a second, even if changes keep coming.
  if (!pendingSince) pendingSince = Date.now();
  clearTimeout(saveTimer);
  if (Date.now() - pendingSince > 1000) return flush();
  saveTimer = setTimeout(flush, 150);
}
function flush() {
  clearTimeout(saveTimer);
  pendingSince = 0;
  let json;
  try {
    json = JSON.stringify(data, null, 1);
  } catch (e) {
    logError('serialize', e);
    return;
  }
  const tmp = file + '.tmp';
  try {
    fs.writeFileSync(tmp, json);
    fs.renameSync(tmp, file);
  } catch (e) {
    // Atomic replace can fail on Windows (file briefly locked by AV/indexer). Fall back to a direct write.
    logError('atomic-save', e);
    try { fs.writeFileSync(file, json); } catch (e2) { logError('save', e2); }
    try { fs.unlinkSync(tmp); } catch {}
  }
  // Check the write really landed; a silent failure here is how settings got lost before.
  try {
    const size = fs.statSync(file).size;
    if (size !== Buffer.byteLength(json)) logError('verify', 'swapdeck.json is ' + size + ' bytes, expected ' + Buffer.byteLength(json));
  } catch (e) { logError('verify', e); }
}

function logError(where, e) {
  try {
    const line = `${new Date().toISOString()} [${where}] ${e && e.stack ? e.stack : e}\n`;
    fs.appendFileSync(path.join(app.getPath('userData'), 'swapdeck-error.log'), line);
  } catch {}
}

const gameCfg = id => {
  const g = data.games[id] || {};
  return { ...DEFAULT_GAME, ...g, display: { ...DEFAULT_GAME.display, ...(g.display || {}) } };
};
function setGameCfg(id, patch) {
  const cur = gameCfg(id);
  data.games[id] = { ...cur, ...patch, display: { ...cur.display, ...(patch.display || {}) } };
  save();
  return data.games[id];
}
const allGameCfgs = () => data.games;
const customGames = () => data.customGames;
function setCustomGames(list) { data.customGames = list; save(); }
const displaySaved = () => data.displaySaved;
function setDisplaySaved(v) { data.displaySaved = v; save(); }
const resProfiles = () => data.resProfiles;
function setResProfiles(v) { data.resProfiles = v; save(); }
const playLog = () => data.playLog;
function addPlay(sid, gid, ms) {
  if (!sid || !gid) return;
  const a = data.playLog[sid] = data.playLog[sid] || {};
  const e = a[gid] = a[gid] || { ms: 0, n: 0, last: 0 };
  e.ms += Math.max(0, ms || 0); e.n++; e.last = Date.now();
  data.sessions.unshift({ sid, gid, start: Date.now() - Math.max(0, ms || 0), ms: Math.max(0, ms || 0) });
  data.sessions.length = Math.min(data.sessions.length, 300);
  save();
}
const sessions = () => data.sessions;
const cs2Cfg = sid => data.cs2[sid] || {};
function setCs2Cfg(sid, patch) { data.cs2[sid] = { ...cs2Cfg(sid), ...patch }; save(); return data.cs2[sid]; }

// Backup: everything except secrets (tokens and passwords stay in tokens.json / the vault).
const BACKUP_KEYS = ['settings', 'meta', 'games', 'customGames', 'resProfiles', 'monPos', 'playLog', 'sessions', 'cs2'];
function exportData() {
  const out = { app: 'SwapDeck', kind: 'settings-backup', version: 1, exported: new Date().toISOString() };
  for (const k of BACKUP_KEYS) out[k] = data[k];
  return out;
}
function importData(b) {
  if (!b || b.app !== 'SwapDeck' || b.kind !== 'settings-backup') throw new Error("That file isn't a SwapDeck backup.");
  const keepExe = data.settings.steamExe; // the Steam path belongs to this PC
  const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const ARRAYS = ['customGames', 'resProfiles', 'sessions'];
  // Only take parts with the right shape, so a damaged or hand-edited file can't break SwapDeck.
  for (const k of BACKUP_KEYS) {
    if (k === 'settings' || !(k in b)) continue;
    if (ARRAYS.includes(k) ? Array.isArray(b[k]) : isObj(b[k])) data[k] = b[k];
  }
  if (isObj(b.settings)) {
    const next = { ...DEFAULTS.settings };
    for (const [k, def] of Object.entries(DEFAULTS.settings)) {
      const v = b.settings[k];
      if (v === undefined) continue;
      if (k === 'tagList') { if (Array.isArray(v)) next[k] = v.filter(x => typeof x === 'string').slice(-200); }
      else if (k === 'normalOn') { if (v === null || (Array.isArray(v) && v.every(x => typeof x === 'string'))) next[k] = v; }
      else if (k === 'uiScale') { if (v === 'auto' || SCALES.includes(v)) next[k] = v; }
      else if (def === null ? (v === null || typeof v === 'string') : typeof v === typeof def) next[k] = v;
    }
    data.settings = { ...next, scaleBase: 0.9 };
  }
  data.customGames = data.customGames.filter(c => c && typeof c.exe === 'string' && typeof c.name === 'string');
  data.settings.steamExe = keepExe;
  flush();
}
const monPos = () => data.monPos;
function setMonPos(v) { data.monPos = v; save(); }

const windowState = () => data.window;
function setWindowState(w) { data.window = w; save(); }

const settings = () => data.settings;
function setSettings(patch) { Object.assign(data.settings, patch); save(); return data.settings; }

const DEFAULT_META = { tags: [], note: '', pinned: false, launch: 'default', lastUsed: 0 };
const meta = sid => ({ ...DEFAULT_META, ...(data.meta[sid] || {}) });
function setMeta(sid, patch) { data.meta[sid] = { ...meta(sid), ...patch }; save(); return data.meta[sid]; }

const cache = sid => data.cache[sid] || {};
function setCache(sid, patch) { data.cache[sid] = { ...cache(sid), ...patch }; save(); }
function dropStats(sid) { const c = cache(sid); delete c.stats; delete c.statsAt; data.cache[sid] = c; save(); }

function forget(sid) { delete data.meta[sid]; delete data.cache[sid]; save(); }

// ---- encrypted sign-in tokens ----

function writeTokens() {
  fs.writeFileSync(tokenFile, JSON.stringify(tokens));
}
const enc = s => vault.encrypt(s);
const dec = b => vault.decrypt(b);

// Decrypt every stored secret with the CURRENT cipher, and re-encrypt it all with whatever cipher is
// active after `mutate()` runs (used when turning a master password on/off or changing it).
function reencryptAround(mutate) {
  const plain = {};
  for (const [sid, t] of Object.entries(tokens)) {
    const p = {};
    if (t.refresh) p.refresh = dec(t.refresh);
    if (t.machine) p.machine = dec(t.machine);
    if (t.cred) p.cred = { login: dec(t.cred.login), password: dec(t.cred.password) };
    plain[sid] = p;
  }
  mutate();
  const out = {};
  for (const [sid, p] of Object.entries(plain)) {
    const t = {};
    if (p.refresh != null) t.refresh = enc(p.refresh);
    if (p.machine != null) t.machine = enc(p.machine);
    if (p.cred && p.cred.login != null && p.cred.password != null) t.cred = { login: enc(p.cred.login), password: enc(p.cred.password) };
    if (Object.keys(t).length) out[sid] = t;
  }
  tokens = out;
  writeTokens();
}
function setToken(sid, refreshToken, machineToken) {
  const t = tokens[sid] || {};
  t.refresh = enc(refreshToken);
  if (machineToken) t.machine = enc(machineToken);
  tokens[sid] = t;
  writeTokens();
}
function getToken(sid) {
  const t = tokens[sid];
  return t && t.refresh ? dec(t.refresh) : null;
}
function getMachineToken(sid) {
  const t = tokens[sid];
  return t && t.machine ? dec(t.machine) : null;
}
function isLinked(sid) { return !!(tokens[sid] && tokens[sid].refresh); }
function removeToken(sid) { const t = tokens[sid]; if (!t) return; delete t.refresh; delete t.machine; if (!t.cred) delete tokens[sid]; writeTokens(); }

// Stored credentials (opt-in): username + password, encrypted like tokens. Kept only to re-mint a
// sign-in token automatically when the saved one expires, so stats keep working without re-entry.
function setCredentials(sid, login, password) {
  const t = tokens[sid] || {};
  t.cred = { login: enc(login), password: enc(password) };
  tokens[sid] = t;
  writeTokens();
}
function getCredentials(sid) {
  const c = tokens[sid] && tokens[sid].cred;
  if (!c) return null;
  const login = dec(c.login), password = dec(c.password);
  return login && password ? { login, password } : null;
}
function hasCredentials(sid) { return !!(tokens[sid] && tokens[sid].cred); }
function removeCredentials(sid) { const t = tokens[sid]; if (!t) return; delete t.cred; if (!t.refresh) delete tokens[sid]; writeTokens(); }

module.exports = {
  SCALES, load, flush, settings, setSettings, windowState, setWindowState, meta, setMeta, cache, setCache, dropStats, forget,
  setToken, getToken, getMachineToken, isLinked, removeToken,
  setCredentials, getCredentials, hasCredentials, removeCredentials,
  reencryptAround, vault,
  gameCfg, setGameCfg, allGameCfgs, customGames, setCustomGames, displaySaved, setDisplaySaved, monPos, setMonPos, resProfiles, setResProfiles, playLog, addPlay, sessions, cs2Cfg, setCs2Cfg, exportData, importData,
  existedBefore: () => existed, // false on a fresh install
};

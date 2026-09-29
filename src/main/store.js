// Small JSON store in userData for settings, per-account meta and cached stats.
// Sign-in tokens live in a separate file, encrypted with Electron's safeStorage (DPAPI on Windows).

const fs = require('fs');
const path = require('path');
const { app, safeStorage } = require('electron');

const DEFAULTS = {
  settings: {
    steamExe: null,
    launchAfter: false,
    defaultGame: null,
    closeAfter: false,
    steamArgs: '',
    uiScale: 'auto',
  },
  meta: {},   // sid -> { tags, note, pinned, launch, lastUsed }
  cache: {},  // sid -> { pub, pubAt, stats, statsAt }
};

const SCALES = [0.8, 0.9, 1, 1.1, 1.25, 1.5];

let file, tokenFile, data, tokens;

function load() {
  file = path.join(app.getPath('userData'), 'swapdeck.json');
  tokenFile = path.join(app.getPath('userData'), 'tokens.json');
  try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { data = {}; }
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
  };
  try { tokens = JSON.parse(fs.readFileSync(tokenFile, 'utf8')); } catch { tokens = {}; }
}

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 150);
}
function flush() {
  clearTimeout(saveTimer);
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 1));
  fs.renameSync(tmp, file);
}

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
function enc(s) {
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Windows encryption is unavailable, so SwapDeck can\'t store sign-in tokens safely.');
  return safeStorage.encryptString(s).toString('base64');
}
function dec(b) {
  try { return safeStorage.decryptString(Buffer.from(b, 'base64')); } catch { return null; }
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
function removeToken(sid) { delete tokens[sid]; writeTokens(); }

module.exports = {
  SCALES, load, flush, settings, setSettings, windowState, setWindowState, meta, setMeta, cache, setCache, dropStats, forget,
  setToken, getToken, getMachineToken, isLinked, removeToken,
};

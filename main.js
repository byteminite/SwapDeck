const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain, dialog, shell, screen, protocol, net, systemPreferences } = require('electron');

// `npm run dev`: run from source with a separate profile (%APPDATA%\SwapDeck-dev), so development never
// touches the real settings and can run next to the installed app (the single-instance lock is per profile).
if (process.argv.includes('--dev-profile')) app.setPath('userData', path.join(app.getPath('appData'), 'SwapDeck-dev'));
const store = require('./src/main/store');
const steam = require('./src/main/steam');
const { fetchPublic } = require('./src/main/profile');
const link = require('./src/main/link');
const { fetchLinked } = require('./src/main/stats');
const updater = require('./src/main/updater');
const library = require('./src/main/library');
const display = require('./src/main/display');
const audio = require('./src/main/audio');
const { createPlayer } = require('./src/main/play');
const hotkey = require('./src/main/hotkey');
const { cleanTags, validRgb } = require('./src/main/tags');

// Local Steam library art and custom covers are served to the UI through sdimg://
protocol.registerSchemesAsPrivileged([{ scheme: 'sdimg', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);

let win = null;
let loc = { exe: null, dir: null, checked: [] };
let lastStatus = { running: false, activeSid: null, autoLoginUser: '' };
let lastMtime = 0;
let busy = null;            // 'switch' | 'close' | 'start' | 'add' | 'forget'
let adding = null;          // { cancelled }
const fetching = new Set(); // sids with a stats refresh in flight

// Events go to the main window and, when it's open, the tray panel.
const send = (ch, ...args) => {
  if (win && !win.isDestroyed()) win.webContents.send(ch, ...args);
  if (trayWin && !trayWin.isDestroyed()) trayWin.webContents.send(ch, ...args);
};

// ---------- tags ----------

// Tags are listed in first-used order, so a tag never jumps around when it is ticked or unticked.
function rememberTags(tags) {
  const known = store.settings().tagList || [], fresh = tags.filter(t => !known.includes(t));
  if (fresh.length) store.setSettings({ tagList: [...known, ...fresh].slice(-200) });
}
// Sets one tag's own colour ("r,g,b"), or with rgb null goes back to its built-in colour.
function withTagColor({ tag, rgb }) {
  const t = cleanTags([tag])[0], colors = { ...(store.settings().tagColors || {}) };
  if (!t) return colors;
  if (rgb == null) delete colors[t]; else if (validRgb(rgb)) colors[t] = rgb;
  return Object.fromEntries(Object.entries(colors).slice(-200));
}

// ---------- state ----------

function account(a) {
  const m = store.meta(a.sid);
  const c = store.cache(a.sid);
  return {
    sid: a.sid,
    login: a.login,
    name: a.persona,
    avatar: steam.avatar(loc.dir, a.sid) || (c.pub && c.pub.avatar) || null,
    avatarSrc: steam.avatar(loc.dir, a.sid) ? 'local' : (c.pub && c.pub.avatar) ? 'profile' : null,
    lastUsed: Math.max(m.lastUsed || 0, (a.timestamp || 0) * 1000),
    tags: m.tags, note: m.note, pinned: m.pinned, launch: m.launch,
    linked: store.isLinked(a.sid),
    hasCredentials: store.hasCredentials(a.sid),
    pub: c.pub || null, pubAt: c.pubAt || 0,
    stats: c.stats || null, statsAt: c.statsAt || 0,
  };
}

function accounts() {
  try { return steam.listAccounts(loc.dir).map(account); } catch (e) { console.error(e); return []; }
}
function oneAccount(sid) {
  return accounts().find(a => a.sid === sid) || null;
}

function steamState() {
  return {
    found: !!loc.exe, exe: loc.exe, checked: loc.checked,
    running: lastStatus.running, activeSid: lastStatus.activeSid, autoLoginUser: lastStatus.autoLoginUser,
    busy: busy === 'close' ? 'closing' : busy === 'start' ? 'starting' : null,
  };
}

async function detect() {
  loc = await steam.locate(store.settings().steamExe);
  if (loc.exe) lastStatus = await steam.status();
  lastMtime = loc.dir ? steam.loginUsersMtime(loc.dir) : 0;
}

let games = [];
function loadGames() { games = steam.installedGames(loc.dir); }

async function poll() {
  if (!loc.exe) return;
  try {
    const s = await steam.status();
    if (s.running !== lastStatus.running || s.activeSid !== lastStatus.activeSid || s.autoLoginUser !== lastStatus.autoLoginUser) {
      lastStatus = s;
      send('steam', steamState());
    }
    const mt = steam.loginUsersMtime(loc.dir);
    if (mt !== lastMtime) { lastMtime = mt; send('accounts', accounts()); }
  } catch (e) { console.error('poll', e); }
}

// Public profiles are cheap, so keep online status fresh in the background.
async function refreshPublicAll() {
  for (const a of accounts()) {
    if (Date.now() - a.pubAt < 10 * 60 * 1000 || fetching.has(a.sid)) continue;
    try {
      const pub = await fetchPublic(a.sid);
      store.setCache(a.sid, { pub, pubAt: Date.now() });
      send('account', oneAccount(a.sid));
    } catch {}
    await steam.sleep(400);
  }
}

// ---------- actions ----------

function launchOf(sid) {
  const m = store.meta(sid), s = store.settings();
  if (m.launch === 'none') return null;
  if (m.launch === 'default') return s.launchAfter && s.defaultGame ? s.defaultGame : null;
  return m.launch;
}
const gameName = appid => (games.find(g => g.appid === String(appid)) || {}).name || `App ${appid}`;

function guard(kind) {
  if (!loc.exe) { const e = new Error('Steam not found'); e.code = 'NOT_FOUND'; throw e; }
  if (busy) { const e = new Error('Steam is busy'); e.code = 'BUSY'; e.busy = busy; throw e; }
  busy = kind;
}

async function wrap(kind, fn) {
  try {
    guard(kind);
  } catch (e) {
    return { ok: false, code: e.code, error: e.message, busy: e.busy };
  }
  try {
    return { ok: true, ...(await fn()) };
  } catch (e) {
    console.error(kind, e);
    return { ok: false, code: e.code || 'ERROR', error: e.message };
  } finally {
    busy = null;
    lastStatus = await steam.status().catch(() => lastStatus);
    send('steam', steamState());
  }
}

// opts.forPlay: switching as part of launching a Library game, so no "game after switching"
// and no "close app after switching".
function switchTo(sid, opts = {}) {
  // Restarting Steam closes whatever game it's running, so don't while a SwapDeck session is active.
  if (!opts.forPlay && player.current()) return Promise.resolve({ ok: false, code: 'RUNNING', error: 'A game SwapDeck launched is still running. Restarting Steam now would close it, so quit the game (or press Stop) first.' });
  return wrap('switch', async () => {
    const acc = steam.listAccounts(loc.dir).find(a => a.sid === sid);
    if (!acc) throw new Error('That account is no longer in Steam\'s saved logins.');
    const appid = opts.forPlay ? null : launchOf(sid);
    const game = appid ? gameName(appid) : null;
    const running = await steam.isRunning();
    const steps = [];
    if (running) steps.push('Closing Steam…');
    steps.push(`Logging in as ${acc.persona}…`, 'Waiting for Steam to start…');
    if (game) steps.push(`Launching ${game}…`);
    steps.push('Done');
    let i = 0;
    const progress = () => send('switch', { sid, steps, step: i });

    progress();
    if (running) { await steam.shutdown(loc.exe); i++; progress(); }

    const chooserOff = steam.disableUserChooser(loc.dir);
    await steam.regSet('AutoLoginUser', 'REG_SZ', acc.login);
    await steam.regSet('RememberPassword', 'REG_DWORD', 1);
    steam.markMostRecent(loc.dir, sid);
    steam.start(loc.exe, store.settings().steamArgs);
    i++; progress();

    const target = String(steam.accountIdFromSid(sid));
    const signedIn = await steam.waitFor(async () => {
      const r = await steam.readSteamReg();
      return String(r.activeUser) === target;
    }, 90000, 1000);
    store.setMeta(sid, { lastUsed: Date.now() });
    applyCs2Autoexec(sid); // before any game starts on this account
    if (!signedIn) {
      return { warn: 'Steam started but hasn\'t signed in yet. If it asks for a password, the saved login expired; sign in once with "Remember me" ticked.', game: null, name: acc.persona, chooserOff };
    }
    i++; progress();

    if (appid) {
      await shell.openExternal(`steam://rungameid/${encodeURIComponent(appid)}`);
      await steam.sleep(1200);
      i++; progress();
    }
    const closing = !opts.forPlay && store.settings().closeAfter;
    if (closing) setTimeout(() => app.quit(), 2200);
    return { game, name: acc.persona, closing, chooserOff, signedIn: true };
  });
}

function closeSteam() {
  return wrap('close', async () => {
    send('steam', steamState());
    await steam.shutdown(loc.exe);
  });
}

function startSteam() {
  return wrap('start', async () => {
    send('steam', steamState());
    steam.start(loc.exe, store.settings().steamArgs);
    await steam.waitFor(() => steam.isRunning(), 20000, 700);
    await steam.waitFor(async () => (await steam.readSteamReg()).activeUser > 0, 30000, 1000);
  });
}

function addAccount() {
  return wrap('add', async () => {
    adding = { cancelled: false };
    const me = adding;
    const known = new Set(steam.listAccounts(loc.dir).map(a => a.sid));
    if (await steam.isRunning()) await steam.shutdown(loc.exe);
    if (me.cancelled) return { cancelled: true };
    await steam.regSet('AutoLoginUser', 'REG_SZ', '');
    steam.clearAutoLogin(loc.dir);
    steam.start(loc.exe, store.settings().steamArgs);

    const end = Date.now() + 10 * 60 * 1000;
    let seenAt = 0;
    while (Date.now() < end) {
      await steam.sleep(1500);
      if (me.cancelled) return { cancelled: true };
      const r = await steam.readSteamReg();
      if (!r.activeUser) continue;
      const sid = steam.sidFromAccountId(r.activeUser);
      const acc = steam.listAccounts(loc.dir).find(a => a.sid === sid);
      if (acc) {
        store.setMeta(sid, { lastUsed: Date.now() });
        return { sid, name: acc.persona, existing: known.has(sid) };
      }
      // Signed in, but Steam hasn't written loginusers.vdf yet.
      seenAt = seenAt || Date.now();
      if (Date.now() - seenAt > 20000) return { sid, name: 'New account', existing: false };
    }
    return { timeout: true };
  }).finally(() => { adding = null; });
}

function forget(sid) {
  return wrap('forget', async () => {
    const st = await steam.status();
    if (st.running) await steam.shutdown(loc.exe);
    const login = steam.removeAccount(loc.dir, sid);
    const reg = await steam.readSteamReg();
    if (login && reg.autoLoginUser.toLowerCase() === login.toLowerCase()) await steam.regSet('AutoLoginUser', 'REG_SZ', '');
    store.forget(sid);
    store.removeToken(sid);
    store.removeCredentials(sid);
    const restarted = st.running && st.activeSid && st.activeSid !== sid;
    if (restarted) steam.start(loc.exe, store.settings().steamArgs);
    return { restarted, wasCurrent: st.activeSid === sid };
  });
}

async function refreshStats(sid) {
  if (fetching.has(sid)) return { ok: false, busy: true };
  fetching.add(sid);
  const warnings = [];
  const progress = step => send('stats', { sid, step });
  try {
    progress(0);
    try {
      const pub = await fetchPublic(sid);
      store.setCache(sid, { pub, pubAt: Date.now() });
    } catch (e) {
      warnings.push({ type: 'error', title: 'Public profile unavailable', msg: e.message });
    }
    let token = store.getToken(sid);
    if (!token && store.isLinked(sid)) {
      // Token exists but can't be decrypted (e.g. Windows profile changed).
      store.removeToken(sid);
      warnings.push({ type: 'error', title: 'Link expired', msg: 'The saved sign-in couldn\'t be read on this PC. Link the account again.' });
    }
    if (token) {
      progress(1);
      try {
        const prev = store.cache(sid).stats;
        let res;
        try {
          res = await fetchLinked(sid, token, s => progress(Math.min(3, s + 1)), t => store.setToken(sid, t));
        } catch (e) {
          // Token expired but we have stored credentials → mint a fresh one silently and retry once.
          if (e.code === 'relink' && store.hasCredentials(sid)) {
            const r = await link.silentRelink(sid);
            if (r.ok) { token = store.getToken(sid); res = await fetchLinked(sid, token, s => progress(Math.min(3, s + 1)), t => store.setToken(sid, t)); }
            else throw e;
          } else throw e;
        }
        if (!res.cs2 && prev && prev.cs2) res.cs2 = prev.cs2; // keep last known CS2 stats if we had to skip
        store.setCache(sid, { stats: res, statsAt: Date.now() });
        if (res.cs2Note === 'in-game') warnings.push({ type: 'warning', title: 'CS2 stats skipped', msg: 'This account is in a game right now, and asking CS2 would kick it. Showing the last known CS2 stats.' });
        if (res.cs2Note === 'gc-timeout') warnings.push({ type: 'warning', title: "CS2 didn't answer", msg: 'CS2\'s servers took too long. Try refreshing again in a bit.' });
      } catch (e) {
        if (e.code === 'relink') { store.removeToken(sid); store.dropStats(sid); }
        warnings.push({ type: 'error', title: e.code === 'relink' ? 'Link expired' : 'Couldn\'t fetch account stats', msg: e.message });
      }
    }
    return { ok: true, account: oneAccount(sid), warnings };
  } finally {
    fetching.delete(sid);
    send('stats', { sid, step: null });
  }
}

// Resolution profiles are made by the user; a game stores a profile id (or null for "don't change").
function cleanProfile(p) {
  const w = Math.round(+p.w), h = Math.round(+p.h), hz = Math.round(+p.hz) || 0;
  if (!(w >= 320 && w <= 16384 && h >= 200 && h <= 16384) || hz < 0 || hz > 1000) return null;
  return { id: /^r\d+$/.test(p.id) ? p.id : 'r' + Date.now(), name: String(p.name || '').trim().slice(0, 40) || w + '×' + h, w, h, hz, stretch: !!p.stretch };
}
const validRes = id => store.resProfiles().some(p => p.id === id) ? id : null;

const player = createPlayer({ getLoc: () => loc, accounts, switchTo, send, applyNormal: () => applyNormal(), beforeLaunch: (g, sid) => { if (String(g.appid) === '730') applyCs2Autoexec(sid); } });

// First run: the current layout is the normal one. While no game profile is active, remember where
// each switched-on monitor sits, so the normal setup can put monitors back in the same place.
// Monitor ids used to be Windows' DISPLAYn names, which can change; now they're hardware keys.
function migrateMonIds(monitors) {
  const map = Object.fromEntries(monitors.filter(m => m.id !== m.name).map(m => [m.name, m.id]));
  const fix = v => (v && map[v]) || v;
  const s = store.settings(), patch = {};
  if (s.normalMon && map[s.normalMon]) patch.normalMon = fix(s.normalMon);
  if (Array.isArray(s.normalOn) && s.normalOn.some(v => map[v])) patch.normalOn = [...new Set(s.normalOn.map(fix))];
  if (Object.keys(patch).length) store.setSettings(patch);
  const pos = store.monPos();
  if (Object.keys(pos).some(k => map[k])) store.setMonPos(Object.fromEntries(Object.entries(pos).map(([k, v]) => [fix(k), v])));
  for (const [gid, cfg] of Object.entries(store.allGameCfgs())) if (cfg.display && map[cfg.display.mon]) store.setGameCfg(gid, { display: { mon: fix(cfg.display.mon) } });
}

function rememberNormal(monitors) {
  migrateMonIds(monitors);
  const s = store.settings();
  if (!s.normalMon) { const p = monitors.find(x => x.primary); if (p) store.setSettings({ normalMon: p.id }); }
  if (!s.normalOn && monitors.length) store.setSettings({ normalOn: monitors.filter(x => x.attached).map(x => x.id) });
  if (store.displaySaved() || player.current()) return;
  const pos = { ...store.monPos() };
  let changed = false;
  for (const m of monitors) if (m.attached) {
    const p = { x: m.x, y: m.y, w: m.w, h: m.h, hz: m.hz, or: m.or }, o = pos[m.id];
    if (!o || o.x !== p.x || o.y !== p.y || o.w !== p.w || o.h !== p.h || o.hz !== p.hz || o.or !== p.or) { pos[m.id] = p; changed = true; }
  }
  if (changed) store.setMonPos(pos);
}

const applyNormal = () => { const s = store.settings(); return display.applyNormal(s.normalOn || [], s.normalMon, store.monPos()); };

function winAccent() {
  try { const c = systemPreferences.getAccentColor(); return c ? '#' + c.slice(0, 6) : null; } catch { return null; }
}

// --play=<gameId> from a desktop shortcut
const playArg = argv => { const a = (argv || []).find(x => /^--play=/.test(x)); return a ? a.slice(7) : null; };

// ---------- IPC ----------

function ipc() {
  ipcMain.handle('state', async () => {
    await detect();
    loadGames();
    const v = store.vault.status();
    if (v.locked) return { locked: true, vault: v, version: app.getVersion(), zoom: zoomFactor };
    const accs = accounts();
    const monitors = await display.list().catch(() => []);
    rememberNormal(monitors);
    return {
      steam: steamState(), accounts: accs, games, settings: { ...store.settings(), startup: startsWithWindows(), hotkeyError: hotkey.error(), hotkeyDefault: hotkey.DEFAULT_KEY }, version: app.getVersion(), busy, zoom: zoomFactor,
      update: updater.current(), vault: v, lib: library.build(loc.dir), monitors, winAccent: winAccent(), session: player.current(),
      displaySaved: !!store.displaySaved(), monPos: store.monPos(), resProfiles: store.resProfiles(), playLog: store.playLog(), sessions: store.sessions(), newInstall: !store.existedBefore(),
    };
  });
  ipcMain.handle('switch', (_, sid) => switchTo(String(sid)));
  ipcMain.handle('steam:close', () => closeSteam());
  ipcMain.handle('steam:start', () => startSteam());
  ipcMain.handle('add', () => addAccount());
  ipcMain.handle('add:cancel', () => { if (adding) adding.cancelled = true; });
  ipcMain.handle('forget', (_, sid) => player.current() ? { ok: false, code: 'RUNNING', error: 'A game SwapDeck launched is still running. Restarting Steam now would close it, so quit the game (or press Stop) first.' } : forget(String(sid)));
  ipcMain.handle('meta', (_, sid, patch) => {
    const allowed = {};
    for (const k of ['note', 'pinned', 'launch']) if (k in patch) allowed[k] = patch[k];
    if ('tags' in patch) { allowed.tags = cleanTags(patch.tags); rememberTags(allowed.tags); }
    if (allowed.note != null) allowed.note = String(allowed.note).slice(0, 140);
    store.setMeta(String(sid), allowed);
    return oneAccount(String(sid));
  });
  ipcMain.handle('settings', (_, patch) => {
    const allowed = {};
    for (const k of ['launchAfter', 'defaultGame', 'closeAfter', 'steamArgs', 'base', 'accent', 'customAccent', 'followTag', 'reduceMotion', 'normalMon']) if (k in patch) allowed[k] = patch[k];
    if ('startView' in patch) allowed.startView = patch.startView === 'lib' ? 'lib' : 'acc';
    if (typeof patch.lastSeenVersion === 'string' && /^\d+\.\d+\.\d+$/.test(patch.lastSeenVersion)) allowed.lastSeenVersion = patch.lastSeenVersion;
    if ('accountStyle' in patch) allowed.accountStyle = patch.accountStyle === 'gallery' ? 'gallery' : 'grid';
    if ('tray' in patch) allowed.tray = !!patch.tray;
    if ('hotkeyOn' in patch) allowed.hotkeyOn = !!patch.hotkeyOn;
    if (patch.tagColor && typeof patch.tagColor === 'object') allowed.tagColors = withTagColor(patch.tagColor);
    let keyError = null;
    // A new key is only saved once Windows has accepted it, so a refused key leaves the old one in place.
    if ('hotkey' in patch) {
      const key = String(patch.hotkey), r = hotkey.keyProblem(key) ? { ok: false, error: hotkey.keyProblem(key) } : hotkey.apply({ ...store.settings(), ...allowed, hotkey: key });
      if (r.ok) allowed.hotkey = key; else keyError = r.error;
    }
    if ('startup' in patch) { try { setStartWithWindows(patch.startup); } catch (e) { store.logError && store.logError('startup', e); } }
    if (Array.isArray(patch.normalOn)) allowed.normalOn = patch.normalOn.map(String).slice(0, 16);
    if ('uiScale' in patch && (patch.uiScale === 'auto' || SCALES.includes(patch.uiScale))) allowed.uiScale = patch.uiScale;
    const s = { ...store.setSettings(allowed), startup: startsWithWindows() };
    if ('uiScale' in allowed) applyZoom(false);
    if ('tray' in allowed) updateTray();
    if ('tray' in allowed || 'hotkeyOn' in allowed) hotkey.apply(store.settings());
    return { ...s, hotkeyError: keyError || hotkey.error(), hotkeyDefault: hotkey.DEFAULT_KEY };
  });
  ipcMain.handle('steam:browse', async () => {
    const r = await dialog.showOpenDialog(win, {
      title: 'Find steam.exe', properties: ['openFile'],
      filters: [{ name: 'Steam', extensions: ['exe'] }],
      defaultPath: loc.exe || 'C:\\Program Files (x86)\\Steam\\steam.exe',
    });
    if (r.canceled || !r.filePaths[0]) return { ok: false };
    const p = r.filePaths[0];
    if (path.basename(p).toLowerCase() !== 'steam.exe') return { ok: false, error: 'That isn\'t steam.exe.' };
    store.setSettings({ steamExe: p });
    await detect();
    loadGames();
    return { ok: true, path: p };
  });
  ipcMain.handle('update:check', () => updater.check(true));
  // Installing quits SwapDeck, which would cut short putting the display and sound back after a game.
  ipcMain.handle('update:install', () => {
    if (player.current()) return { ok: false, error: 'A game SwapDeck launched is still running. Quit the game (or press Stop) first; the update also installs when you quit SwapDeck.' };
    updater.install();
    return { ok: true };
  });
  ipcMain.handle('vault:status', () => store.vault.status());
  ipcMain.handle('vault:unlock', (_, password) => store.vault.unlock(String(password)));
  ipcMain.handle('vault:set', (_, password, autoUnlock) => {
    if (store.vault.mode() === 'master') return { ok: false, error: 'A master password is already set.' };
    if (!password || String(password).length < 4) return { ok: false, error: 'Use at least 4 characters.' };
    try { store.reencryptAround(() => store.vault.enable(String(password), !!autoUnlock)); return { ok: true, vault: store.vault.status() }; }
    catch (e) { return { ok: false, error: e.message }; }
  });
  ipcMain.handle('vault:change', (_, oldPw, newPw) => {
    if (!newPw || String(newPw).length < 4) return { ok: false, error: 'Use at least 4 characters.' };
    let r;
    try { store.reencryptAround(() => { r = store.vault.change(String(oldPw), String(newPw)); if (!r.ok) throw new Error(r.error); }); }
    catch (e) { return { ok: false, error: e.message }; }
    return { ok: true, vault: store.vault.status() };
  });
  ipcMain.handle('vault:remove', (_, password) => {
    if (store.vault.mode() !== 'master') return { ok: false, error: 'No master password is set.' };
    const chk = store.vault.unlock(String(password));
    if (!chk.ok) return chk;
    try { store.reencryptAround(() => store.vault.disable()); return { ok: true, vault: store.vault.status() }; }
    catch (e) { return { ok: false, error: e.message }; }
  });
  ipcMain.handle('vault:autounlock', (_, on) => { store.vault.setAutoUnlock(!!on); return store.vault.status(); });
  ipcMain.handle('stats:refresh', (_, sid) => refreshStats(String(sid)));
  ipcMain.handle('link:qr', (_, sid) => link.startQR(String(sid), e => send('link', e), onLinked));
  ipcMain.handle('link:pw', (_, sid, login, pw, remember) => link.startPassword(String(sid), String(login), String(pw), e => send('link', e), onLinked, !!remember));
  ipcMain.handle('link:token', (_, sid, token) => link.pasteToken(String(sid), String(token), e => send('link', e), onLinked));
  ipcMain.handle('link:code', (_, code) => link.submitCode(String(code), e => send('link', e)));
  ipcMain.handle('link:cancel', () => link.cancel());
  ipcMain.handle('unlink', (_, sid) => { store.removeToken(String(sid)); store.removeCredentials(String(sid)); store.dropStats(String(sid)); return oneAccount(String(sid)); });
  ipcMain.handle('credentials:clear', (_, sid) => { store.removeCredentials(String(sid)); return oneAccount(String(sid)); });
  ipcMain.handle('open', (_, url) => {
    if (/^https:\/\/steamcommunity\.com\/profiles\/\d{17}\/?$/.test(url) || url === 'https://github.com/byteminite/SwapDeck/releases') shell.openExternal(url);
  });

  // ---- library ----
  const findGame = id => library.build(loc.dir).find(g => g.id === id);
  ipcMain.handle('lib:list', () => library.build(loc.dir));
  ipcMain.handle('lib:set', (_, id, patch) => {
    const g = findGame(String(id)); if (!g) return null;
    const allowed = {};
    if ('acct' in patch) allowed.acct = patch.acct || null;
    if ('tags' in patch) { allowed.tags = cleanTags(patch.tags); rememberTags(allowed.tags); }
    if ('fav' in patch) allowed.fav = !!patch.fav;
    if ('opts' in patch) allowed.opts = String(patch.opts || '').slice(0, 400);
    if (patch.display) allowed.display = {
      ...('mon' in patch.display ? { mon: patch.display.mon || null } : {}),
      ...('mode' in patch.display ? { mode: patch.display.mode === 'only' ? 'only' : 'primary' } : {}),
      ...('restore' in patch.display ? { restore: !!patch.display.restore } : {}),
      ...('res' in patch.display ? { res: validRes(patch.display.res) } : {}),
    };
    if ('launcher' in patch) allowed.launcher = g.steam && typeof patch.launcher === 'string' && /\.exe$/i.test(patch.launcher) ? patch.launcher : null;
    if ('audio' in patch) allowed.audio = typeof patch.audio === 'string' && patch.audio ? patch.audio.slice(0, 300) : null;
    if (Array.isArray(patch.apps)) allowed.apps = patch.apps
      .filter(a => a && typeof a.path === 'string' && /.exe$/i.test(a.path))
      .slice(0, 8)
      .map(a => ({ path: a.path, args: String(a.args || '').slice(0, 300), close: a.close !== false }));
    library.setCfg(g, allowed);
    return findGame(g.id);
  });
  ipcMain.handle('lib:pickExe', async () => {
    const r = await dialog.showOpenDialog(win, { title: "Choose the game's .exe", properties: ['openFile'], filters: [{ name: 'Programs', extensions: ['exe'] }] });
    return r.canceled ? null : r.filePaths[0];
  });
  ipcMain.handle('lib:pickImage', async () => {
    const r = await dialog.showOpenDialog(win, { title: 'Choose a cover image', properties: ['openFile'], filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }] });
    if (r.canceled || !r.filePaths[0]) return null;
    const src = r.filePaths[0], dir = path.join(app.getPath('userData'), 'covers');
    fs.mkdirSync(dir, { recursive: true });
    const file = 'c' + Date.now() + path.extname(src).toLowerCase();
    fs.copyFileSync(src, path.join(dir, file));
    return { file, url: 'sdimg://cover/' + file, name: path.basename(src) };
  });
  ipcMain.handle('lib:saveCustom', (_, g) => {
    if (!g || !g.exe || !String(g.name || '').trim()) return null;
    const list = store.customGames().slice();
    const rec = { id: g.id && list.some(x => x.id === g.id) ? g.id : 'g' + Date.now(), name: String(g.name).trim().slice(0, 80), exe: String(g.exe), img: g.img || null, iconMode: g.iconMode === 'exe' ? 'exe' : 'gen' };
    const i = list.findIndex(x => x.id === rec.id);
    if (i >= 0) list[i] = rec; else list.push(rec);
    store.setCustomGames(list);
    store.setGameCfg(rec.id, { opts: String(g.opts || '').slice(0, 400) });
    return rec.id;
  });
  ipcMain.handle('lib:removeCustom', (_, id) => {
    const list = store.customGames(), rec = list.find(x => x.id === id);
    if (!rec) return null;
    store.setCustomGames(list.filter(x => x.id !== id));
    return { rec, cfg: store.gameCfg(id) };
  });
  ipcMain.handle('lib:restoreCustom', (_, saved) => {
    if (!saved || !saved.rec) return false;
    store.setCustomGames([...store.customGames().filter(x => x.id !== saved.rec.id), saved.rec]);
    if (saved.cfg) store.setGameCfg(saved.rec.id, saved.cfg);
    return true;
  });
  ipcMain.handle('game:play', (_, id) => player.play(String(id)));
  ipcMain.handle('game:stop', () => player.stop());
  ipcMain.handle('game:shortcut', (_, id) => {
    const g = findGame(String(id)); if (!g) return { ok: false, error: 'Game not found.' };
    const exe = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
    const args = (app.isPackaged ? '' : '"' + app.getAppPath() + '" ') + '--play=' + g.id;
    const file = path.join(app.getPath('desktop'), g.name.replace(/[\\/:*?"<>|]/g, '').trim() + '.lnk');
    const ok = shell.writeShortcutLink(file, { target: exe, args, description: 'Play ' + g.name + ' through SwapDeck', icon: g.steam ? exe : g.exe, iconIndex: 0 });
    return ok ? { ok: true, file: path.basename(file) } : { ok: false, error: "Windows didn't create the shortcut." };
  });

  // ---- displays ----
  ipcMain.handle('display:list', () => display.list().catch(() => []));
  ipcMain.handle('audio:list', () => audio.list().catch(() => []));
  ipcMain.handle('play:log', () => store.playLog());
  ipcMain.handle('play:sessions', () => store.sessions());
  ipcMain.handle('lib:steamOpts', (_, id) => {
    const g = findGame(String(id)); if (!g || !g.steam) return [];
    const names = Object.fromEntries(accounts().map(a => [a.sid, a.name]));
    return steam.steamLaunchOptions(loc.dir, g.appid).map(o => ({ ...o, name: names[o.sid] || 'another account' }));
  });
  // ---- CS2 per-account settings ----
  ipcMain.handle('cs2:info', (_, sid) => {
    sid = String(sid);
    const installed = !!cs2Folder();
    return {
      installed, autoexec: store.cs2Cfg(sid).autoexec || '', hasSettings: installed && steam.cs2HasSettings(loc.dir, sid),
      sources: installed ? accounts().filter(a => a.sid !== sid && steam.cs2HasSettings(loc.dir, a.sid)).map(a => ({ sid: a.sid, name: a.name })) : [],
    };
  });
  ipcMain.handle('cs2:autoexec', (_, sid, text) => {
    store.setCs2Cfg(String(sid), { autoexec: String(text || '').slice(0, 20000) });
    // Signed in on this account right now: put it in place straight away.
    if (lastStatus.running && lastStatus.activeSid === String(sid)) applyCs2Autoexec(String(sid));
    return true;
  });
  ipcMain.handle('cs2:copy', async (_, fromSid, toSid) => {
    const r = await steam.readSteamReg().catch(() => null);
    if (r && String(r.runningAppId) === '730') return { ok: false, error: 'Close CS2 first, it saves its settings when it exits.' };
    try { const res = steam.cs2CopySettings(loc.dir, String(fromSid), String(toSid)); return { ok: true, ...res }; }
    catch (e) { return { ok: false, error: e.message }; }
  });
  // ---- tray panel ----
  ipcMain.handle('tray:data', () => {
    const accs = accounts(), lib = library.build(loc.dir), s = store.settings();
    return {
      steam: steamState(), version: app.getVersion(), session: player.current(), winAccent: winAccent(),
      settings: { base: s.base, accent: s.accent, customAccent: s.customAccent, reduceMotion: s.reduceMotion },
      accounts: accs.map(a => ({ sid: a.sid, name: a.name, login: a.login, avatar: a.avatar || null, lastUsed: a.lastUsed || 0, pinned: !!a.pinned })),
      games: lib.filter(g => g.installed).sort((a, b) => b.lastPlayed - a.lastPlayed).slice(0, 15)
        .map(g => ({ id: g.id, name: g.name, cover: g.img || (g.steam ? g.cover : null), acct: g.acct, lastPlayed: g.lastPlayed })),
    };
  });
  ipcMain.on('tray:size', (_, h) => { if (trayWin && !trayWin.isDestroyed() && trayWin.isVisible()) placeTrayPanel(Math.round(h)); });
  ipcMain.on('tray:open', () => { hideTrayPanel(); showWin(); });
  ipcMain.on('tray:hide', () => hideTrayPanel());
  ipcMain.on('tray:quit', () => { quitting = true; app.quit(); });
  ipcMain.handle('lib:pickApp', async () => {
    const r = await dialog.showOpenDialog(win, { title: 'Choose an app to start with the game', properties: ['openFile'], filters: [{ name: 'Programs', extensions: ['exe'] }] });
    return r.canceled ? null : r.filePaths[0];
  });
  ipcMain.handle('backup:export', async () => {
    const d = new Date(), name = 'SwapDeck-backup-' + d.toISOString().slice(0, 10) + '.json';
    const r = await dialog.showSaveDialog(win, { title: 'Save a SwapDeck backup', defaultPath: path.join(app.getPath('documents'), name), filters: [{ name: 'SwapDeck backup', extensions: ['json'] }] });
    if (r.canceled || !r.filePath) return { ok: false };
    try { fs.writeFileSync(r.filePath, JSON.stringify(store.exportData(), null, 1)); return { ok: true, file: path.basename(r.filePath) }; }
    catch (e) { return { ok: false, error: e.message }; }
  });
  ipcMain.handle('backup:import', async () => {
    const r = await dialog.showOpenDialog(win, { title: 'Restore a SwapDeck backup', properties: ['openFile'], filters: [{ name: 'SwapDeck backup', extensions: ['json'] }] });
    if (r.canceled || !r.filePaths[0]) return { ok: false };
    try { store.importData(JSON.parse(fs.readFileSync(r.filePaths[0], 'utf8'))); applyZoom(false); updateTray(); applyHotkey(); return { ok: true, file: path.basename(r.filePaths[0]) }; }
    catch (e) { return { ok: false, error: e instanceof SyntaxError ? "That file isn't a SwapDeck backup." : e.message }; }
  });
  ipcMain.handle('display:modes', (_, id) => display.modes(String(id)).catch(() => []));
  ipcMain.handle('res:save', (_, p) => {
    const c = cleanProfile(p || {}); if (!c) return { ok: false, error: 'Use a width and height like 1280 × 960.' };
    const list = store.resProfiles().filter(x => x.id !== c.id);
    const i = store.resProfiles().findIndex(x => x.id === c.id);
    list.splice(i < 0 ? list.length : i, 0, c);
    store.setResProfiles(list);
    return { ok: true, profile: c, list };
  });
  ipcMain.handle('res:remove', (_, id) => {
    store.setResProfiles(store.resProfiles().filter(x => x.id !== id));
    for (const [gid, cfg] of Object.entries(store.allGameCfgs())) if (cfg.display && cfg.display.res === id) store.setGameCfg(gid, { display: { res: null } });
    return store.resProfiles();
  });
  ipcMain.handle('res:test', (_, id) => {
    const p = store.resProfiles().find(x => x.id === id);
    return p ? player.testRes(p) : { ok: false, error: 'Profile not found.' };
  });
  ipcMain.handle('display:test', (_, id) => player.test(String(id)));
  ipcMain.handle('display:restore', () => player.restoreNow());
  ipcMain.handle('display:normal', async () => {
    try { await applyNormal(); store.setDisplaySaved(null); return { ok: true, monitors: await display.list() }; }
    catch (e) { return { ok: false, error: e.message }; }
  });
  ipcMain.on('win', (_, a) => {
    if (!win) return;
    if (a === 'min') win.minimize();
    else if (a === 'max') win.isMaximized() ? win.unmaximize() : win.maximize();
    else if (a === 'close') win.close();
  });
}

function onLinked(sid) {
  send('account', oneAccount(sid));
}

// ---------- CS2 per-account autoexec ----------

// CS2 keeps most settings per account already; autoexec.cfg in the game folder is shared. An account can
// have its own autoexec text, written into place when SwapDeck switches to it or launches CS2 on it.
// The user's original autoexec.cfg is saved once as autoexec.swapdeck-original.cfg and put back for
// accounts without their own.
function cs2Folder() {
  const g = steam.installedGames(loc.dir).find(x => String(x.appid) === '730');
  return g ? g.folder : null;
}
function applyCs2Autoexec(sid) {
  try {
    const dir = cs2Folder(); if (!dir || !sid) return;
    const cfgDir = path.join(dir, 'game', 'csgo', 'cfg'), file = path.join(cfgDir, 'autoexec.cfg'), orig = path.join(cfgDir, 'autoexec.swapdeck-original.cfg');
    const text = store.cs2Cfg(sid).autoexec;
    if (text && text.trim()) {
      if (!fs.existsSync(orig)) fs.writeFileSync(orig, fs.existsSync(file) ? fs.readFileSync(file) : '');
      fs.writeFileSync(file, text.replace(/\r?\n/g, '\r\n'));
    } else if (fs.existsSync(orig)) {
      fs.copyFileSync(orig, file);
    }
  } catch (e) { send('notice', { type: 'warning', title: "Couldn't set the CS2 autoexec", msg: e.message }); }
}

// ---------- start with Windows ----------

// Windows starts SwapDeck with --startup; the portable build registers its own .exe, not the unpacked temp copy.
function loginOpts() {
  const exe = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
  return { path: exe, args: [...(app.isPackaged ? [] : [app.getAppPath()]), '--startup'] };
}
const startsWithWindows = () => { try { return app.getLoginItemSettings(loginOpts()).openAtLogin; } catch { return false; } };
function setStartWithWindows(on) { app.setLoginItemSettings({ openAtLogin: !!on, ...loginOpts() }); }
// Started by Windows with the tray on: stay hidden in the tray instead of opening the window.
const startHidden = () => process.argv.includes('--startup') && !!store.settings().tray;

// ---------- tray ----------

let tray = null, trayWin = null, quitting = false, trayHiddenAt = 0;
const TRAY_W = 340;

// The tray panel: a small frameless window styled like the app, shown above the tray icon.
function trayPanel() {
  if (trayWin && !trayWin.isDestroyed()) return trayWin;
  trayWin = new BrowserWindow({
    width: TRAY_W, height: 460, show: false, frame: false, resizable: false, movable: false, minimizable: false, maximizable: false,
    fullscreenable: false, skipTaskbar: true, alwaysOnTop: true, transparent: true, backgroundColor: '#00000000', title: 'SwapDeck',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  trayWin.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  trayWin.webContents.on('will-navigate', e => e.preventDefault());
  trayWin.on('blur', () => hideTrayPanel());
  trayWin.on('closed', () => { trayWin = null; });
  trayWin.loadFile(path.join(__dirname, 'src', 'renderer', 'tray.html'));
  return trayWin;
}
function hideTrayPanel() {
  if (trayWin && !trayWin.isDestroyed() && trayWin.isVisible()) { trayWin.hide(); trayHiddenAt = Date.now(); }
}
function placeTrayPanel(h) {
  const w = trayPanel(), tb = tray ? tray.getBounds() : null;
  const pt = tb ? { x: tb.x + tb.width / 2, y: tb.y + tb.height / 2 } : screen.getCursorScreenPoint();
  const d = screen.getDisplayNearestPoint(pt), wa = d.workArea, H = Math.min(h || w.getBounds().height, wa.height - 16);
  let x = Math.round(pt.x - TRAY_W / 2), y;
  // Sit next to the taskbar, wherever it is.
  if (pt.y > wa.y + wa.height) y = wa.y + wa.height - H - 8;
  else if (pt.y < wa.y) y = wa.y + 8;
  else if (pt.x < wa.x || pt.x > wa.x + wa.width) { y = Math.round(pt.y - H / 2); x = pt.x < wa.x ? wa.x + 8 : wa.x + wa.width - TRAY_W - 8; }
  // The icon is inside the hidden-icons flyout (the ^), not on the taskbar: use the corner above the clock, like Windows' own popups.
  else { x = wa.x + wa.width - TRAY_W - 12; y = wa.y + wa.height - H - 12; }
  x = Math.max(wa.x + 8, Math.min(x, wa.x + wa.width - TRAY_W - 8));
  y = Math.max(wa.y + 8, Math.min(y, wa.y + wa.height - H - 8));
  w.setBounds({ x, y, width: TRAY_W, height: H });
}
function toggleTrayPanel() {
  const w = trayPanel();
  // A click on the tray icon blurs (and hides) the panel first; don't reopen it straight away.
  if (w.isVisible() || Date.now() - trayHiddenAt < 250) { hideTrayPanel(); return; }
  placeTrayPanel();
  w.webContents.send('tray-show');
  w.show(); w.focus();
  // Taking focus again a moment later makes Windows close the hidden-icons flyout if the click came from there.
  setTimeout(() => { if (w.isVisible()) w.focus(); }, 120);
}

function showWin() {
  if (!win) { createWindow(); return; }
  if (win.isMinimized()) win.restore();
  win.show(); win.focus();
}

// The tray icon exists only while "Keep running in the tray" is on.
function updateTray() {
  const on = !!store.settings().tray;
  if (on && !tray) {
    tray = new Tray(nativeImage.createFromPath(path.join(__dirname, 'build', 'icon.png')).resize({ width: 16, height: 16 }));
    tray.setToolTip('SwapDeck');
    tray.on('click', toggleTrayPanel);
    tray.on('right-click', toggleTrayPanel);
  } else if (!on && tray) { tray.destroy(); tray = null; if (trayWin && !trayWin.isDestroyed()) trayWin.destroy(); }
}

// A backup from another PC can carry a malformed key (reset to the default) or one another program owns
// here (reported in Settings by hotkey.error()).
function applyHotkey() {
  if (!hotkey.isValidKey(store.settings().hotkey)) store.setSettings({ hotkey: hotkey.DEFAULT_KEY });
  hotkey.apply(store.settings());
}

// ---------- UI scale ----------

// 100% UI scale = the page at 90% zoom in a 900x640 window, which is the default window size.
// "auto" scales from that reference as the window grows. The CSS layout needs at least 900x640 px.
const REF_W = 900, REF_H = 640, BASE_ZOOM = 0.9, MIN_W = 900, MIN_H = 640;
const SCALES = store.SCALES;
let zoomFactor = 1; // user-facing scale (1 = 100%)

function applyZoom(announce) {
  if (!win || win.isDestroyed()) return;
  const [w, h] = win.getContentSize();
  const pref = store.settings().uiScale ?? 'auto';
  const rel = pref === 'auto' ? Math.max(0.8, Math.min(w / REF_W, h / REF_H)) : Number(pref) || 1;
  // Never scale past the point where the layout's minimum size no longer fits the window.
  const z = Math.round(Math.max(0.5, Math.min(rel * BASE_ZOOM, w / MIN_W, h / MIN_H, 2)) * 1000) / 1000;
  if (Math.abs(win.webContents.getZoomFactor() - z) > 0.004) win.webContents.setZoomFactor(z);
  zoomFactor = Math.round(z / BASE_ZOOM * 100) / 100;
  send('zoom', { pref, factor: zoomFactor, announce: !!announce });
}

function stepZoom(dir) {
  const cur = zoomFactor;
  const next = dir > 0 ? SCALES.find(s => s > cur + 0.01) : [...SCALES].reverse().find(s => s < cur - 0.01);
  if (next == null) return;
  store.setSettings({ uiScale: next });
  applyZoom(true);
}

// ---------- window ----------

const DEFAULT_W = 900, DEFAULT_H = 640;

// Last position/size, if it's still (mostly) on a connected screen. Otherwise null → centred default.
function savedBounds() {
  const s = store.windowState();
  if (!s || ![s.x, s.y, s.width, s.height].every(Number.isFinite)) return null;
  const wa = screen.getDisplayMatching(s).workArea;
  const visW = Math.min(s.x + s.width, wa.x + wa.width) - Math.max(s.x, wa.x);
  const visH = Math.min(s.y + s.height, wa.y + wa.height) - Math.max(s.y, wa.y);
  if (visW < 200 || visH < 100) return null;
  return {
    x: s.x, y: s.y,
    width: Math.min(Math.max(s.width, MIN_W), wa.width),
    height: Math.min(Math.max(s.height, MIN_H), wa.height),
    maximized: !!s.maximized,
  };
}

function trackBounds() {
  let t = null;
  const save = () => {
    if (!win || win.isDestroyed() || win.isMinimized() || win.isFullScreen()) return;
    // Normal bounds, so un-maximizing next session goes back to the size you had before maximizing.
    store.setWindowState({ ...win.getNormalBounds(), maximized: win.isMaximized() });
  };
  const later = () => { clearTimeout(t); t = setTimeout(save, 400); };
  for (const ev of ['resize', 'move', 'maximize', 'unmaximize']) win.on(ev, later);
  win.on('close', () => { clearTimeout(t); save(); });
}

function createWindow() {
  const b = savedBounds();
  win = new BrowserWindow({
    ...(b ? { x: b.x, y: b.y, width: b.width, height: b.height } : { width: DEFAULT_W, height: DEFAULT_H, center: true }),
    minWidth: MIN_W, minHeight: MIN_H, useContentSize: true,
    frame: false, backgroundColor: '#0a0a0c', show: false, title: 'SwapDeck',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true,
    },
  });
  win.once('ready-to-show', () => { if (startHidden()) return; if (b && b.maximized) win.maximize(); win.show(); });
  trackBounds();
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', e => e.preventDefault());
  win.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));
  // With the tray on, closing the window only hides it; Quit is in the tray menu.
  win.on('close', e => { if (tray && !quitting) { e.preventDefault(); win.hide(); } });
  win.on('closed', () => { win = null; });

  const wc = win.webContents;
  wc.setVisualZoomLevelLimits(1, 1);
  wc.on('did-finish-load', () => applyZoom(false));
  win.on('resize', () => applyZoom(false));
  // Ctrl + mouse wheel
  wc.on('zoom-changed', (_, dir) => stepZoom(dir === 'in' ? 1 : -1));
  // Ctrl + / Ctrl - / Ctrl 0 (back to auto)
  wc.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown' || !input.control || input.alt) return;
    if (input.key === '=' || input.key === '+') { e.preventDefault(); stepZoom(1); }
    else if (input.key === '-' || input.key === '_') { e.preventDefault(); stepZoom(-1); }
    else if (input.key === '0') { e.preventDefault(); store.setSettings({ uiScale: 'auto' }); applyZoom(true); }
  });
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_, argv) => {
    showWin();
    const id = playArg(argv);
    if (id) player.play(id);
  });
  app.whenReady().then(async () => {
    store.load();
    Menu.setApplicationMenu(null);
    ipc();
    await detect();
    protocol.handle('sdimg', req => {
      const u = new URL(req.url), parts = decodeURIComponent(u.pathname).split('/').filter(Boolean);
      let file = null;
      if (u.hostname === 'lc' && parts.length === 2 && /^\d+$/.test(parts[0]) && ['library_600x900.jpg', 'library_hero.jpg', 'logo.png'].includes(parts[1])) file = steam.artFile(loc.dir, parts[0], parts[1]);
      else if (u.hostname === 'cover' && parts.length === 1 && /^[\w.-]+$/.test(parts[0])) file = path.join(app.getPath('userData'), 'covers', parts[0]);
      if (!file || !fs.existsSync(file)) return new Response('', { status: 404 });
      return net.fetch(pathToFileURL(file).toString());
    });
    createWindow();
    updateTray();
    hotkey.init(toggleTrayPanel);
    applyHotkey();
    const startId = playArg(process.argv);
    if (startId) win.webContents.once('did-finish-load', () => setTimeout(() => player.play(startId), 1500));
    updater.init(s => send('update', s));
    setInterval(poll, 2500);
    setTimeout(refreshPublicAll, 2500);
    setInterval(refreshPublicAll, 5 * 60 * 1000);
  });
  app.on('window-all-closed', () => app.quit());
  app.on('will-quit', () => hotkey.stop());
  // Quitting mid-session: put the display and sound back and close companion apps first (the game keeps running).
  let stopping = false;
  app.on('before-quit', e => {
    quitting = true;
    if (player.current() && !stopping) {
      e.preventDefault(); stopping = true;
      Promise.race([player.stop(), new Promise(r => setTimeout(r, 15000))]).finally(() => app.quit());
      return;
    }
    link.cancel(); try { store.flush(); } catch {}
  });
}

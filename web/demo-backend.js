// SwapDeck browser demo: a pretend main process. It answers the same calls as preload.js with made-up
// accounts, games and monitors, and sends the same events, so the real renderer runs unchanged.
// Nothing here talks to Steam or Windows, and nothing leaves the browser.
(() => {
  'use strict';
  const VERSION = '1.1.0';
  const H = 3600e3, D = 24 * H, now = Date.now();
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const clone = v => JSON.parse(JSON.stringify(v));
  const notice = (title, msg) => emit('notice', { type: 'info', title, msg });
  const DEMO = 'This is the browser demo. Download SwapDeck to do this for real.';

  // ---- avatars (drawn, not real people) ----
  const svg = (bg1, bg2, body) => 'data:image/svg+xml;base64,' + btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 184 184"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient></defs><rect width="184" height="184" fill="url(#g)"/>${body}</svg>`);
  const AV = {
    owl: svg('#1e3a8a', '#0f172a', '<circle cx="92" cy="104" r="58" fill="#7c5a3a"/><path d="M40 66 62 86M144 66 122 86" stroke="#7c5a3a" stroke-width="16" stroke-linecap="round"/><circle cx="70" cy="96" r="22" fill="#fef3c7"/><circle cx="114" cy="96" r="22" fill="#fef3c7"/><circle cx="72" cy="98" r="10" fill="#111"/><circle cx="112" cy="98" r="10" fill="#111"/><circle cx="75" cy="94" r="3" fill="#fff"/><circle cx="115" cy="94" r="3" fill="#fff"/><path d="M84 116h16l-8 12z" fill="#f59e0b"/><path d="M60 140q32 18 64 0" stroke="#a37b52" stroke-width="6" fill="none"/>'),
    helmet: svg('#dc2626', '#450a0a', '<path d="M38 112q0-62 58-66 52 2 54 56v22H86q-10 0-14 10l-6 12H48q-10 0-10-12z" fill="#f8fafc"/><path d="M88 74h56q6 0 6 8v20H88q-8 0-8-8v-12q0-8 8-8z" fill="#0f172a"/><path d="M92 80h48" stroke="#38bdf8" stroke-width="4" opacity=".6"/><path d="M44 104q40-6 40 26" stroke="#dc2626" stroke-width="10" fill="none"/><circle cx="62" cy="80" r="8" fill="#dc2626"/>'),
    lantern: svg('#1c1917', '#052e16', '<circle cx="92" cy="104" r="62" fill="#f59e0b" opacity=".18"/><path d="M78 40h28M92 40V30" stroke="#a8a29e" stroke-width="6" stroke-linecap="round"/><path d="M70 52h44l6 12H64z" fill="#57534e"/><rect x="66" y="64" width="52" height="66" rx="8" fill="#fbbf24" opacity=".9"/><path d="M92 82q-14 18 0 34 14-16 0-34z" fill="#fff7ed"/><path d="M66 64v66M118 64v66M92 64v66" stroke="#44403c" stroke-width="5"/><path d="M60 130h64l-6 12H66z" fill="#57534e"/>'),
    cross: svg('#0891b2', '#082f49', '<circle cx="92" cy="92" r="50" stroke="#e0f2fe" stroke-width="8" fill="none"/><circle cx="92" cy="92" r="20" stroke="#e0f2fe" stroke-width="6" fill="none"/><path d="M92 26v40M92 118v40M26 92h40M118 92h40" stroke="#e0f2fe" stroke-width="8" stroke-linecap="round"/><circle cx="92" cy="92" r="5" fill="#f43f5e"/>'),
    rocket: svg('#7c3aed', '#1e1b4b', '<circle cx="40" cy="44" r="3" fill="#fff"/><circle cx="148" cy="60" r="2" fill="#fff"/><circle cx="130" cy="150" r="3" fill="#fff"/><path d="M92 30q30 26 22 82H70q-8-56 22-82z" fill="#f1f5f9"/><circle cx="92" cy="72" r="12" fill="#38bdf8" stroke="#334155" stroke-width="5"/><path d="M70 98 52 124l20-4zM114 98l18 26-20-4z" fill="#f43f5e"/><path d="M80 114q12 40 24 0z" fill="#f59e0b"/>'),
    snow: svg('#38bdf8', '#1e3a8a', '<g stroke="#f0f9ff" stroke-width="8" stroke-linecap="round"><path d="M92 36v112M44 64l96 56M44 120l96-56"/><path d="M80 44l12 12 12-12M80 140l12-12 12 12M44 80l16-4-4-16M140 104l-16 4 4 16M44 104l16 4-4 16M140 80l-16-4 4-16"/></g>'),
  };

  // ---- accounts ----
  const gamesOwned = big => [['730', 'Counter-Strike 2', 1840], ['244210', 'Assetto Corsa', 412], ['252490', 'Rust', 166], ['1172470', 'Apex Legends', 95]]
    .slice(0, big ? 4 : 2).map(([appid, n, h]) => ({ appid, n, h, w: Math.round(h / 40), icon: null }));
  const stats = (level, wallet, friends, cs) => ({
    acct: { level, wallet, friends, vacCount: 0, vacGames: [], limited: false, communityBanned: false, locked: false, prime: true },
    games: gamesOwned(!!cs), cs2Note: cs ? null : 'not-played',
    cs2: cs ? { prime: true, premier: cs.premier, premierWins: cs.wins, comp: cs.comp, wing: { name: 'Gold Nova III', i: 9, wins: 31 }, level: 34, xp: 3120, xpMax: 5000,
      com: { f: 212, t: 87, l: 64 }, cd: null, medals: [{ name: '2025 Service Medal' }, { name: 'Operation Riptide Coin' }, { name: 'Premier Season One' }, { name: 'Diamond Operation' }], vacBanned: false } : null,
  });
  const pub = (name, st, extra = {}) => ({ name, st, game: null, priv: false, vac: false, trade: 'none', lim: false, since: 'March 14, 2016', avatar: null, ...extra });
  const acc = (sid, login, name, av, tags, ago, o = {}) => ({
    sid, login, name, avatar: av, avatarSrc: 'local', lastUsed: now - ago, tags, note: o.note || '', pinned: !!o.pinned, launch: null,
    linked: !!o.stats, hasCredentials: false, pub: o.pub, pubAt: now - 5 * 60e3, stats: o.stats || null, statsAt: o.stats ? now - 20 * 60e3 : 0,
  });
  const accounts = [
    acc('76561190000000101', 'nightowl_main', 'NightOwl', AV.owl, ['fps'], 40 * 60e3, { pinned: true, note: 'Main. Premier grind.', pub: pub('NightOwl', 'online'),
      stats: stats(87, '€12,40', 142, { premier: 18450, wins: 112, comp: { name: 'Global Elite', i: 18, wins: 241 } }) }),
    acc('76561190000000104', 'crosshair_alt', 'Crosshair', AV.cross, ['fps'], 9 * H, { pub: pub('Crosshair', 'ingame', { game: 'Counter-Strike 2' }),
      stats: stats(21, '€3,15', 17, { premier: 12890, wins: 54, comp: { name: 'Legendary Eagle', i: 15, wins: 88 } }) }),
    acc('76561190000000102', 'apexdrift', 'ApexDrift', AV.helmet, ['racing'], 2 * D, { note: 'Sim racing. Content Manager + SimHub.', pub: pub('ApexDrift', 'offline'), stats: stats(34, '€0,00', 38) }),
    acc('76561190000000103', 'lantern_lit', 'Lantern', AV.lantern, ['horror'], 5 * D, { pub: pub('Lantern', 'offline') }),
    acc('76561190000000105', 'pixelpilot', 'Pixel Pilot', AV.rocket, ['coop'], 14 * D, { pub: pub('Pixel Pilot', 'away') }),
    acc('76561190000000106', 'frostbyte_tr', 'Frostbyte', AV.snow, [], 31 * D, { pub: pub('Frostbyte', 'offline', { trade: 'probation' }) }),
  ];
  const A = n => accounts.find(a => a.name === n);
  let active = A('NightOwl').sid;

  // ---- monitors and sound ----
  const monitors = [
    { id: 'DEL41B8#demo1', name: '\\\\.\\DISPLAY1', hwid: 'DEL41B8', label: 'DELL S2721DGF', attached: true, primary: true, x: 0, y: 0, w: 2560, h: 1440, hz: 165, or: 0, portrait: false, num: '1' },
    { id: 'GSM5B7F#demo2', name: '\\\\.\\DISPLAY2', hwid: 'GSM5B7F', label: 'LG ULTRAWIDE', attached: false, primary: false, x: 0, y: 0, w: 2560, h: 1080, hz: 144, or: 0, portrait: false, num: '2' },
    { id: 'AUS24A1#demo3', name: '\\\\.\\DISPLAY3', hwid: 'AUS24A1', label: 'ASUS VG249', attached: true, primary: false, x: -1080, y: -240, w: 1080, h: 1920, hz: 144, or: 1, portrait: true, num: '3' },
  ];
  const MON = l => monitors.find(m => m.label === l);
  const monPos = {
    [MON('DELL S2721DGF').id]: { x: 0, y: 0, w: 2560, h: 1440, hz: 165, or: 0 },
    [MON('ASUS VG249').id]: { x: -1080, y: -240, w: 1080, h: 1920, hz: 144, or: 1 },
    [MON('LG ULTRAWIDE').id]: { x: 2560, y: 180, w: 2560, h: 1080, hz: 144, or: 0 },
  };
  const MODES = {
    [MON('DELL S2721DGF').id]: [[2560, 1440, 165], [2560, 1440, 144], [1920, 1080, 165], [1920, 1080, 144], [1680, 1050, 144], [1600, 900, 144], [1280, 960, 144], [1280, 1024, 144], [1280, 720, 144], [1024, 768, 144]],
    [MON('LG ULTRAWIDE').id]: [[2560, 1080, 144], [2560, 1080, 100], [1920, 1080, 144], [1680, 1050, 144], [1280, 960, 144], [1280, 720, 144]],
    [MON('ASUS VG249').id]: [[1080, 1920, 144], [1080, 1920, 60], [900, 1600, 60], [768, 1366, 60], [720, 1280, 60]],
  };
  const audio = [
    { id: '{demo}.speakers', name: 'Speakers (Realtek(R) Audio)', def: true },
    { id: '{demo}.headset', name: 'Headset (Arctis Nova 7)', def: false },
    { id: '{demo}.monitor', name: 'DELL S2721DGF (NVIDIA High Definition Audio)', def: false },
  ];

  // ---- settings and profiles ----
  const settings = {
    steamExe: null, launchAfter: false, defaultGame: null, closeAfter: false, steamArgs: '', uiScale: 'auto', base: 'dark', accent: 'cyan', customAccent: '#c084fc',
    followTag: false, reduceMotion: false, startView: 'acc', accountStyle: 'grid', tray: true, hotkeyOn: false, hotkey: 'Ctrl+Alt+S', tagList: [], tagColors: {}, lastSeenVersion: VERSION,
    normalOn: [MON('DELL S2721DGF').id, MON('ASUS VG249').id], normalMon: MON('DELL S2721DGF').id, scaleBase: 0.9, startup: true,
  };
  try { if (matchMedia('(prefers-color-scheme: light)').matches) settings.base = 'light'; } catch {}
  let resProfiles = [
    { id: 'r1700000000001', name: 'CS2 stretched', w: 1280, h: 960, hz: 0, stretch: true },
    { id: 'r1700000000002', name: '1080p 144', w: 1920, h: 1080, hz: 144, stretch: false },
  ];

  // ---- library ----
  const CDN = 'https://cdn.cloudflare.steamstatic.com/steam/apps/';
  const STEAMDIR = 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\';
  const game = (appid, name, folder, acct, hours, ago, o = {}) => ({
    id: 'steam:' + appid, steam: true, appid, name, installed: true, folder: STEAMDIR + folder,
    acct: acct ? A(acct).sid : null, opts: o.opts || '', display: { mon: null, mode: 'primary', restore: true, res: null, ...(o.display || {}) },
    audio: o.audio || null, apps: o.apps || [], launcher: o.launcher || null, tags: o.tags || [], fav: !!o.fav,
    cover: CDN + appid + '/library_600x900.jpg', hero: CDN + appid + '/library_hero.jpg', logo: CDN + appid + '/logo.png',
    lastPlayed: ago == null ? 0 : now - ago, hours,
  });
  const lib = [
    game('730', 'Counter-Strike 2', 'Counter-Strike Global Offensive', 'NightOwl', 412.5, 50 * 60e3, { opts: '-novid -high +fps_max 0', display: { res: 'r1700000000001' }, tags: ['fps'], fav: true }),
    game('244210', 'Assetto Corsa', 'assettocorsa', 'ApexDrift', 186.2, 2 * D, {
      display: { mon: MON('LG ULTRAWIDE').id, mode: 'only' }, audio: '{demo}.headset',
      apps: [{ path: 'C:\\Program Files (x86)\\SimHub\\SimHubWPF.exe', args: '', close: true }],
      launcher: 'C:\\Games\\Content Manager\\Content Manager.exe', tags: ['racing', 'sim'], fav: true }),
    game('2399420', 'Le Mans Ultimate', 'Le Mans Ultimate', 'ApexDrift', 41.7, 4 * D, { display: { mon: MON('LG ULTRAWIDE').id, mode: 'only' }, audio: '{demo}.headset', tags: ['racing', 'sim'] }),
    game('805550', 'Assetto Corsa Competizione', 'Assetto Corsa Competizione', 'ApexDrift', 63.4, 9 * D, { display: { mon: MON('LG ULTRAWIDE').id, mode: 'only' }, tags: ['racing', 'sim'] }),
    game('1144200', 'Ready or Not', 'Ready Or Not', 'Crosshair', 17.3, 3 * D, { tags: ['fps', 'co-op'] }),
    game('739630', 'Phasmophobia', 'Phasmophobia', 'Lantern', 52.8, 5 * D, { audio: '{demo}.headset', tags: ['horror', 'co-op'] }),
    game('381210', 'Dead by Daylight', 'Dead by Daylight', 'Lantern', 120.4, 12 * D, { tags: ['horror'] }),
    game('1966720', 'Lethal Company', 'Lethal Company', 'Pixel Pilot', 33.1, 14 * D, { tags: ['horror', 'co-op'] }),
    game('252490', 'Rust', 'Rust', null, 166, 20 * D),
    game('690790', 'DiRT Rally 2.0', 'DiRT Rally 2.0', 'ApexDrift', 22.6, 25 * D, { tags: ['racing'] }),
  ];
  const gamesList = () => lib.filter(g => g.steam).map(g => ({ appid: g.appid, name: g.name, folder: g.folder, icon: null }));
  const findGame = id => lib.find(g => g.id === id);

  // ---- history ----
  const sessions = [
    { sid: A('NightOwl').sid, gid: 'steam:730', start: now - 3 * H, ms: 2.2 * H },
    { sid: A('ApexDrift').sid, gid: 'steam:244210', start: now - 2 * D, ms: 1.6 * H },
    { sid: A('Crosshair').sid, gid: 'steam:1144200', start: now - 3 * D, ms: 0.9 * H },
    { sid: A('Lantern').sid, gid: 'steam:739630', start: now - 5 * D, ms: 1.3 * H },
  ];
  const playLog = {
    [A('NightOwl').sid]: { 'steam:730': { ms: 42 * H, n: 31, last: now - 3 * H } },
    [A('ApexDrift').sid]: { 'steam:244210': { ms: 19 * H, n: 12, last: now - 2 * D }, 'steam:2399420': { ms: 6 * H, n: 4, last: now - 4 * D } },
    [A('Crosshair').sid]: { 'steam:1144200': { ms: 7 * H, n: 6, last: now - 3 * D } },
    [A('Lantern').sid]: { 'steam:739630': { ms: 11 * H, n: 9, last: now - 5 * D } },
  };
  const cs2 = { [A('NightOwl').sid]: { autoexec: 'cl_crosshairsize 2\ncl_crosshairgap -2\nviewmodel_fov 68\n', settings: true }, [A('Crosshair').sid]: { autoexec: '', settings: true } };

  // ---- scenarios: ?scenario=empty starts like a fresh install; loadScenario/queuePick/queueAccount script a walkthrough ----
  const FULL = clone({ accounts, lib, resProfiles, sessions, playLog, active });
  const custom = [];
  const fill = (arr, items) => { arr.length = 0; arr.push(...items); };
  function loadScenario(name, o = {}) {
    if (name === 'empty') {
      fill(accounts, []); active = null; resProfiles = [];
      fill(lib, clone(FULL.lib).map(g => ({ ...g, acct: null, tags: [], opts: '', display: { mon: null, mode: 'primary', restore: true, res: null }, audio: null, apps: [], launcher: null })));
      fill(sessions, []); for (const k of Object.keys(playLog)) delete playLog[k];
    } else {
      fill(accounts, clone(FULL.accounts)); active = FULL.active; resProfiles = o.noProfiles ? [] : clone(FULL.resProfiles);
      fill(lib, clone(FULL.lib)); fill(sessions, clone(FULL.sessions));
      for (const k of Object.keys(playLog)) delete playLog[k]; Object.assign(playLog, clone(FULL.playLog));
      for (const id of o.fresh || []) { const g = findGame(id); if (g) Object.assign(g, { acct: null, opts: '', display: { mon: null, mode: 'primary', restore: true, res: null }, audio: null, apps: [], launcher: null }); }
    }
    for (const c of custom) if (!findGame(c.id)) lib.push(clone(c));
  }
  const picks = { exe: [], image: [], app: [] }, addQueue = [];
  const covers = {}; // picked cover file name -> image URL
  const pick = (kind, title) => {
    if (!picks[kind].length) return Promise.resolve(no(title));
    const v = picks[kind].shift(); if (kind === 'image') covers[v.file] = v.url;
    return Promise.resolve(v);
  };
  const scenario = new URLSearchParams(location.search).get('scenario');
  if (scenario === 'empty') loadScenario('empty');

  // ---- events: every frame (app window, tray panel) registers its listeners here ----
  const listeners = [];
  function emit(ch, ...a) { for (const l of listeners.slice()) if (l.ch === ch) { try { l.fn(...clone(a)); } catch (e) { console.error(e); } } }
  function on(ch, fn, frame) { const l = { ch, fn, frame }; listeners.push(l); return () => { const i = listeners.indexOf(l); if (i >= 0) listeners.splice(i, 1); }; }

  const steamState = () => ({ found: true, exe: 'C:\\Program Files (x86)\\Steam\\steam.exe', checked: [], running: true, activeSid: active, autoLoginUser: (accounts.find(a => a.sid === active) || {}).login || '', busy: null });
  let busy = null, session = null, zoom = { pref: 'auto', factor: 1.25 };
  const curSession = () => session && { gid: session.gid, steps: session.steps, step: session.step, running: session.running, mon: session.mon, res: session.res, changed: session.changed, mode: session.mode, restore: session.restore, acct: session.acct };
  const sendLaunch = () => emit('launch', curSession());

  async function switchTo(sid, quiet) {
    const a = accounts.find(x => x.sid === sid);
    if (!a) return { ok: false, error: 'That account is no longer in Steam\'s saved logins.' };
    if (busy) return { ok: false, code: 'BUSY' };
    if (session && !quiet) return { ok: false, code: 'RUNNING', error: 'A game SwapDeck launched is still running. Restarting Steam now would close it, so quit the game (or press Stop) first.' };
    busy = 'switch';
    const steps = ['Closing Steam…', 'Logging in as ' + a.name + '…', 'Waiting for Steam to start…', 'Done'];
    for (let i = 0; i < steps.length; i++) { emit('switch', { sid, steps, step: i }); await wait([650, 800, 900, 350][i]); }
    active = sid; a.lastUsed = Date.now(); busy = null;
    emit('steam', steamState());
    return { ok: true };
  }

  async function play(id) {
    const g = findGame(id); if (!g) return { ok: false, error: 'Game not found.' };
    if (session) return { ok: false, code: 'RUNNING', error: 'A game is already running. Stop tracking it first.' };
    const acct = g.acct && accounts.find(a => a.sid === g.acct);
    const mon = g.display.mon && monitors.find(m => m.id === g.display.mon);
    const res = g.display.res && resProfiles.find(p => p.id === g.display.res);
    const dev = g.audio && audio.find(d => d.id === g.audio);
    const needSw = acct && acct.sid !== active;
    const resTxt = res ? res.name + ' (' + res.w + '×' + res.h + (res.stretch ? ', stretched' : '') + ')' : '';
    const steps = [];
    if (g.steam) steps.push(needSw ? { k: 'acct', label: 'Switching to ' + acct.name, sub: 'Restarting Steam as ' + acct.login }
      : { k: 'acct', label: acct ? 'Switching to ' + acct.name : 'Steam account', sub: (acct ? 'Already signed in' : 'Using ' + ((accounts.find(a => a.sid === active) || {}).name || 'the current account')) + ' · skipped', skip: true });
    steps.push(mon || res ? { k: 'disp', label: 'Setting display', sub: [mon ? mon.label + (g.display.mode === 'only' ? ' only · others off' : ' → primary') : null, res ? resTxt : null].filter(Boolean).join(' · ') }
      : { k: 'disp', label: 'Setting display', sub: 'Default display · skipped', skip: true });
    if (dev) steps.push({ k: 'audio', label: 'Setting sound', sub: dev.name });
    if (g.apps.length) steps.push({ k: 'apps', label: 'Starting companion apps', sub: g.apps.map(x => x.path.split('\\').pop().replace(/\.exe$/i, '')).join(', ') });
    steps.push({ k: 'launch', label: 'Launching ' + g.name, sub: (g.launcher ? 'via ' + g.launcher.split('\\').pop() : g.steam ? 'steam://rungameid/' + g.appid : g.exe.split('\\').pop()) + (g.opts ? ' ' + g.opts : '') });
    steps.push({ k: 'run', label: 'Game running' });
    session = { gid: id, steps, step: 0, running: false, mon: mon ? mon.id : null, res: res ? resTxt : null, changed: !!(mon || res), mode: g.display.mode, restore: g.display.restore, acct: acct ? acct.sid : null, start: 0, logAcct: acct ? acct.sid : g.steam ? active : 'local' };
    const me = session;
    (async () => {
      for (let i = 0; i < steps.length && session === me; i++) {
        me.step = i; me.running = steps[i].k === 'run'; sendLaunch();
        const k = steps[i].k;
        if (k === 'acct' && needSw) { await switchTo(acct.sid, true); continue; }
        if (k === 'disp' && !steps[i].skip) { await wait(900); emit('display-changed', { mode: mon ? g.display.mode : null, label: (mon || monitors.find(m => m.primary)).label, res: res ? resTxt : null }); continue; }
        if (k === 'run') { me.start = Date.now(); g.lastPlayed = Date.now(); break; }
        await wait(steps[i].skip ? 300 : 950);
      }
    })();
    return { ok: true };
  }

  function stopGame() {
    const s = session; if (!s) return;
    session = null;
    const ms = s.start ? Date.now() - s.start : 0;
    if (ms > 0) {
      sessions.unshift({ sid: s.logAcct, gid: s.gid, start: s.start, ms });
      const pl = (playLog[s.logAcct] = playLog[s.logAcct] || {}), e = (pl[s.gid] = pl[s.gid] || { ms: 0, n: 0, last: 0 });
      e.ms += ms; e.n++; e.last = Date.now();
    }
    emit('launch-end', { gid: s.gid, reason: 'stopped', restored: s.changed && s.restore, hadMon: !!s.mon, restoreOn: s.restore });
  }

  const state = () => ({
    steam: steamState(), accounts: accounts.map(a => ({ ...a })), games: gamesList(), settings: { ...settings }, version: VERSION, busy, zoom: zoom.factor,
    update: { state: 'idle' }, vault: { mode: 'dpapi', locked: false, autoUnlock: false, canEncrypt: true }, lib: lib.map(clone), monitors: clone(monitors),
    winAccent: '#0078d4', session: curSession(), displaySaved: false, monPos: clone(monPos), resProfiles: clone(resProfiles), playLog: clone(playLog),
    sessions: clone(sessions), newInstall: false,
  });

  // ---- the window.api every frame gets ----
  const no = (title) => { notice(title || 'Not in the demo', DEMO); return null; };
  const api = frame => ({
    state: async () => clone(state()),
    switchTo: sid => switchTo(String(sid)),
    closeSteam: async () => { notice('Steam closed (pretend)', DEMO); return { ok: true }; },
    startSteam: async () => ({ ok: true }),
    addAccount: async () => {
      const name = addQueue.shift();
      if (!name) { no('Adding accounts'); return { ok: true, cancelled: true }; }
      await wait(3400);
      const a = clone(FULL.accounts.find(x => x.name === name)); a.lastUsed = Date.now();
      accounts.push(a); active = a.sid; emit('steam', steamState());
      return { ok: true, sid: a.sid, name: a.name };
    },
    cancelAdd: async () => {},
    forget: async () => { no('Forgetting accounts'); return { ok: false, code: 'DEMO', error: DEMO }; },
    setMeta: async (sid, patch) => { const a = accounts.find(x => x.sid === sid); if (!a) return null; for (const k of ['tags', 'note', 'pinned', 'launch']) if (k in patch) a[k] = patch[k]; return clone(a); },
    setSettings: async patch => {
      for (const k of Object.keys(patch)) if (k !== 'uiScale' && k !== 'tagColor') settings[k] = patch[k];
      if (patch.tagColor) { const c = { ...settings.tagColors }; if (patch.tagColor.rgb) c[patch.tagColor.tag] = patch.tagColor.rgb; else delete c[patch.tagColor.tag]; settings.tagColors = c; }
      if ('uiScale' in patch) { settings.uiScale = patch.uiScale; setZoom(patch.uiScale, true); }
      // A web page can't listen for keys outside its tab, so the demo only remembers the choice.
      if (patch.hotkeyOn) notice('Shortcut', 'In the app, these keys open the tray panel from any program. The demo only remembers your choice.');
      return { ...settings };
    },
    browseSteam: async () => ({ ok: true }),
    refreshStats: async sid => {
      const a = accounts.find(x => x.sid === sid); if (!a) return { ok: false };
      for (let i = 0; i < (a.linked ? 4 : 1); i++) { emit('stats', { sid, step: i }); await wait(450); }
      emit('stats', { sid, step: null });
      a.pubAt = Date.now(); if (a.linked) a.statsAt = Date.now();
      return { ok: true, account: clone(a), warnings: [] };
    },
    linkQR: async () => emit('link', { step: 'fail', err: 'Connecting accounts is turned off in the browser demo. Download SwapDeck to connect yours.' }),
    linkPassword: async () => emit('link', { step: 'fail', err: 'Connecting accounts is turned off in the browser demo.' }),
    linkToken: async () => emit('link', { step: 'fail', err: 'Connecting accounts is turned off in the browser demo.' }),
    linkCode: async () => {}, linkCancel: async () => {},
    unlink: async sid => { const a = accounts.find(x => x.sid === sid); if (a) { a.linked = false; a.stats = null; a.statsAt = 0; } return a && clone(a); },
    clearCredentials: async sid => clone(accounts.find(x => x.sid === sid) || null),
    openProfile: async () => no('Steam profiles'),
    checkUpdates: async () => { emit('update', { state: 'checking' }); await wait(700); emit('update', { state: 'none', current: VERSION, announce: true }); },
    installUpdate: async () => {},
    vaultStatus: async () => state().vault,
    vaultUnlock: async () => ({ ok: true }),
    vaultSet: async () => ({ ok: false, error: 'Not in the browser demo.' }),
    vaultChange: async () => ({ ok: false, error: 'Not in the browser demo.' }),
    vaultRemove: async () => ({ ok: false, error: 'Not in the browser demo.' }),
    vaultAutoUnlock: async () => state().vault,
    libList: async () => lib.map(clone),
    libSet: async (id, patch) => {
      const g = findGame(id); if (!g) return null;
      if ('acct' in patch) g.acct = patch.acct || null;
      if ('opts' in patch) g.opts = String(patch.opts || '');
      if (patch.display) Object.assign(g.display, patch.display);
      if ('launcher' in patch) g.launcher = patch.launcher || null;
      if ('audio' in patch) g.audio = patch.audio || null;
      if (Array.isArray(patch.apps)) g.apps = patch.apps;
      if (Array.isArray(patch.tags)) g.tags = patch.tags.map(String).slice(0, 12);
      if ('fav' in patch) g.fav = !!patch.fav;
      return clone(g);
    },
    libPickExe: () => pick('exe', 'Choosing files'), libPickImage: () => pick('image', 'Choosing files'), libPickApp: () => pick('app', 'Choosing files'),
    libSaveCustom: async g => {
      if (!g || !g.exe || !String(g.name || '').trim()) return null;
      const id = g.id || 'custom:' + Date.now();
      const item = { id, steam: false, name: String(g.name).trim(), exe: g.exe, installed: true, folder: g.exe.slice(0, g.exe.lastIndexOf(String.fromCharCode(92))), acct: null, opts: g.opts || '',
        display: { mon: null, mode: 'primary', restore: true, res: null }, audio: null, apps: [], launcher: null, tags: [],
        img: (g.img && covers[g.img]) || null, iconMode: g.iconMode || 'gen', lastPlayed: 0, hours: 0 };
      const i = custom.findIndex(c => c.id === id); if (i < 0) custom.push(item); else custom[i] = item;
      const j = lib.findIndex(x => x.id === id); if (j < 0) lib.push(clone(item)); else lib[j] = { ...lib[j], ...clone(item) };
      return id;
    },
    libRemoveCustom: async () => null, libRestoreCustom: async () => null,
    play: id => play(String(id)),
    stopGame: async () => stopGame(),
    shortcut: async () => ({ ok: false, error: DEMO }),
    displays: async () => clone(monitors),
    displayModes: async id => (MODES[id] || []).map(([w, h, hz]) => ({ w, h, hz })),
    saveResProfile: async p => {
      const w = Math.round(+p.w), h = Math.round(+p.h); if (!(w >= 320 && h >= 200)) return { ok: false, error: 'Use a width and height like 1280 × 960.' };
      const c = { id: /^r\d+$/.test(p.id) ? p.id : 'r' + Date.now(), name: String(p.name || '').trim().slice(0, 40) || w + '×' + h, w, h, hz: Math.round(+p.hz) || 0, stretch: !!p.stretch };
      const i = resProfiles.findIndex(x => x.id === c.id); if (i < 0) resProfiles.push(c); else resProfiles[i] = c;
      return { ok: true, profile: c, list: clone(resProfiles) };
    },
    removeResProfile: async id => { resProfiles = resProfiles.filter(x => x.id !== id); lib.forEach(g => { if (g.display.res === id) g.display.res = null; }); return clone(resProfiles); },
    testResProfile: async () => { await wait(2500); return { ok: true }; },
    testDisplay: async () => { await wait(2500); return { ok: true }; },
    restoreDisplay: async () => ({ ok: true }),
    applyNormalDisplay: async () => { await wait(600); return { ok: true, monitors: clone(monitors) }; },
    audioDevices: async () => clone(audio),
    playLog: async () => clone(playLog),
    playSessions: async () => clone(sessions),
    exportBackup: async () => { no('Backups'); return { ok: false }; },
    importBackup: async () => { no('Backups'); return { ok: false }; },
    trayData: async () => ({
      steam: steamState(), version: VERSION, session: curSession(), winAccent: '#0078d4',
      settings: { base: settings.base, accent: settings.accent, customAccent: settings.customAccent, reduceMotion: settings.reduceMotion },
      accounts: accounts.map(a => ({ sid: a.sid, name: a.name, login: a.login, avatar: a.avatar, lastUsed: a.lastUsed, pinned: a.pinned })),
      games: lib.filter(g => g.installed).sort((a, b) => b.lastPlayed - a.lastPlayed).slice(0, 15).map(g => ({ id: g.id, name: g.name, cover: g.cover, acct: g.acct, lastPlayed: g.lastPlayed })),
    }),
    steamLaunchOpts: async id => { const g = findGame(id); return g && g.appid === '730' ? [{ sid: A('NightOwl').sid, name: 'NightOwl', opts: '-novid -high +fps_max 0' }] : []; },
    cs2Info: async sid => ({
      installed: true, autoexec: (cs2[sid] && cs2[sid].autoexec) || '', hasSettings: !!(cs2[sid] && cs2[sid].settings),
      sources: accounts.filter(a => a.sid !== sid && cs2[a.sid] && cs2[a.sid].settings).map(a => ({ sid: a.sid, name: a.name })),
    }),
    cs2Autoexec: async (sid, text) => { (cs2[sid] = cs2[sid] || {}).autoexec = String(text || ''); return true; },
    cs2Copy: async (from, to) => { (cs2[to] = cs2[to] || {}).settings = true; return { ok: true, files: 3 }; },
    traySize: h => window.SDDemoUI && window.SDDemoUI.traySize(h),
    trayOpen: () => window.SDDemoUI && window.SDDemoUI.trayOpen(),
    trayHide: () => window.SDDemoUI && window.SDDemoUI.trayHide(),
    trayQuit: () => { window.SDDemoUI && window.SDDemoUI.trayHide(); notice('Quit SwapDeck', DEMO); },
    win: a => window.SDDemoUI && window.SDDemoUI.win(a),
    on: (ch, fn) => on(ch, fn, frame),
  });

  // UI scale: the page stands in for the window, so "zoom" is how big the app is drawn inside it.
  function setZoom(pref, announce) {
    const base = window.SDDemoUI ? window.SDDemoUI.autoScale() : 1.25;
    const factor = pref === 'auto' ? base : Number(pref) || 1;
    zoom = { pref, factor: Math.round(factor * 100) / 100 };
    if (window.SDDemoUI) window.SDDemoUI.setScale(zoom.factor);
    emit('zoom', { pref, factor: zoom.factor, announce: !!announce });
  }

  window.SDDemo = {
    api, emit, setZoom, showTray: () => emit('tray-show'),
    drop: frame => { for (let i = listeners.length - 1; i >= 0; i--) if (listeners[i].frame === frame) listeners.splice(i, 1); },
    // for scripted walkthroughs
    loadScenario, queuePick: (kind, v) => picks[kind].push(v), queueAccount: name => addQueue.push(name),
  };
})();

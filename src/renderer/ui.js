// SwapDeck renderer logic for the v6 design. view.js is the markup (converted from the Claude Design
// export, then hand-maintained); this file turns real app state into the values view(b) binds to.

import { html, render, Component } from './vendor/htm-preact.js';
import { view } from './view.js';
import { displayVals } from './displays.js';
import { galleryEl } from './gallery.js';

const api = window.api;

// ---------- palette & helpers ----------

const KNOWN = ['fps', 'racing', 'horror'];
const NEU = ['rgba(var(--fg-rgb),.07)', 'var(--text-soft)', 'rgba(var(--fg-rgb),.22)'];
const OK = ['rgba(74,222,128,.12)', 'var(--ok-fg)', 'rgba(74,222,128,.38)'];
const BAD = ['rgba(248,113,113,.14)', 'var(--bad-fg)', 'rgba(248,113,113,.45)'];
const WARN = ['rgba(251,191,36,.12)', 'var(--warn-fg)', 'rgba(251,191,36,.4)'];
const TOAST = { success: ['#4ade80', 'rgba(74,222,128,.35)'], info: ['var(--accent-strong)', 'rgba(var(--accent-rgb),.35)'], warning: ['#fbbf24', 'rgba(251,191,36,.4)'], error: ['#f87171', 'rgba(248,113,113,.45)'] };
const G = (a, b) => 'linear-gradient(150deg,' + a + ',' + b + ')';
const GRADS = [G('#22d3ee', '#4f46e5'), G('#2dd4bf', '#0f766e'), G('#a78bfa', '#6d28d9'), G('#94a3b8', '#334155'), G('#fbbf24', '#b45309'), G('#60a5fa', '#1e3a8a'), G('#34d399', '#065f46'), G('#f472b6', '#9d174d'), G('#fb923c', '#9a3412'), G('#f87171', '#7f1d1d'), G('#a3e635', '#3f6212')];
const GPAL = [['#22d3ee', '#4338ca'], ['#f472b6', '#7e22ce'], ['#fbbf24', '#c2410c'], ['#34d399', '#0f766e'], ['#60a5fa', '#1e3a8a'], ['#f87171', '#7f1d1d']];
const GAMECOL = ['#f59e0b', '#ef4444', '#f97316', '#b45309', '#a855f7', '#eab308', '#3b82f6', '#22c55e', '#dc2626', '#84cc16', '#0ea5e9', '#06b6d4', '#fb923c'];
const hash = s => { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
const hexA = (h, a) => { const n = parseInt(h.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; };
const fmt = n => Number(n).toLocaleString('en-US');
const abbr = n => String(n).replace(/[^A-Za-z0-9 ]/g, '').split(/\s+/).filter(Boolean).slice(0, 3).map(w => /^\d+$/.test(w) ? w.slice(-2) : w[0]).join('').toUpperCase() || '?';
const initials = name => {
  const parts = name.replace(/([a-z])([A-Z])/g, '$1 $2').split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0] || name || '?').slice(0, 2).toUpperCase();
};
const SHORT = { 'Counter-Strike 2': 'CS2', "Baldur's Gate 3": 'BG3', 'Deep Rock Galactic': 'DRG', 'Rocket League': 'RL', 'Apex Legends': 'Apex', 'Assetto Corsa Competizione': 'ACC', 'Assetto Corsa': 'AC', 'Automobilista 2': 'AMS2', 'Le Mans Ultimate': 'LMU', 'DiRT Rally 2.0': 'DR2', 'Ready or Not': 'RoN', 'Phasmophobia': 'Phasmo', 'Lethal Company': 'Lethal', 'Dead by Daylight': 'DBD' };
const shortName = n => SHORT[n] || (n.length <= 12 ? n : abbr(n));
const iniOf = g => { const a = abbr(g.name); return a.length > 1 ? a.slice(0, 3) : g.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase(); };
const rankCol = i => i < 7 ? '#94a3b8' : i < 11 ? '#fbbf24' : i < 15 ? '#60a5fa' : i < 18 ? '#a78bfa' : '#f472b6';
const tier = r => r == null ? '#8e8e99' : r < 5000 ? '#b0c3d9' : r < 10000 ? '#8cc6ff' : r < 15000 ? '#6a7dff' : r < 20000 ? '#c166ff' : r < 25000 ? '#f03cff' : r < 30000 ? '#eb4b4b' : '#fed700';
const ST = { ingame: '#4ade80', online: '#38bdf8', away: '#fbbf24', offline: 'var(--text-subtle)', unknown: 'var(--text-subtle)' };
const stText = p => !p ? 'Status unknown' : p.st === 'ingame' ? 'In-Game: ' + p.game : p.st === 'online' ? 'Online' : p.st === 'away' ? 'Away' : 'Offline';
const stKey = p => p ? p.st : 'unknown';

function rel(ms) {
  if (!ms) return 'never';
  const s = (Date.now() - ms) / 1000;
  if (s < 60) return 'just now';
  const m = s / 60; if (m < 60) return Math.floor(m) + ' min ago';
  const h = m / 60; if (h < 24) return Math.floor(h) + ' h ago';
  const d = h / 24; if (d < 2) return 'yesterday';
  if (d < 7) return Math.floor(d) + ' days ago';
  if (d < 30) { const w = Math.floor(d / 7); return w === 1 ? '1 week ago' : w + ' weeks ago'; }
  const mo = Math.floor(d / 30); if (mo < 12) return mo === 1 ? '1 month ago' : mo + ' months ago';
  const y = Math.floor(d / 365); return y <= 1 ? '1 year ago' : y + ' years ago';
}
function left(until) {
  const s = Math.max(0, Math.round((until - Date.now()) / 1000));
  const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
  return d ? `${d} d ${h} h` : h ? `${h} h ${m} m` : `${m} m`;
}

// ---------- theme (from the design) ----------

const TAGDEF = { fps: ['34,211,238', '#67e8f9', '#0e7490'], racing: ['245,158,11', '#fcd34d', '#b45309'], horror: ['239,68,68', '#fca5a5', '#b91c1c'] };
const CUSTDEF = [['20,184,166', '#5eead4', '#0f766e'], ['139,92,246', '#c4b5fd', '#6d28d9'], ['59,130,246', '#93c5fd', '#1d4ed8'], ['236,72,153', '#f9a8d4', '#be185d'], ['132,204,22', '#bef264', '#4d7c0f']];
let LIGHT = false;
const tagDef = t => TAGDEF[t] || CUSTDEF[[...t].reduce((s, ch) => s + ch.charCodeAt(0), 0) % 5];
const tc = t => { const d = tagDef(t); return ['rgba(' + d[0] + (LIGHT ? ',.12)' : ',.14)'), LIGHT ? d[2] : d[1], 'rgba(' + d[0] + ',.5)']; };
const BASES = {
  dark: { label: 'Dark', light: false, background: '#0a0a0c', surface: '#0f0f13', 'surface-raised': '#141419', border: 'rgba(255,255,255,.1)', 'border-strong': 'rgba(255,255,255,.22)', text: '#f4f4f5', 'text-soft': '#d4d4d8', 'text-muted': '#b1b1bb', 'text-subtle': '#9b9ba7', 'fg-rgb': '255,255,255', overlay: 'rgba(4,4,7,.74)', 'ok-fg': '#86efac', 'bad-fg': '#fca5a5', 'warn-fg': '#fcd34d', 'art-fade': '#0f0f13', 'btn-bg': '#ffffff', 'btn-fg': '#0a0a0c', 'btn-sub': '#52525b', 'btn-dis': 'rgba(255,255,255,.25)', 'shadow-c': 'rgba(0,0,0,.6)' },
  oled: { label: 'OLED Black', light: false, background: '#000000', surface: '#08080a', 'surface-raised': '#111114', border: 'rgba(255,255,255,.09)', 'border-strong': 'rgba(255,255,255,.2)', text: '#f4f4f5', 'text-soft': '#d4d4d8', 'text-muted': '#b1b1bb', 'text-subtle': '#9b9ba7', 'fg-rgb': '255,255,255', overlay: 'rgba(0,0,0,.8)', 'ok-fg': '#86efac', 'bad-fg': '#fca5a5', 'warn-fg': '#fcd34d', 'art-fade': '#08080a', 'btn-bg': '#ffffff', 'btn-fg': '#000000', 'btn-sub': '#52525b', 'btn-dis': 'rgba(255,255,255,.25)', 'shadow-c': 'rgba(0,0,0,.8)' },
  light: { label: 'Light', light: true, background: '#f3f3f6', surface: '#ffffff', 'surface-raised': '#ffffff', border: 'rgba(0,0,0,.09)', 'border-strong': 'rgba(0,0,0,.2)', text: '#18181b', 'text-soft': '#3f3f46', 'text-muted': '#45454e', 'text-subtle': '#5c5c67', 'fg-rgb': '0,0,0', overlay: 'rgba(232,232,238,.72)', 'ok-fg': '#15803d', 'bad-fg': '#b91c1c', 'warn-fg': '#a16207', 'art-fade': '#1b1b22', 'btn-bg': '#18181b', 'btn-fg': '#ffffff', 'btn-sub': '#a1a1aa', 'btn-dis': 'rgba(0,0,0,.2)', 'shadow-c': 'rgba(24,24,40,.16)' },
};
const ACCENTS = [['cyan', 'Cyan', '#22d3ee'], ['violet', 'Violet', '#a78bfa'], ['amber', 'Amber', '#f59e0b'], ['red', 'Red', '#f43f5e'], ['green', 'Green', '#22c55e'], ['pink', 'Pink', '#ec4899']];
const WIN_ACCENT = '#4cc2ff';
const hx = s => { s = s.replace('#', ''); if (s.length === 3) s = s.split('').map(c => c + c).join(''); const n = parseInt(s, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const toHex = a => '#' + a.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const mixc = (a, b, t) => { const A = hx(a), B = hx(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
const toHsl = s => { const [r, g, b] = hx(s).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b); let H = 0, S = 0; const L = (mx + mn) / 2; if (mx !== mn) { const d = mx - mn; S = L > .5 ? d / (2 - mx - mn) : d / (mx + mn); H = (mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60; } return [H, S, L]; };
const fromHsl = (H, S, L) => { H = ((H % 360) + 360) % 360; const C = (1 - Math.abs(2 * L - 1)) * S, X = C * (1 - Math.abs((H / 60) % 2 - 1)), m = L - C / 2; const [r, g, b] = H < 60 ? [C, X, 0] : H < 120 ? [X, C, 0] : H < 180 ? [0, C, X] : H < 240 ? [0, X, C] : H < 300 ? [X, 0, C] : [C, 0, X]; return toHex([(r + m) * 255, (g + m) * 255, (b + m) * 255]); };
const lum = s => { const [r, g, b] = hx(s).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * r + .7152 * g + .0722 * b; };
function themeTokens(baseKey, acc, still) {
  const B = BASES[baseKey] || BASES.dark, [H, S, L] = toHsl(acc), out = {};
  const a2 = fromHsl(H >= 60 && H < 300 ? H + 45 : H - 30, Math.min(1, S * .9), Math.max(.5, Math.min(.66, L)));
  for (const k in B) if (k !== 'label' && k !== 'light') out[k] = B[k];
  Object.assign(out, {
    accent: acc, 'accent-rgb': hx(acc).join(','), 'accent-2': a2, 'accent2-rgb': hx(a2).join(','),
    'accent-strong': B.light ? mixc(acc, '#000000', .4) : mixc(acc, '#ffffff', .38), 'accent-light': mixc(acc, '#ffffff', .5),
    'accent-soft': 'rgba(' + hx(acc).join(',') + (B.light ? ',.14)' : ',.12)'), 'accent-contrast': lum(acc) > .4 ? '#0a0a0c' : '#ffffff',
    'accent-chip': 'rgba(' + hx(mixc(acc, '#050507', .8)).join(',') + ',.82)', 'btn-hover': B.light ? mixc(acc, '#000000', .35) : mixc(acc, '#ffffff', .55),
    'm-spin-slow': still ? 'none' : 'bspin 3.4s linear infinite', 'm-spin': still ? 'none' : 'bspin 1.6s linear infinite', 'm-pop': still ? 'none' : 'dfade .25s cubic-bezier(.22,1,.36,1)',
  });
  return out;
}

// An account badge: the Steam avatar when there is one, else the generated gradient (with initials on top).
const avBg = a => a.avatar ? 'url("' + a.avatar + '") center/cover no-repeat,#111' : a.grad;

// Smooth sideways scrolling for the tag rows: each wheel notch moves a target, and the row eases towards it.
function chipScroll(el, dy) {
  const max = el.scrollWidth - el.clientWidth;
  if (!el._anim) el._to = el.scrollLeft;
  el._to = Math.max(0, Math.min(max, el._to + dy));
  if (el._anim) return;
  const step = () => {
    const d = el._to - el.scrollLeft;
    if (Math.abs(d) < 0.6) { el.scrollLeft = el._to; el._anim = 0; return; }
    el.scrollLeft += d * 0.22;
    el._anim = requestAnimationFrame(step);
  };
  el._anim = requestAnimationFrame(step);
}

// Tag rows fade at an edge only while there is more to scroll that way, so the first and last tags are fully visible at the ends.
function chipFade(el) {
  const l = el.scrollLeft > 2, r = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
  el.style.webkitMaskImage = !l && !r ? 'none' : 'linear-gradient(90deg,' + (l ? 'transparent,#000 24px' : '#000,#000') + ',' + (r ? '#000 calc(100% - 24px),transparent' : '#000') + ')';
}

const SCALE_OPTS = ['auto', 80, 90, 100, 110, 125, 150];
const resSpec = p => p.w + '×' + p.h + (p.hz ? ' · ' + p.hz + ' Hz' : '') + (p.stretch ? ' · stretched' : '');

// ---------- app ----------

class App extends Component {
  state = {
    loaded: false, locked: false, vault: null, version: '',
    steam: { found: true, running: false, activeSid: null, autoLoginUser: '', busy: null, exe: null },
    accounts: [], games: [], settings: {}, lib: [], monitors: [], monPos: {}, resProfiles: [], winAccent: null, update: null, zoom: 1,
    view: 'acc', q: '', tagF: null, sort: 'pinned', sel: null, hover: null, kbd: false,
    drawerId: null, tab: 'overview', gSort: 'hours', dAdv: false, dLaunchMenu: false, tagDraft: '',
    fetching: {}, sw: null, toasts: [], confirmId: null, unlinkId: null, setOpen: false, setSec: 'general', addOpen: false, retrying: false,
    link: null, defMenu: false, unlockPw: '', unlockErr: false,
    mp: { form: null, a: '', b: '', old: '', auto: false, mismatch: false, err: null },
    lq: '', lf: 'all', ls: 'recent', hovG: null, gd: null, acctMenu: false, ag: null, launch: null, rmId: null, logoFail: {},
    disp: { testing: false, applying: false, err: null }, rp: null, rpTesting: null, libLoading: false,
    audioDevs: [], playLog: {}, lsel: null,
  };
  _t = []; _tid = 0;

  later(ms, fn) { const id = setTimeout(fn, ms); this._t.push(id); return id; }

  async componentDidMount() {
    this._key = e => this.onKey(e);
    window.addEventListener('keydown', this._key);
    this._rs = () => this._chips.forEach(chipFade);
    window.addEventListener('resize', this._rs);
    this._off = [
      api.on('steam', steam => this.setState({ steam })),
      api.on('accounts', accounts => { this.setState({ accounts }); this.reloadLib(); }),
      api.on('account', a => a && this.replaceAcc(a)),
      api.on('switch', p => this.setState(s => ({ sw: s.sw && s.sw.sid === p.sid ? { ...s.sw, steps: p.steps, step: p.step } : s.sw }))),
      api.on('stats', p => this.setState(s => { const f = { ...s.fetching }; if (p.step == null) delete f[p.sid]; else f[p.sid] = p.step; return { fetching: f }; })),
      api.on('link', e => this.onLinkEvent(e)),
      api.on('update', u => {
        this.setState({ update: u });
        if (!u.announce) return;
        if (u.state === 'ready') this.toast('success', 'Update ready: v' + u.version, 'Restart SwapDeck to install it now, or it installs when you quit.', { label: 'Restart now', fn: () => api.installUpdate() });
        else if (u.state === 'none') this.toast('info', "You're up to date", 'SwapDeck v' + u.current + ' is the latest version.');
        else if (u.state === 'error') this.toast('warning', 'Update check failed', u.error);
      }),
      api.on('zoom', z => {
        this.setState(s => ({ zoom: z.factor, settings: { ...s.settings, uiScale: z.pref } }));
        if (z.announce) {
          if (this._zoomToast) this.dismiss(this._zoomToast);
          this.toast('info', 'UI scale ' + (z.pref === 'auto' ? 'auto (' + Math.round(z.factor * 100) + '%)' : Math.round(z.factor * 100) + '%'), 'Ctrl + / Ctrl − to change, Ctrl 0 for auto.');
          this._zoomToast = this._tid;
        }
      }),
      api.on('launch', L => this.setState(s => ({ launch: { ...L, hidden: s.launch && s.launch.gid === L.gid ? s.launch.hidden : false } }))),
      api.on('launch-end', e => this.onLaunchEnd(e)),
      api.on('notice', n => this.toast(n.type || 'info', n.title, n.msg)),
      api.on('display-changed', d => this.toast('info', 'Switched display' + (d.mode ? ' to ' + d.label : ''), [d.mode === 'only' ? 'Other monitors are off while you play.' : d.mode ? d.label + ' is primary while you play.' : null, d.res ? d.res + ' on ' + d.label + '.' : null].filter(Boolean).join(' '))),
    ];
    this._clock = setInterval(() => this.setState({}), 30000);
    this._pad = setInterval(() => this.pollPad(), 50);
    const st = await this.reload();
    // Start on the screen picked in Settings → General.
    this.setState({ loaded: true, view: st && st.settings && st.settings.startView === 'lib' ? 'lib' : 'acc' });
  }
  componentWillUnmount() {
    window.removeEventListener('keydown', this._key);
    window.removeEventListener('resize', this._rs);
    this._off.forEach(f => f());
    this._t.forEach(clearTimeout);
    clearInterval(this._clock);
    clearInterval(this._pad);
  }

  async reload() {
    const st = await api.state();
    if (st.locked) { this.setState({ locked: true, vault: st.vault, version: st.version, zoom: st.zoom }); return st; }
    this.setState({
      locked: false, steam: st.steam, accounts: st.accounts, games: st.games, settings: st.settings, version: st.version, zoom: st.zoom,
      update: st.update, vault: st.vault, lib: st.lib || [], monitors: st.monitors || [], monPos: st.monPos || {}, resProfiles: st.resProfiles || [],
      winAccent: st.winAccent, launch: st.session ? { ...st.session, hidden: true } : null, playLog: st.playLog || {},
    });
    return st;
  }
  async reloadLib() { const lib = await api.libList(); if (lib) this.setState({ lib }); }
  async reloadMonitors() { const monitors = await api.displays(); if (monitors && monitors.length) this.setState({ monitors }); }

  // ---------- theme ----------
  accentHex() {
    const c = this.state.settings, L = this.state.launch;
    if (c.followTag && L && L.running) { const g = this.gfind(L.gid); if (g && g.tags[0]) return toHex(tagDef(g.tags[0])[0].split(',').map(Number)); }
    if (c.accent === 'windows') return this.state.winAccent || WIN_ACCENT;
    if (c.accent === 'custom') return c.customAccent || '#c084fc';
    return (ACCENTS.find(a => a[0] === c.accent) || ACCENTS[0])[2];
  }
  applyTheme() {
    const r = this._root; if (!r) return;
    const t = themeTokens(this.state.settings.base || 'dark', this.accentHex(), !!this.state.settings.reduceMotion), k = JSON.stringify(t);
    if (k === this._tk) return;
    this._tk = k;
    for (const n in t) r.style.setProperty('--' + n, t[n]);
    document.documentElement.style.background = t.background;
    document.body.style.background = t.background;
  }
  rootRef = el => { this._root = el; if (el) this.applyTheme(); };
  componentDidUpdate() {
    this.applyTheme();
    for (const el of this._chips) { if (el.isConnected) chipFade(el); else this._chips.delete(el); }
  }
  colorRef = el => { this._color = el; };
  chipRef = el => { if (el) { this._chips.add(el); requestAnimationFrame(() => chipFade(el)); } };
  _chips = new Set();

  // ---------- accounts ----------
  get steamState() { const s = this.state.steam; return !s.found ? 'not-found' : s.running ? 'running' : 'closed'; }
  decorate(a) {
    const s = this.state.steam;
    const current = s.running ? a.sid === s.activeSid : !!(s.autoLoginUser && a.login.toLowerCase() === s.autoLoginUser.toLowerCase());
    return { ...a, id: a.sid, ini: initials(a.name), grad: GRADS[hash(a.sid) % GRADS.length], current, last: rel(a.lastUsed), ts: a.lastUsed ? -a.lastUsed : Infinity, tags: a.tags || [], note: a.note || '' };
  }
  get accts() {
    if (this._accSrc !== this.state.accounts || this._accSt !== this.state.steam) { this._accSrc = this.state.accounts; this._accSt = this.state.steam; this._accts = this.state.accounts.map(a => this.decorate(a)); }
    return this._accts;
  }
  find(id) { return this.accts.find(x => x.id === id); }
  gameName(appid) { const g = this.state.lib.find(x => x.steam && String(x.appid) === String(appid)) || this.state.games.find(x => String(x.appid) === String(appid)); return g ? g.name : null; }
  defGameName() { const s = this.state.settings; return s.launchAfter && s.defaultGame ? (this.gameName(s.defaultGame) || 'App ' + s.defaultGame) : null; }
  launchOf(a) {
    if (a.launch === 'none') return null;
    if (!a.launch || a.launch === 'default') return this.defGameName();
    return this.gameName(a.launch) || 'App ' + a.launch;
  }
  visible() {
    const S = this.state, q = S.q.trim().toLowerCase();
    const v = this.accts.filter(a => (a.name + ' ' + a.login).toLowerCase().includes(q) && (!S.tagF || a.tags.includes(S.tagF)));
    const byT = (x, y) => x.ts - y.ts, byN = (x, y) => x.name.localeCompare(y.name, undefined, { sensitivity: 'base' });
    return v.sort(S.sort === 'name' ? byN : S.sort === 'recent' ? byT : (x, y) => (+y.pinned - +x.pinned) || byT(x, y));
  }
  selId() { const v = this.visible(); if (v.some(a => a.id === this.state.sel)) return this.state.sel; const c = v.find(a => a.current); return c ? c.id : (v[0] && v[0].id); }

  galRef = el => { this._gal = el; };
  libGridRef = el => { this._lgrid = el; };
  // Classic gallery: the mouse wheel scrolls the row sideways, smoothly.
  galWheel = e => { const el = e.currentTarget; if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.preventDefault(); chipScroll(el, e.deltaY * 1.6); } };
  get gallery() { return this.state.settings.accountStyle === 'gallery'; }
  libCols() { const g = this._lgrid; if (!g) return 1; const els = [...g.querySelectorAll('[data-gid]')]; if (!els.length) return 1; const t = els[0].offsetTop; return Math.max(1, els.filter(e => e.offsetTop === t).length); }
  libStep(d) {
    const v = this._libVis || []; if (!v.length) return;
    const i = v.findIndex(g => g.id === this.state.lsel);
    const id = v[i < 0 ? 0 : Math.max(0, Math.min(v.length - 1, i + d))].id;
    this.setState({ lsel: id, kbd: true, hovG: null });
    this.later(30, () => { const el = this._lgrid && this._lgrid.querySelector('[data-gid="' + id + '"]'); if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
  }

  // Controller: d-pad / left stick move, A opens or confirms, B goes back, X opens details, LB/RB switch Accounts and Library.
  pollPad() {
    const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
    const p = pads[0]; if (!p || !document.hasFocus()) { this._padPrev = null; return; }
    const ax = p.axes[0] || 0, ay = p.axes[1] || 0, btn = i => !!(p.buttons[i] && p.buttons[i].pressed);
    const now = { up: btn(12) || ay < -.6, down: btn(13) || ay > .6, left: btn(14) || ax < -.6, right: btn(15) || ax > .6, a: btn(0), b: btn(1), x: btn(2), lb: btn(4), rb: btn(5) };
    const prev = this._padPrev || {}, t = Date.now();
    this._padPrev = now;
    for (const k of Object.keys(now)) {
      if (!now[k]) continue;
      const first = !prev[k], dir = ['up', 'down', 'left', 'right'].includes(k);
      // Directions repeat while held (after a short pause); buttons fire once per press.
      if (first) this._padRep = t + 380; else if (!(dir && t >= this._padRep)) continue; else this._padRep = t + 110;
      this.padPress(k);
    }
  }
  padPress(k) {
    const S = this.state;
    if (S.locked) return;
    const key = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }[k];
    if (k === 'b') return this.onKey({ key: 'Escape', target: document.body });
    if (S.gd) { if (k === 'a') this.play(S.gd); return; }
    if (S.setOpen || S.link || S.confirmId || S.unlinkId || S.ag || S.rmId || S.sw) return;
    if (S.launch && !S.launch.hidden) return;
    if (k === 'lb' || k === 'rb') return this.setView(S.view === 'lib' ? 'acc' : 'lib');
    if (S.view === 'lib') {
      if (key) return this.libStep({ ArrowRight: 1, ArrowLeft: -1, ArrowDown: this.libCols(), ArrowUp: -this.libCols() }[key]);
      const id = S.lsel || (this._libVis && this._libVis[0] && this._libVis[0].id);
      if (id && (k === 'a' || k === 'x')) this.openGame(id);
      return;
    }
    if (S.drawerId) return;
    if (key) return this.onKey({ key, target: document.body, preventDefault() {} });
    const id = this.selId();
    if (id && k === 'a') this.switchTo(id);
    if (id && k === 'x') this.openDetails(id);
  }
  searchRef = el => { this._search = el; };
  libSearchRef = el => { this._lsearch = el; };
  settingsRef = el => { this._set = el; };
  imgRef = () => {};
  cols() { const g = this._gal; if (!g || this.gallery) return 1; const els = [...g.querySelectorAll('[data-pid]')]; if (!els.length) return 1; const t = els[0].offsetTop; return Math.max(1, els.filter(e => e.offsetTop === t).length); }
  scrollToSel(id) {
    const g = this._gal; if (!g || !id) return;
    const el = g.querySelector('[data-pid="' + id + '"]'); if (!el) return;
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  select(id, scroll) { this.setState({ sel: id, hover: null }); if (scroll) this.later(40, () => this.scrollToSel(id)); }
  step(d) { const v = this.visible(); if (!v.length) return; const i = v.findIndex(a => a.id === this.selId()); this.select(v[Math.max(0, Math.min(v.length - 1, i + d))].id, true); }

  toast(type, title, msg, action) {
    const id = ++this._tid;
    this.setState(s => ({ toasts: [...s.toasts, { id, type, title, msg, action }].slice(-4) }));
    this.later(type === 'error' ? 8000 : 4800, () => this.dismiss(id));
  }
  dismiss(id) { this.setState(s => ({ toasts: s.toasts.filter(t => t.id !== id) })); }

  replaceAcc(a) {
    if (this._noteDraft && this._noteDraft.sid === a.sid) a = { ...a, note: this._noteDraft.v };
    this.setState(s => ({ accounts: s.accounts.some(x => x.sid === a.sid) ? s.accounts.map(x => x.sid === a.sid ? a : x) : [...s.accounts, a] }));
  }
  editNote(sid, v) {
    this._noteDraft = { sid, v };
    this.setState(s => ({ accounts: s.accounts.map(x => x.sid === sid ? { ...x, note: v } : x) }));
    clearTimeout(this._noteT);
    this._noteT = setTimeout(async () => { await api.setMeta(sid, { note: v }); if (this._noteDraft && this._noteDraft.v === v) this._noteDraft = null; }, 400);
  }
  async mut(id, patch) {
    const a = this.state.accounts.find(x => x.sid === id); if (!a) return;
    const p = typeof patch === 'function' ? patch(a) : patch;
    this.setState(s => ({ accounts: s.accounts.map(x => x.sid === id ? { ...x, ...p } : x) }));
    const res = await api.setMeta(id, p);
    if (res) this.replaceAcc(res);
    if ('tags' in p) this.reloadLib();
  }
  async setCfg(patch) {
    this.setState(s => ({ settings: { ...s.settings, ...patch } }));
    const settings = await api.setSettings(patch);
    if (settings) this.setState({ settings });
  }

  openSettings(sec) {
    this.setState({ setOpen: true, setSec: sec || this.state.setSec || 'general', defMenu: false });
    if (sec === 'displays') this.reloadMonitors();
    this.later(0, () => { if (this._set) this._set.scrollTop = 0; });
  }

  onKey(e) {
    const S = this.state, tag = (e.target && e.target.tagName || '').toLowerCase(), typing = tag === 'input' || tag === 'textarea' || tag === 'select';
    if (S.locked) return;
    if (e.key === 'Escape') {
      if (S.defMenu) return this.setState({ defMenu: false });
      if (S.rmId) return this.setState({ rmId: null });
      if (S.ag) return this.setState({ ag: null });
      if (S.acctMenu) return this.setState({ acctMenu: false });
      if (S.gd) return this.setState({ gd: null });
      if (S.launch && !S.launch.hidden) return this.setState(s => ({ launch: { ...s.launch, hidden: true } }));
      if (S.link && S.link.step !== 'working') return this.closeLink();
      if (S.confirmId) return this.setState({ confirmId: null });
      if (S.unlinkId) return this.setState({ unlinkId: null });
      if (S.dLaunchMenu) return this.setState({ dLaunchMenu: false });
      if (S.rp) return this.setState({ rp: null });
      if (S.setOpen) return this.setState({ setOpen: false });
      if (S.addOpen) return this.cancelAdd();
      if (S.drawerId) return this.setState({ drawerId: null });
      if (typing) e.target.blur();
      return;
    }
    if (S.view === 'lib') {
      if (typing || S.gd || S.ag || S.setOpen || S.rmId) return;
      if (e.key === '/' && this._lsearch) { e.preventDefault(); this._lsearch.focus(); return; }
      const mv = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: this.libCols(), ArrowUp: -this.libCols() }[e.key];
      if (mv) { e.preventDefault(); this.libStep(mv); }
      else if (e.key === 'Enter' && S.lsel) this.openGame(S.lsel);
      return;
    }
    if (typing || S.sw || S.confirmId || S.unlinkId || S.setOpen || S.addOpen || S.link) return;
    if (e.key === '/') { e.preventDefault(); if (this._search) this._search.focus(); return; }
    if (S.drawerId) return;
    const mv = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: this.cols(), ArrowUp: -this.cols() }[e.key];
    if (mv) { e.preventDefault(); this.setState({ kbd: true, hover: null }); this.step(mv); }
    else if (e.key === 'Enter') { const id = this.selId(); if (id) this.switchTo(id); }
  }

  // ---------- steam actions ----------
  busyToast(r) {
    if (r.code === 'NOT_FOUND') { this.toast('error', 'Steam not found', 'Set the Steam location in Settings first.', { label: 'Open settings', fn: () => this.openSettings('steam') }); return true; }
    if (r.code === 'BUSY') { this.toast('warning', 'Steam is busy', 'Wait for the current Steam action to finish, then try again.'); return true; }
    return false;
  }
  async switchTo(id) {
    const a = this.find(id), steam = this.steamState;
    if (!a || this.state.sw) return;
    if (a.current && steam === 'running') return;
    if (steam === 'not-found') { this.busyToast({ code: 'NOT_FOUND' }); return; }
    if (this.state.steam.busy) { this.busyToast({ code: 'BUSY' }); return; }
    const game = this.launchOf(a);
    this.setState({ sw: { sid: id, name: a.name, ini: a.ini, grad: a.grad, avatar: a.avatar, steps: ['Preparing…'], step: 0, game }, drawerId: null, hover: null });
    const r = await api.switchTo(id);
    this.setState({ sw: null });
    if (!r.ok) {
      if (this.busyToast(r)) return;
      if (r.code === 'CLOSE_TIMEOUT') this.toast('error', "Steam didn't close", 'Timed out. Close Steam from the tray, then retry.', { label: 'Retry', fn: () => this.switchTo(id) });
      else this.toast('error', 'Switch failed', r.error || 'Something went wrong.', { label: 'Retry', fn: () => this.switchTo(id) });
      return;
    }
    await this.reload();
    this.setState({ sel: id });
    if (r.warn) this.toast('warning', 'Almost there', r.warn);
    else this.toast('success', 'Switched to ' + a.name, r.game ? 'Signed in. ' + r.game + ' is starting.' : 'Signed in to Steam.');
    if (r.chooserOff) this.toast('info', 'Steam account picker turned off', 'Steam\'s "Ask which account to use each time Steam starts" was on and blocks switching, so SwapDeck turned it off.');
    if (r.closing) this.later(400, () => this.toast('info', 'Closing SwapDeck', '"Close app after switching" is on.'));
  }
  async closeSteam() {
    const r = await api.closeSteam();
    if (!r.ok) { if (!this.busyToast(r)) this.toast('error', "Steam didn't close", r.error); return; }
    this.toast('info', 'Steam closed', 'Pick an account to sign in, or start Steam as usual.');
  }
  async startSteam() {
    const r = await api.startSteam();
    if (!r.ok) { if (!this.busyToast(r)) this.toast('error', "Steam didn't start", r.error); return; }
    const cur = this.accts.find(a => a.current);
    this.toast('success', 'Steam started', cur ? 'Signed in as ' + cur.name + '.' : 'Steam is running.');
  }
  async addAcc() {
    if (this.steamState === 'not-found') { this.toast('error', 'Steam not found', "Adding an account needs Steam's login window.", { label: 'Open settings', fn: () => this.openSettings('steam') }); return; }
    if (this.state.addOpen) return;
    this.setState({ addOpen: true, drawerId: null });
    const r = await api.addAccount();
    this.setState({ addOpen: false });
    if (!r.ok) { if (!this.busyToast(r)) this.toast('error', "Couldn't add account", r.error); return; }
    if (r.cancelled) return;
    if (r.timeout) { this.toast('warning', 'Stopped waiting', 'No sign-in after 10 minutes. Try again when you are ready.'); return; }
    await this.reload();
    this.setState({ q: '', tagF: null, sel: r.sid });
    this.toast('success', r.existing ? 'Already saved' : 'Account added', r.existing ? `Signed in as ${r.name}.` : `${r.name} is saved and signed in.`);
    this.later(80, () => this.scrollToSel(r.sid));
  }
  cancelAdd() { api.cancelAdd(); this.setState({ addOpen: false }); }
  openDetails(id) {
    const a = this.find(id);
    this.setState({ drawerId: id, tab: 'overview', tagDraft: '', dAdv: false, dLaunchMenu: false });
    if (a && (!a.pubAt || (a.linked && !a.statsAt))) this.fetchStats(id);
  }
  async fetchStats(id) {
    if (this.state.fetching[id] !== undefined) return;
    this.setState(s => ({ fetching: { ...s.fetching, [id]: 0 } }));
    const r = await api.refreshStats(id);
    if (!r.ok) { this.setState(s => { const f = { ...s.fetching }; delete f[id]; return { fetching: f }; }); return; }
    if (r.account) this.replaceAcc(r.account);
    const b = r.account;
    for (const w of r.warnings) this.toast(w.type, w.title, w.msg);
    if (!r.warnings.some(w => w.type === 'error')) this.toast('success', 'Stats updated', (b ? b.name : '') + (b && b.linked ? ' · profile, account, games and CS2' : ' · public profile'));
    if (b && b.pub && b.pub.priv) this.toast('warning', 'Profile is private', 'Online status and bans may be out of date.' + (b.linked ? '' : ' Connect for stats to see everything.'));
  }
  async forget() {
    const id = this.state.confirmId, a = this.find(id);
    this.setState({ confirmId: null, drawerId: null, sel: null });
    const r = await api.forget(id);
    if (!r.ok) { if (!this.busyToast(r)) this.toast('error', "Couldn't forget account", r.error); return; }
    await this.reload();
    this.toast('info', 'Forgot ' + (a ? a.name : 'account'), "Removed from Steam's saved logins on this PC." + (r.restarted ? ' Steam restarted.' : ''));
  }
  async forgetPassword(id) {
    const a = this.find(id);
    const res = await api.clearCredentials(id);
    if (res) this.replaceAcc(res);
    this.toast('info', 'Password forgotten', (a ? a.name : 'This account') + "'s saved password was removed. The sign-in token stays.");
  }
  async unlink() {
    const id = this.state.unlinkId, a = this.find(id);
    this.setState({ unlinkId: null, tab: 'overview' });
    const res = await api.unlink(id);
    if (res) this.replaceAcc(res);
    this.toast('info', 'Disconnected ' + (a ? a.name : ''), 'Stats removed. Switching and the public profile still work.');
  }
  async browse() {
    const wasNF = this.steamState === 'not-found';
    const r = await api.browseSteam();
    if (!r.ok) { if (r.error) this.toast('error', 'Not Steam', r.error); return; }
    await this.reload();
    this.toast('success', wasNF ? 'Steam found' : 'Steam location updated', 'Using ' + r.path);
  }
  async retry() {
    this.setState({ retrying: true });
    const st = await this.reload();
    this.setState({ retrying: false });
    if (!st.steam || !st.steam.found) this.toast('error', 'Still no Steam', 'Checked the registry and default install folders.', { label: 'Browse…', fn: () => this.browse() });
    else this.toast('success', 'Steam found', 'Using ' + st.steam.exe);
  }

  // ---------- connect for stats ----------
  openLink(id) { const a = this.find(id); this.setState({ link: { id, step: 'choose', login: a ? a.login : '', pw: '', code: '', guard: 'mobile', qr: null, remember: false, tok: '' } }); }
  setLink(p) { this.setState(s => ({ link: s.link && { ...s.link, ...p } })); }
  closeLink() { api.linkCancel(); this.setState({ link: null }); }
  toChoose() { api.linkCancel(); this.setLink({ step: 'choose', code: '', pw: '', tok: '', qr: null, gErr: null }); }
  onLinkEvent(e) {
    const L = this.state.link; if (!L) return;
    if (e.step === 'guard') this.setLink({ step: 'guard', guard: e.guard || L.guard, detail: e.detail ?? L.detail, canConfirm: e.canConfirm ?? L.canConfirm, gErr: e.error || null, code: e.keep ? '' : L.code });
    else if (e.step === 'confirm') this.setLink({ ...e, step: 'approve' });
    else this.setLink({ ...e });
    if (e.step === 'ok') this.later(50, () => this.fetchStats(L.id));
  }
  linkQR() { const L = this.state.link; this.setLink({ step: 'qr', qr: null }); api.linkQR(L.id); }
  linkPW() {
    const L = this.state.link; if (!L || !L.login || !L.pw) return;
    this.setLink({ step: 'working', work: 'Signing in to Steam…', pw: '' });
    api.linkPassword(L.id, L.login, L.pw, !!L.remember);
  }
  linkTok() {
    const L = this.state.link; if (!L || (L.tok || '').length <= 20) return;
    this.setLink({ step: 'working', work: 'Checking the token…' });
    api.linkToken(L.id, L.tok.trim());
  }
  linkGuard() {
    const L = this.state.link; if (!L || L.code.length < 5) return;
    this.setLink({ step: 'working', work: 'Checking Steam Guard code…', gErr: null });
    api.linkCode(L.code);
  }

  // ---------- master password ----------
  setMp(p) { this.setState(s => ({ mp: { ...s.mp, err: null, ...p } })); }
  async mpSave() {
    const M = this.state.mp;
    const fail = err => this.setMp({ err });
    if (M.form !== 'remove') {
      if ((M.a || '').length < 4) return fail('Use at least 4 characters.');
      if (M.a !== M.b) return this.setMp({ mismatch: true });
    }
    let r;
    if (M.form === 'set') r = await api.vaultSet(M.a, !!M.auto);
    else if (M.form === 'change') r = await api.vaultChange(M.old || '', M.a);
    else r = await api.vaultRemove(M.old || '');
    if (!r.ok) return fail(r.error);
    this.setState({ vault: r.vault, mp: { form: null, a: '', b: '', old: '', auto: false, mismatch: false, err: null } });
    if (M.form === 'set') this.toast('success', 'Master password set', 'SwapDeck asks for it at launch' + (M.auto ? ', except on this PC.' : '.'));
    else if (M.form === 'change') this.toast('success', 'Master password changed', 'Use the new one next time SwapDeck is locked.');
    else this.toast('info', 'Master password removed', 'Sign-ins are still encrypted with Windows.');
  }
  async vaultAuto() {
    const on = !(this.state.vault && this.state.vault.autoUnlock);
    const v = await api.vaultAutoUnlock(on);
    this.setState({ vault: v });
    this.toast('info', on ? 'Auto-unlock on' : 'Auto-unlock off', on ? "SwapDeck won't ask for the master password on this PC." : 'SwapDeck will ask for the master password at launch.');
  }
  async unlock() {
    const pw = this.state.unlockPw; if (!pw) return;
    const r = await api.vaultUnlock(pw);
    if (!r.ok) { this.setState({ unlockErr: true, unlockPw: '' }); return; }
    this.setState({ unlockPw: '', unlockErr: false });
    await this.reload();
  }

  // ---------- library ----------
  gfind(id) { return this.state.lib.find(g => g.id === id); }
  gmut(id, p) { this.setState(s => ({ lib: s.lib.map(g => g.id === id ? { ...g, ...(typeof p === 'function' ? p(g) : p) } : g) })); }
  async gset(id, patch) {
    const g = await api.libSet(id, patch);
    if (g) this.setState(s => ({ lib: s.lib.map(x => x.id === id ? g : x) }));
  }
  setAcct(id, acct) {
    const a = acct ? this.find(acct) : null;
    this.gmut(id, { acct, tags: a ? a.tags : [] });
    this.setState({ acctMenu: false });
    this.gset(id, { acct });
  }
  setDisp(id, p) { this.gmut(id, g => ({ display: { ...g.display, ...p } })); this.gset(id, { display: p }); }
  setOpts(id, v) {
    this.gmut(id, { opts: v });
    clearTimeout(this._optT);
    this._optT = setTimeout(() => api.libSet(id, { opts: v }), 400);
  }
  coverOf(g) { return g.img || (g.steam ? g.cover : null); }
  gradOf(g) { const p = GPAL[hash(g.name || 'x') % GPAL.length]; return G(p[0], p[1]); }
  cardBg(g) { const c = this.coverOf(g); return c ? 'url("' + c + '") center/cover no-repeat,' + this.gradOf(g) : 'radial-gradient(120% 70% at 18% 8%,rgba(var(--fg-rgb),.24),transparent 58%),' + this.gradOf(g); }
  mons() { return this.state.monitors; }
  monOf(g) { return g.display.mon ? this.mons().find(m => m.id === g.display.mon) || null : null; }
  normMon() { const s = this.state.settings, m = this.mons(); return m.find(x => x.id === s.normalMon) || m.find(x => x.primary) || null; }
  resOf(g) { return g.display.res ? this.state.resProfiles.find(p => p.id === g.display.res) || null : null; }
  setView(v) {
    if (v === this.state.view) return;
    this.setState({ view: v, drawerId: null });
    if (v === 'lib') { this.reloadLib(); this.reloadMonitors(); }
  }
  openGame(id) {
    this.setState({ gd: id, acctMenu: false });
    this.reloadMonitors();
    api.audioDevices().then(audioDevs => audioDevs && this.setState({ audioDevs }));
  }

  async play(gid) {
    const g = this.gfind(gid), S = this.state; if (!g) return;
    if (S.launch) { this.toast('warning', 'A game is already running', 'Stop tracking it first, or quit it.'); return; }
    if (g.steam && this.steamState === 'not-found') { this.toast('error', 'Steam not found', 'Set the Steam location in Settings to launch Steam games.', { label: 'Open settings', fn: () => this.openSettings('steam') }); return; }
    this.setState({ gd: null, acctMenu: false, hovG: null });
    const r = await api.play(gid);
    if (r.install) { this.toast('info', 'Opening Steam to install', g.name + " isn't installed. Steam's install dialog is opening."); return; }
    if (!r.ok && !r.cancelled) {
      if (this.busyToast(r)) return;
      if (r.code !== 'RUNNING') this.toast('error', "Couldn't launch " + g.name, r.error || 'Something went wrong.');
      else this.toast('warning', 'A game is already running', r.error);
    }
  }
  stopGame() { api.stopGame(); }
  onLaunchEnd(e) {
    const g = this.gfind(e.gid), name = g ? g.name : 'Game', nm = this.normMon();
    this.setState({ launch: null });
    this.reloadLib();
    api.playLog().then(playLog => playLog && this.setState({ playLog }));
    if (e.reason === 'error') this.toast('error', "Couldn't launch " + name, e.error || 'Something went wrong.');
    if (e.restoreErr) this.toast('error', "Couldn't restore the display", e.restoreErr, { label: 'Try again', fn: () => this.restoreNow() });
    else if (e.restored) this.toast('success', 'Display restored', 'Your monitors are back the way they were' + (nm ? ', ' + nm.label + ' primary.' : '.'));
    else if (e.hadMon && !e.restoreOn) this.toast('warning', name + ' closed', '"Restore display" is off for this game, so the display stays as it is.', { label: 'Restore now', fn: () => this.restoreNow() });
    else if (e.reason === 'stopped') this.toast('info', 'Stopped tracking ' + name, 'The game keeps running. Playtime so far is saved.');
    else if (e.reason === 'exit') this.toast('info', name + ' closed', 'Playtime saved.');
    this.reloadMonitors();
  }
  async restoreNow() {
    const r = await api.restoreDisplay();
    if (!r.ok) { this.toast('error', "Couldn't restore the display", r.error); return; }
    const nm = this.normMon();
    this.toast('success', 'Display restored', (nm ? nm.label + ' is primary' : 'Monitors are back') + '.');
    this.reloadMonitors();
  }
  testMon() {
    const m = this.mons(), nm = this.normMon(), lib = this.state.lib;
    const used = lib.map(g => g.display.mon).find(id => id && id !== (nm && nm.id) && m.some(x => x.id === id));
    return m.find(x => x.id === used) || m.find(x => x.attached && x !== nm) || m.find(x => x !== nm) || null;
  }
  async testDisp() {
    const m = this.testMon(); if (!m || this.state.disp.testing) return;
    this.setState(s => ({ disp: { ...s.disp, testing: true } }));
    this.toast('info', 'Switched display to ' + m.label, 'Test profile · switching back in 10 s.');
    const r = await api.testDisplay(m.id);
    this.setState(s => ({ disp: { ...s.disp, testing: false } }));
    if (r.ok) this.toast('success', 'Display restored', 'Back to your normal setup.');
    else this.toast('error', 'Display test failed', r.error);
    this.reloadMonitors();
  }
  async applyNormal() {
    this.setState(s => ({ disp: { ...s.disp, applying: true, err: null } }));
    const r = await api.applyNormalDisplay();
    this.setState(s => ({ disp: { ...s.disp, applying: false, err: r.ok ? null : r.error }, monitors: r.ok && r.monitors ? r.monitors : s.monitors }));
    if (r.ok) this.toast('success', 'Normal setup applied', 'Your monitors now match the normal setup.');
  }

  // resolution profiles
  rpOpen(p) { this.setState({ rp: p ? { id: p.id, name: p.name, w: String(p.w), h: String(p.h), hz: p.hz ? String(p.hz) : '', stretch: !!p.stretch, err: null } : { name: '', w: '', h: '', hz: '', stretch: false, err: null } }); }
  setRp(p) { this.setState(s => ({ rp: s.rp && { ...s.rp, err: null, ...p } })); }
  async rpSave() {
    const P = this.state.rp; if (!P) return;
    const w = parseInt(P.w, 10), h = parseInt(P.h, 10), hz = P.hz ? parseInt(P.hz, 10) : 0;
    if (!w || !h) return this.setRp({ err: 'Enter a width and height, like 1280 × 960.' });
    const r = await api.saveResProfile({ id: P.id, name: P.name, w, h, hz, stretch: P.stretch });
    if (!r.ok) return this.setRp({ err: r.error });
    const gd = this._rpForGame;
    this._rpForGame = null;
    this.setState({ rp: null, resProfiles: r.list });
    if (gd && !P.id) { this.setDisp(gd, { res: r.profile.id }); this.toast('success', 'Profile saved', r.profile.name + ' is set for ' + ((this.gfind(gd) || {}).name || 'the game') + '.'); }
    else this.toast('success', 'Profile saved', r.profile.name + ' · ' + resSpec(r.profile));
  }
  async rpDelete(p) {
    const list = await api.removeResProfile(p.id);
    this.setState(s => ({ resProfiles: list, lib: s.lib.map(g => g.display.res === p.id ? { ...g, display: { ...g.display, res: null } } : g) }));
    this.toast('info', 'Deleted ' + p.name, 'Games that used it no longer change the resolution.');
  }
  async rpTest(p) {
    if (this.state.rpTesting) return;
    this.setState({ rpTesting: p.id });
    this.toast('info', 'Testing ' + p.name, resSpec(p) + ' on your primary monitor · switching back in 10 s.');
    const r = await api.testResProfile(p.id);
    this.setState({ rpTesting: null });
    if (r.ok) this.toast('success', 'Resolution restored', 'Back to your normal resolution.');
    else this.toast('error', "Windows didn't accept " + p.w + '×' + p.h, (r.error || '') + ' Add it as a custom resolution in the NVIDIA or AMD control panel, then test again.');
  }

  // add / edit non-Steam games
  setAg(p) { this.setState(s => ({ ag: s.ag && { ...s.ag, ...p } })); }
  openAddGame() { this.setState({ ag: { mode: 'add', exe: '', name: '', cover: 'exe', img: null, imgFile: null, imgName: '', args: '' }, gd: null }); }
  openEdit(id) {
    const g = this.gfind(id);
    const file = g.img ? decodeURIComponent(g.img.split('/').pop()) : null;
    this.setState({ acctMenu: false, ag: { mode: 'edit', id, exe: g.exe, name: g.name, cover: g.img ? 'image' : g.iconMode, img: g.img, imgFile: file, imgName: g.img ? 'Custom cover' : '', args: g.opts } });
  }
  async agBrowse() {
    const exe = await api.libPickExe(); if (!exe) return;
    const a = this.state.ag;
    this.setAg({ exe, name: a.name || exe.split('\\').pop().replace(/\.exe$/i, '') });
  }
  async agImage() {
    const r = await api.libPickImage(); if (!r) return;
    this.setAg({ cover: 'image', img: r.url, imgFile: r.file, imgName: r.name });
  }
  async agSave() {
    const a = this.state.ag; if (!a || !a.exe || !a.name.trim()) return;
    const id = await api.libSaveCustom({ id: a.mode === 'edit' ? a.id : null, name: a.name.trim(), exe: a.exe, opts: a.args, img: a.cover === 'image' ? a.imgFile : null, iconMode: a.cover === 'exe' ? 'exe' : 'gen' });
    if (!id) { this.toast('error', "Couldn't save", 'Pick the .exe and give the game a name.'); return; }
    this.setState({ ag: null, lf: 'all', lq: '' });
    await this.reloadLib();
    if (a.mode === 'edit') this.toast('success', 'Saved', a.name.trim() + ' updated.');
    else this.toast('success', 'Added to library', a.name.trim() + ' launches through SwapDeck.', { label: 'Open', fn: () => this.openGame(id) });
  }
  async removeGame() {
    const id = this.state.rmId, g = this.gfind(id);
    this.setState({ rmId: null, gd: null });
    const saved = await api.libRemoveCustom(id);
    await this.reloadLib();
    this.toast('info', 'Removed ' + (g ? g.name : 'game'), 'Files on disk were not touched.', saved ? { label: 'Undo', fn: async () => { await api.libRestoreCustom(saved); this.reloadLib(); } } : null);
  }
  async shortcut(g, a, mon) {
    const r = await api.shortcut(g.id);
    if (r.ok) this.toast('success', 'Desktop shortcut created', r.file + ' opens through SwapDeck' + (a ? ' as ' + a.name : '') + (mon ? ' on ' + mon.label : '') + '.');
    else this.toast('error', "Couldn't create the shortcut", r.error);
  }

  // =================== values for view(b) ===================

  tileVals() {
    const S = this.state, running = this.steamState === 'running', vis = this.visible(), selId = this.selId(), swId = S.sw && S.sw.sid;
    const tiles = vis.map(a => {
      const cur = a.current, foc = S.kbd && a.id === selId, hov = S.hover === a.id && !swId, g = this.launchOf(a), st = a.stats, c = st && st.cs2, canSw = !(cur && running);
      const cd = c && c.cd && c.cd.until > Date.now() ? c.cd : null;
      let ring = cur ? '0 0 0 2px var(--accent),0 0 26px rgba(var(--accent-rgb),.28)' : '0 0 0 1px rgba(var(--fg-rgb),.08)';
      if (foc) ring = cur ? '0 0 0 2px var(--accent),0 0 0 4px var(--background),0 0 0 6px var(--text)' : '0 0 0 3px var(--background),0 0 0 5px var(--text)';
      let stats = [];
      if (a.linked && st) stats = c ? [{ label: c.premier == null ? 'PREMIER UNRATED' : 'PREMIER ' + fmt(c.premier), fg: c.premier == null ? 'var(--text-muted)' : tier(c.premier) }]
        : [...(st.acct && st.acct.level != null ? [{ label: 'STEAM LVL ' + st.acct.level, fg: 'var(--text-soft)' }] : []), { label: fmt(st.games.length) + ' GAMES', fg: 'var(--text-soft)' }];
      const m = /#[0-9a-fA-F]{6}/.exec(a.grad || ''), col = m ? m[0] : '#64748b';
      return {
        id: a.id, name: a.name, ini: a.ini, noImg: !a.avatar,
        bg: a.avatar ? 'url("' + a.avatar + '") center/cover no-repeat,#111' : 'radial-gradient(120% 90% at 20% 0%,rgba(255,255,255,.16),transparent 60%),color-mix(in oklch,color-mix(in oklch,' + col + ' 68%,var(--accent)) 78%,#000)',
        ring, ty: hov ? 'translateY(-3px)' : 'none', hovOp: hov ? 1 : 0, hovPe: hov ? 'auto' : 'none', infoOp: hov || foc ? 1 : 0, infoPe: hov || foc ? 'auto' : 'none',
        pinned: a.pinned, linked: a.linked, cd: a.linked && !!cd, cdTitle: cd ? cd.kind + ' · ' + left(cd.until) : '',
        cur, curLabel: running ? 'CURRENT' : 'AUTO-LOGIN', canSwitch: canSw, signedIn: !canSw, swLabel: cur ? 'Start Steam' : 'Switch',
        swHint: !canSw ? 'this account is active' : g ? 'then ' + shortName(g) : 'no game after', switching: swId === a.id,
        stText: stText(a.pub), stDot: ST[stKey(a.pub)], stFg: !a.pub || a.pub.st === 'offline' ? 'var(--text-subtle)' : a.pub.st === 'ingame' ? 'var(--ok-fg)' : 'var(--text-muted)',
        tags: a.tags.map(t => { const x = tc(t); return { label: t, bg: x[0], fg: x[1], bd: x[2] }; }),
        hasStats: a.linked && stats.length > 0, stats,
        onEnter: () => { if (S.hover !== a.id || S.kbd) this.setState({ hover: a.id, kbd: false }); }, onLeave: () => this.setState(s => s.hover === a.id ? { hover: null } : null),
        onClick: () => { this.setState({ sel: a.id }); this.switchTo(a.id); }, onSwitch: e => { e.stopPropagation(); this.setState({ sel: a.id }); this.switchTo(a.id); },
        onInfo: e => { e.stopPropagation(); this.setState({ sel: a.id }); this.openDetails(a.id); }, onCtx: e => { e.preventDefault(); this.setState({ sel: a.id }); this.openDetails(a.id); },
      };
    });
    return { tiles, acctSkel: [70, 56, 64, 48, 60, 52].map((w, i) => ({ w: w + '%', d: (i * .12).toFixed(2) + 's' })) };
  }

  themeVals() {
    const c = this.state.settings, acc = this.accentHex(), L = this.state.launch, win = this.state.winAccent || WIN_ACCENT;
    const nm = c.accent === 'windows' ? 'Windows accent' : c.accent === 'custom' ? 'Custom' : (ACCENTS.find(a => a[0] === c.accent) || ACCENTS[0])[1];
    const ring = (sel, col) => sel ? '0 0 0 2px var(--surface-raised),0 0 0 4px ' + col : 'inset 0 0 0 1px rgba(255,255,255,.18)';
    const custom = c.customAccent || '#c084fc', curAcc = c.accent || 'cyan';
    const sw = [...ACCENTS.map(([k, n, x]) => ({ k, name: n, bg: x, col: x })), { k: 'windows', name: 'Windows accent', bg: win, col: win, isWin: true }, { k: 'custom', name: 'Custom…', bg: curAcc === 'custom' ? custom : 'conic-gradient(from 0deg,#f43f5e,#f59e0b,#22c55e,#22d3ee,#8b5cf6,#ec4899,#f43f5e)', col: curAcc === 'custom' ? custom : 'var(--text-muted)', isCustom: true }];
    const scale = c.uiScale ?? 'auto';
    return {
      baseTiles: ['dark', 'oled', 'light'].map(k => { const B = BASES[k], sel = (c.base || 'dark') === k; return { name: B.label, sel, bd: sel ? 'var(--accent)' : 'var(--border)', ring: sel ? '0 0 0 3px var(--accent-soft)' : 'none', bg: B.background, line: B.border, bar: B.surface, card1: 'linear-gradient(160deg,' + acc + ',' + mixc(acc, '#000000', .55) + ')', card2: B.light ? '#e2e2e8' : B['surface-raised'], txt: B['text-muted'], txt2: B['border-strong'], acc, on: () => this.setCfg({ base: k }) }; }),
      accSw: sw.map(s => ({ name: s.name, bg: s.bg, isWin: !!s.isWin, isCustom: !!s.isCustom, ring: ring(curAcc === s.k, s.col), on: s.isCustom ? () => { if (this._color) this._color.click(); } : () => this.setCfg({ accent: s.k }) })),
      accLabel: nm + ' · ' + acc.toUpperCase() + (c.followTag && L && L.running ? ' · following game' : ''),
      colorRef: this.colorRef, customHex: custom,
      onCustomColor: e => { const v = e.target.value; clearTimeout(this._colT); this.setState(s => ({ settings: { ...s.settings, accent: 'custom', customAccent: v } })); this._colT = setTimeout(() => this.setCfg({ accent: 'custom', customAccent: v }), 250); },
      scaleOpts: SCALE_OPTS.map(v => { const val = v === 'auto' ? 'auto' : v / 100, on = scale === val; return { label: v === 'auto' ? 'Auto' : v + '%', bg: on ? 'rgba(var(--fg-rgb),.1)' : 'transparent', fg: on ? 'var(--text)' : 'var(--text-subtle)', on: () => this.setCfg({ uiScale: val }) }; }),
      scaleNow: Math.round((this.state.zoom || 1) * 100) + '%',
    };
  }

  settingsVals() {
    const S = this.state, cfg = S.settings, on = 'linear-gradient(90deg,var(--accent),var(--accent-2))', off = 'rgba(var(--fg-rgb),.16)';
    const tg = v => [v ? on : off, v ? 'translateX(18px)' : 'translateX(0px)'];
    const inst = S.lib.filter(g => g.steam && g.installed), dg = inst.find(g => String(g.appid) === String(cfg.defaultGame)) || null;
    const M = S.mp, v = S.vault || { mode: 'dpapi' }, master = v.mode === 'master', u = S.update || { state: 'idle' };
    const [lgBg, lgX] = tg(!!cfg.launchAfter), [ftBg, ftX] = tg(!!cfg.followTag), [rdBg, rdX] = tg(!!cfg.reduceMotion), [mpAutoBg, mpAutoX] = tg(!!v.autoUnlock);
    const onLg = () => { const patch = { launchAfter: !cfg.launchAfter }; if (!cfg.defaultGame && inst.length) patch.defaultGame = String((inst.find(g => String(g.appid) === '730') || inst[0]).appid); this.setCfg(patch); };
    const upd = u.state, dl = upd === 'downloading';
    const idleText = upd === 'unsupported' ? (u.portable ? 'Portable version: download new versions from GitHub' : 'Development build: updates only work in the installed app')
      : upd === 'error' ? 'Update check failed: ' + (u.error || 'unknown error')
      : upd === 'none' ? 'Up to date' + (u.checkedAt ? ' · checked ' + rel(u.checkedAt) : '')
      : 'Checks at startup and every 6 hours';
    const P = S.rp, rpOn = !!(P && P.stretch);
    return {
      lgBg, lgX, lgOn: !!cfg.launchAfter, onLg,
      defMenu: S.defMenu, onDefMenu: () => this.setState(s => ({ defMenu: !s.defMenu })), defBd: S.defMenu ? 'rgba(var(--accent-rgb),.55)' : 'rgba(var(--fg-rgb),.1)',
      defName: dg ? dg.name : inst.length ? 'Pick a game' : 'No installed games', defBg: dg ? this.cardBg(dg) : 'rgba(var(--fg-rgb),.06)',
      defOpts: inst.map(g => ({ name: g.name, cover: this.cardBg(g), sel: !!dg && g.id === dg.id, bg: dg && g.id === dg.id ? 'rgba(var(--accent-rgb),.08)' : 'transparent', on: () => { this.setCfg({ defaultGame: String(g.appid) }); this.setState({ defMenu: false }); } })),
      startOpts: [['acc', 'Accounts'], ['lib', 'Library']].map(([k, l]) => { const on = (cfg.startView || 'acc') === k; return { label: l, bg: on ? 'rgba(var(--fg-rgb),.1)' : 'transparent', fg: on ? 'var(--text)' : 'var(--text-subtle)', on: () => this.setCfg({ startView: k }) }; }),
      styleOpts: [['grid', 'Grid'], ['gallery', 'Gallery']].map(([k, l]) => { const on = (cfg.accountStyle || 'grid') === k; return { label: l, bg: on ? 'rgba(var(--fg-rgb),.1)' : 'transparent', fg: on ? 'var(--text)' : 'var(--text-subtle)', on: () => this.setCfg({ accountStyle: k }) }; }),
      trBg: cfg.tray ? on : off, trX: cfg.tray ? 'translateX(18px)' : 'translateX(0px)', onTr: () => this.setCfg({ tray: !cfg.tray }),
      onExport: async () => { const r = await api.exportBackup(); if (r.ok) this.toast('success', 'Backup saved', r.file + ' is in the folder you picked.'); else if (r.error) this.toast('error', "Couldn't save the backup", r.error); },
      onImport: async () => { const r = await api.importBackup(); if (r.ok) { await this.reload(); this.toast('success', 'Backup restored', 'Settings from ' + r.file + ' are back.'); } else if (r.error) this.toast('error', "Couldn't restore", r.error); },
      ftBg, ftX, onFt: () => this.setCfg({ followTag: !cfg.followTag }), rdBg, rdX, onRd: () => this.setCfg({ reduceMotion: !cfg.reduceMotion }),
      mpIsOff: !master && !M.form, mpIsForm: !!M.form, mpIsOn: master && !M.form, mpA: M.a, mpB: M.b, mpMismatch: M.mismatch, mpErr: M.err,
      mpOld: M.old, mpOldOn: M.form === 'change' || M.form === 'remove', mpNewOn: M.form === 'set' || M.form === 'change',
      mpSaveLbl: M.form === 'change' ? 'Change password' : M.form === 'remove' ? 'Remove password' : 'Set password',
      onMpA: e => this.setMp({ a: e.target.value, mismatch: false }), onMpB: e => this.setMp({ b: e.target.value, mismatch: false }), onMpOld: e => this.setMp({ old: e.target.value }),
      onMpKey: e => { if (e.key === 'Enter') this.mpSave(); },
      onMpSet: () => this.setMp({ form: 'set', a: '', b: '', old: '', auto: false, mismatch: false }), onMpChange: () => this.setMp({ form: 'change', a: '', b: '', old: '', mismatch: false }),
      onMpRemove: () => this.setMp({ form: 'remove', a: '', b: '', old: '', mismatch: false }),
      onMpCancel: () => this.setMp({ form: null, a: '', b: '', old: '', mismatch: false }), onMpSave: () => this.mpSave(),
      onMpAuto: () => M.form ? this.setMp({ auto: !M.auto }) : this.vaultAuto(), mpAutoBg, mpAutoX, mpAutoCb: M.auto ? 'var(--accent)' : 'transparent', mpAutoCbBd: M.auto ? 'var(--accent)' : 'rgba(var(--fg-rgb),.3)',
      updIdle: !['checking', 'downloading', 'ready'].includes(upd), updChecking: upd === 'checking', updDl: dl, updReady: upd === 'ready', updPct: (u.percent || 0) + '%', updChecked: u.checkedAt ? rel(u.checkedAt) : 'not yet',
      updVer: 'v' + (u.version || ''), updIdleText: idleText, updIdleFg: upd === 'none' ? 'var(--ok-fg)' : upd === 'error' ? 'var(--warn-fg)' : 'var(--text-subtle)',
      updCanCheck: !['checking', 'downloading', 'ready', 'unsupported'].includes(upd),
      onUpdCheck: () => api.checkUpdates(), onUpdRestart: () => api.installUpdate(),
      onAbout: e => { e.preventDefault(); api.openProfile('https://github.com/byteminite/SwapDeck/releases'); },
      lockOn: !!S.locked, lockPw: S.unlockPw, lockErr: !!S.unlockErr, lockBd: S.unlockErr ? 'rgba(248,113,113,.6)' : 'rgba(var(--fg-rgb),.14)',
      onLockPw: e => this.setState({ unlockPw: e.target.value, unlockErr: false }), onLockKey: e => { if (e.key === 'Enter') this.unlock(); }, onUnlock: () => this.unlock(),
      settingsRef: this.settingsRef,
      setNav: [['general', 'General'], ['steam', 'Steam'], ['displays', 'Displays'], ['appearance', 'Appearance'], ['security', 'Security'], ['updates', 'Updates'], ['about', 'About']].map(([k, l]) => { const on = (S.setSec || 'general') === k; return { label: l, bg: on ? 'rgba(var(--fg-rgb),.07)' : 'transparent', fg: on ? 'var(--text)' : 'var(--text-muted)', bar: on ? 'var(--accent)' : 'transparent', on: () => this.openSettings(k) }; }),
      ...Object.fromEntries(['general', 'steam', 'displays', 'appearance', 'security', 'updates', 'about'].map(k => ['sec_' + k, (S.setSec || 'general') === k])),
      // resolution profiles
      rpList: S.resProfiles.map(p => ({ name: p.name, spec: resSpec(p) + (S.lib.some(g => g.display.res === p.id) ? ' · ' + S.lib.filter(g => g.display.res === p.id).map(g => shortName(g.name)).join(', ') : ''), testing: S.rpTesting === p.id, busy: !!S.rpTesting || !!S.launch, onTest: () => this.rpTest(p), onEdit: () => this.rpOpen(p), onDel: () => this.rpDelete(p) })),
      rpFormOn: !!P, rpNewOn: !P, rpTitle: P && P.id ? 'Edit profile' : 'New resolution profile',
      rpName: P ? P.name : '', rpW: P ? P.w : '', rpH: P ? P.h : '', rpHz: P ? P.hz : '', rpErr: P ? P.err : null,
      rpStretchBg: rpOn ? on : off, rpStretchX: rpOn ? 'translateX(18px)' : 'translateX(0px)',
      onRpName: e => this.setRp({ name: e.target.value }), onRpW: e => this.setRp({ w: e.target.value.replace(/\D/g, '').slice(0, 5) }), onRpH: e => this.setRp({ h: e.target.value.replace(/\D/g, '').slice(0, 5) }), onRpHz: e => this.setRp({ hz: e.target.value.replace(/\D/g, '').slice(0, 3) }),
      onRpStretch: () => this.setRp({ stretch: !rpOn }), onRpSave: () => this.rpSave(), onRpCancel: () => { this._rpForGame = null; this.setState({ rp: null }); }, onRpNew: () => this.rpOpen(null),
    };
  }

  libraryVals() {
    const S = this.state, games = S.lib, L = S.launch, isLib = S.view === 'lib';
    const q = S.lq.trim().toLowerCase(), byN = (x, y) => x.name.localeCompare(y.name);
    const vis = games.filter(g => g.name.toLowerCase().includes(q) && (S.lf === 'all' || (S.lf === 'steam' ? g.steam : S.lf === 'nonsteam' ? !g.steam : g.tags.includes(S.lf))));
    vis.sort(S.ls === 'name' ? byN : S.ls === 'recent' ? (x, y) => (y.lastPlayed - x.lastPlayed) || byN(x, y) : (x, y) => (y.hours - x.hours) || byN(x, y));
    const chip = (k, label, n, c) => { const on = S.lf === k, cc = c || ['rgba(var(--fg-rgb),.1)', 'var(--text)', 'rgba(var(--fg-rgb),.35)']; return { label, n, bg: on ? cc[0] : 'transparent', fg: on ? cc[1] : 'var(--text-muted)', bd: on ? cc[2] : 'rgba(var(--fg-rgb),.12)', on: () => this.setState({ lf: on && k !== 'all' ? 'all' : k }) }; };
    const tags = [...new Set(games.flatMap(g => g.tags))];
    const libFilters = [chip('all', 'All', games.length), chip('steam', 'Steam', games.filter(g => g.steam).length), chip('nonsteam', 'Non-Steam', games.filter(g => !g.steam).length), ...tags.map(t => chip(t, t, games.filter(g => g.tags.includes(t)).length, tc(t)))];
    const libSorts = [['recent', 'Last played'], ['hours', 'Most played'], ['name', 'Name']].map(([k, l]) => ({ label: l, bg: S.ls === k ? 'rgba(var(--fg-rgb),.1)' : 'transparent', fg: S.ls === k ? 'var(--text)' : 'var(--text-subtle)', on: () => this.setState({ ls: k }) }));
    this._libVis = vis;
    const cards = vis.map(g => {
      const a = g.steam && g.acct ? this.find(g.acct) : null, mon = this.monOf(g), hov = S.hovG === g.id, run = !!(L && L.gid === g.id), noArt = !this.coverOf(g);
      const exe = noArt && !g.steam && g.iconMode === 'exe';
      return {
        id: g.id, name: g.name, ini: iniOf(g), noArt, exeIcon: exe, iniChip: noArt && !exe,
        bg: this.cardBg(g), filter: g.installed ? 'none' : 'grayscale(1) brightness(.55)', nameFg: g.installed ? 'var(--text)' : 'var(--text-subtle)',
        typeLbl: g.steam ? 'STEAM' : 'NON-STEAM', typeFg: g.steam ? 'var(--text-soft)' : 'var(--warn-fg)', typeBd: g.steam ? 'rgba(var(--fg-rgb),.22)' : 'rgba(251,191,36,.4)',
        hasMon: !!mon || !!this.resOf(g), monTitle: [mon ? 'Display: ' + mon.label : null, this.resOf(g) ? 'Resolution: ' + this.resOf(g).name : null].filter(Boolean).join(' · '),
        hasAcct: !!a, aIni: a && !a.avatar ? a.ini : '', aBg: a ? avBg(a) : '',
        // Outline the account that's signed in to Steam right now.
        aRing: a && a.current && this.steamState === 'running' ? '0 0 0 1.5px var(--background),0 0 0 3px var(--accent)' : 'none', aFg: a && a.current && this.steamState === 'running' ? 'var(--accent-strong)' : 'var(--text-muted)', aTip: a ? a.name + (a.current && this.steamState === 'running' ? ' · signed in now' : '') : '', aName: a ? a.name : '', noAcct: !a, noAcctLbl: g.steam ? 'any account' : 'no account needed',
        notInst: !g.installed, running: run && L.running, canPlay: g.installed && !run, canInstall: !g.installed,
        hovOp: hov && !run ? 1 : 0, hovPe: hov && !run ? 'auto' : 'none', ty: hov ? 'translateY(-3px)' : 'none',
        ring: run ? '0 0 0 2px #4ade80,0 0 30px rgba(74,222,128,.25)' : S.kbd && S.lsel === g.id ? '0 0 0 3px var(--background),0 0 0 5px var(--text)' : hov ? '0 0 0 2px rgba(var(--fg-rgb),.4),0 18px 40px rgba(0,0,0,.5)' : '0 0 0 1px rgba(var(--fg-rgb),.08)',
        onEnter: () => this.setState({ hovG: g.id }), onLeave: () => this.setState(s => s.hovG === g.id ? { hovG: null } : null),
        onClick: () => { clearTimeout(this._gclk); this._gclk = this.later(230, () => this.openGame(g.id)); },
        onDbl: e => { e.preventDefault(); clearTimeout(this._gclk); this.play(g.id); },
        onPlay: e => { e.stopPropagation(); clearTimeout(this._gclk); this.play(g.id); },
      };
    });
    const loading = S.libLoading;
    return {
      libSearchRef: this.libSearchRef, lq: S.lq, onLq: e => this.setState({ lq: e.target.value }), libFilters, libSorts, onAddGame: () => this.openAddGame(),
      libLoadingOn: isLib && loading, libGridOn: isLib && !loading && vis.length > 0, libEmptyOn: isLib && !loading && games.length === 0, libNoRes: isLib && !loading && games.length > 0 && vis.length === 0,
      skel: [62, 80, 54, 72, 66, 58, 76, 50].map((w, i) => ({ w: w + '%', d: (i * .12).toFixed(2) + 's' })),
      cards, onLibClear: () => this.setState({ lq: '', lf: 'all' }),
      onRescan: async () => { this.setState({ libLoading: true }); await this.reloadLib(); this.setState({ libLoading: false }); if (!this.state.lib.some(g => g.steam)) this.toast('info', 'Library scanned', 'No installed Steam games found in your library folders.'); },
    };
  }

  gameVals() {
    const S = this.state, g = S.gd ? this.gfind(S.gd) : null, L = S.launch;
    if (!g) return { gdOn: false };
    const a = g.steam && g.acct ? this.find(g.acct) : null, mon = this.monOf(g), res = this.resOf(g), cur = this.accts.find(x => x.current), nm = this.normMon();
    const logoOk = g.steam && !!g.logo && !S.logoFail[g.id], noArt = !this.coverOf(g);
    const rows = [['Last played', L && L.gid === g.id ? 'playing now' : rel(g.lastPlayed)], ['Playtime', g.hours ? g.hours.toFixed(1) + ' h' + (g.steam ? '' : ' · tracked by SwapDeck') : 'Not played yet'], ['Install folder', g.installed ? g.folder : 'Not installed', g.installed]];
    if (!g.steam) rows.push(['Executable', g.exe, true]);
    const opt = sel => ({ bg: sel ? 'rgba(var(--accent-rgb),.08)' : 'transparent', sel });
    const accs = [...this.accts].sort((x, y) => (+y.tags.some(t => g.tags.includes(t)) - +x.tags.some(t => g.tags.includes(t))) || x.name.localeCompare(y.name));
    const mons = this.mons(), other = mons.find(m => m.id !== (nm && nm.id) && m.attached) || mons.find(m => m.id !== (nm && nm.id));
    // Monitor boxes shrink to fit when there are three or more.
    const baseW = m => m.portrait ? 62 : m.w / m.h > 2 ? 186 : 148, k = Math.min(1, 300 / Math.max(1, mons.reduce((t, m) => t + baseW(m), 0)));
    const restoreTo = nm ? nm.label + ' as primary' : 'your normal setup';
    const logoFail = () => this.setState(s => ({ logoFail: { ...s.logoFail, [g.id]: true } }));
    const profiles = S.resProfiles, resSel = id => ({ bd: id ? 'rgba(var(--accent-rgb),.55)' : 'rgba(var(--fg-rgb),.12)', bg: id ? 'rgba(var(--accent-rgb),.08)' : 'transparent' });
    return {
      gdOn: true, gName: g.name, gIni: iniOf(g), gNoArt: noArt, gHasLogo: logoOk, gNoLogo: !logoOk,
      // A soft shade behind the logo keeps it readable on bright banners.
      gLogoEl: html`<span key=${g.id} style="display:inline-block;padding:10px 16px 8px 4px;margin:-10px -16px -8px -4px;background:radial-gradient(closest-side,rgba(0,0,0,.4),rgba(0,0,0,.2) 60%,transparent);border-radius:40px"><img src=${g.logo} alt=${g.name} style="display:block;max-width:320px;max-height:76px;object-fit:contain;object-position:left bottom;filter:drop-shadow(0 4px 18px rgba(0,0,0,.6))" onError=${logoFail} /></span>`,
      gExeIcon: !g.steam && g.iconMode === 'exe' && !g.img, gIniChip: !(!g.steam && g.iconMode === 'exe' && !g.img),
      gHeroBg: g.steam ? 'url("' + g.hero + '") center/cover no-repeat,' + this.gradOf(g) : g.img ? 'url("' + g.img + '") center 30%/cover no-repeat,' + this.gradOf(g) : 'radial-gradient(90% 120% at 15% 0%,rgba(var(--fg-rgb),.22),transparent 60%),' + this.gradOf(g),
      onLogoErr: logoFail,
      gTypeLbl: g.steam ? 'STEAM' : 'NON-STEAM', gTypeFg: g.steam ? 'var(--text-soft)' : 'var(--warn-fg)', gTypeBd: g.steam ? 'rgba(var(--fg-rgb),.25)' : 'rgba(251,191,36,.45)',
      gNotInst: !g.installed, gRunning: !!(L && L.gid === g.id),
      gMeta: g.steam ? 'Steam · App ' + g.appid + (g.tags.length ? ' · ' + g.tags.join(', ') : '') : 'Non-Steam · ' + g.exe.split('\\').pop(),
      gCanPlay: g.installed && !(L && L.gid === g.id), gCanInstall: !g.installed,
      gPlaySub: [a ? 'as ' + a.name : g.steam ? 'current account' : 'no account', mon ? mon.label : 'default display', res ? res.name : null, g.launcher ? 'via ' + g.launcher.split('\\').pop().replace(/\.exe$/i, '') : null].filter(Boolean).join(' · '),
      onGPlay: () => this.play(g.id), onGdClose: () => this.setState({ gd: null, acctMenu: false }),
      gSteam: g.steam, gNonSteam: !g.steam,
      gAcctSet: !!a, gAcctNone: !a, gAcctLabel: a ? a.name : "Don't switch", gAcctIni: a && !a.avatar ? a.ini : '', gAcctBg: a ? avBg(a) : '',
      gAcctSub: a ? a.login + (a.current ? ' · signed in now' : '') : 'Use whoever is signed in' + (cur ? ' (' + cur.name + ')' : ''),
      gAcctBd: S.acctMenu ? 'rgba(var(--accent-rgb),.55)' : 'rgba(var(--fg-rgb),.1)',
      gAcctHint: a ? (a.current && this.steamState === 'running' ? 'Already signed in, so Play launches straight away.' : 'Play switches to ' + a.name + ' first, then launches.') : 'Launches on whichever account Steam is signed in with.',
      acctMenu: S.acctMenu, onAcctMenu: () => this.setState(s => ({ acctMenu: !s.acctMenu })),
      acctOpts: [{ isNone: true, isAcct: false, label: "Don't switch", sub: 'Use whoever is signed in', cur: false, ...opt(!g.acct), on: () => this.setAcct(g.id, null) },
        ...accs.map(x => ({ isNone: false, isAcct: true, ini: x.avatar ? '' : x.ini, grad: avBg(x), label: x.name, sub: x.login + (x.tags.length ? ' · ' + x.tags.join(', ') : ''), cur: x.current, ...opt(g.acct === x.id), on: () => this.setAcct(g.id, x.id) }))],
      segDisp: [['Default', !mon, () => this.setDisp(g.id, { mon: null })], ['Choose monitor', !!mon, () => this.setDisp(g.id, { mon: g.display.mon || (other ? other.id : null) })]].map(([l, sel, on]) => ({ label: l, on, bg: sel ? 'rgba(var(--fg-rgb),.1)' : 'transparent', fg: sel ? 'var(--text)' : 'var(--text-subtle)' })),
      diagOp: mon ? 1 : .55,
      gMons: mons.map(m => {
        const sel = !!mon && mon.id === m.id, off = (!!mon && !sel && g.display.mode === 'only') || (!m.attached && !sel);
        return { name: m.label, spec: m.w + '×' + m.h + ' @ ' + m.hz + ' Hz' + (m.attached ? '' : ' · off now'), num: m.num, w: Math.round(baseW(m) * k) + 'px', h: Math.round((m.portrait ? 110 : 84) * Math.max(k, .8)) + 'px',
          isPrimary: !!nm && m.id === nm.id && !off, sel, off, bd: sel ? 'var(--accent)' : off ? 'rgba(var(--fg-rgb),.1)' : 'rgba(var(--fg-rgb),.22)',
          bg: sel ? 'linear-gradient(160deg,rgba(var(--accent-rgb),.2),rgba(99,102,241,.14))' : off ? 'rgba(0,0,0,.35)' : 'rgba(var(--fg-rgb),.04)',
          glow: sel ? '0 0 0 3px rgba(var(--accent-rgb),.12),0 0 28px rgba(var(--accent-rgb),.22)' : 'none', numFg: sel ? 'var(--accent-strong)' : off ? 'rgba(var(--fg-rgb),.15)' : 'rgba(var(--fg-rgb),.35)', fg: sel ? 'var(--text)' : 'var(--text-soft)',
          on: () => this.setDisp(g.id, { mon: m.id }) };
      }),
      gHasMon: !!mon, gNoMon: !mon,
      gModes: [['primary', 'Make primary', 'Keep other monitors on'], ['only', 'Use only this monitor', 'Others turn off while playing']].map(([k, l, s]) => { const sel = g.display.mode === k; return { label: l, sub: s, sel, bd: sel ? 'rgba(var(--accent-rgb),.5)' : 'rgba(var(--fg-rgb),.1)', bg: sel ? 'rgba(var(--accent-rgb),.06)' : 'rgba(var(--fg-rgb),.02)', rd: sel ? 'var(--accent)' : 'rgba(var(--fg-rgb),.25)', on: () => this.setDisp(g.id, { mode: k }) }; }),
      gResOpts: [{ id: null, label: "Don't change", sub: '' }, ...profiles.map(p => ({ id: p.id, label: p.name, sub: resSpec(p) }))].map(o => ({ label: o.label, sub: o.sub, ...resSel((g.display.res || null) === o.id), on: () => this.setDisp(g.id, { res: o.id }) })),
      gResHint: res ? 'Set on ' + (mon ? mon.label : 'your primary monitor') + ' before ' + g.name + ' starts.' : profiles.length ? '' : 'Make a profile first, e.g. 1280 × 960 stretched for CS2.',
      gResManageLbl: profiles.length ? 'Manage profiles' : '+ New profile',
      onGResManage: () => { const none = !profiles.length; this.setState({ gd: null, acctMenu: false }); this.openSettings('displays'); if (none) { this._rpForGame = g.id; this.rpOpen(null); } },
      gShowRestore: !!mon || !!res,
      rsBg: g.display.restore ? 'var(--accent)' : 'rgba(var(--fg-rgb),.14)', rsX: g.display.restore ? 'translateX(18px)' : 'none', onRestoreT: () => this.setDisp(g.id, { restore: !g.display.restore }),
      rsSub: g.display.restore ? 'Back to ' + restoreTo + (res ? ' and your normal resolution' : '') + (mon && g.display.mode === 'only' ? ', all monitors on' : '') : 'Display stays as it is after you quit',
      // Steam games can start another .exe instead (e.g. Content Manager) and keep their Steam art and playtime.
      gLaunchCustom: !!g.launcher, gLaunchName: g.launcher ? g.launcher.split('\\').pop().replace(/\.exe$/i, '') : 'Steam',
      gLaunchPath: g.launcher || 'steam://rungameid/' + g.appid, gLaunchPickLbl: g.launcher ? 'Change…' : 'Choose .exe…',
      gLaunchBd: g.launcher ? 'rgba(var(--accent-rgb),.45)' : 'rgba(var(--fg-rgb),.1)', gLaunchBg: g.launcher ? 'rgba(var(--accent-rgb),.05)' : 'transparent',
      gLaunchHint: g.launcher ? 'Play signs in to the right Steam account, then opens this instead of the game. Playtime is still tracked when it starts ' + g.name + '.' : 'Use a launcher such as Content Manager instead of starting the game directly.',
      onGLaunchPick: async () => { const p = await api.libPickApp(); if (!p) return; this.gmut(g.id, { launcher: p }); this.gset(g.id, { launcher: p }); },
      onGLaunchReset: () => { this.gmut(g.id, { launcher: null }); this.gset(g.id, { launcher: null }); },
      cScheme: (S.settings.base || 'dark') === 'light' ? 'light' : 'dark',
      gAudioOpts: [{ v: '', label: "Don't change", sel: !g.audio }, ...S.audioDevs.map(d => ({ v: d.id, label: d.name + (d.def ? '  (in use now)' : ''), sel: g.audio === d.id })),
        ...(g.audio && !S.audioDevs.some(d => d.id === g.audio) ? [{ v: g.audio, label: S.audioDevs.length ? 'A device that isn’t connected' : 'Loading devices…', sel: true }] : [])],
      onGAudio: e => { const v = e.target.value || null; this.gmut(g.id, { audio: v }); this.gset(g.id, { audio: v }); },
      gAudioHint: g.audio ? 'Becomes the default sound device while ' + g.name + ' runs, then switches back.' : 'Pick a headset or speakers to switch to while this game runs.',
      gApps: (g.apps || []).map((ap, i) => {
        const upd = p => { const apps = g.apps.map((x, j) => j === i ? { ...x, ...p } : x); this.gmut(g.id, { apps }); return apps; };
        return {
          name: ap.path.split('\\').pop().replace(/\.exe$/i, ''), path: ap.path, args: ap.args || '', closeOn: ap.close !== false,
          cbBg: ap.close !== false ? 'var(--accent)' : 'transparent', cbBd: ap.close !== false ? 'var(--accent)' : 'rgba(var(--fg-rgb),.3)',
          onArgs: e => { const apps = upd({ args: e.target.value }); clearTimeout(this._appT); this._appT = setTimeout(() => api.libSet(g.id, { apps }), 400); },
          onClose: () => this.gset(g.id, { apps: upd({ close: ap.close === false }) }),
          onRemove: () => { const apps = g.apps.filter((_, j) => j !== i); this.gmut(g.id, { apps }); this.gset(g.id, { apps }); },
        };
      }),
      onGAddApp: async () => {
        const p = await api.libPickApp(); if (!p) return;
        const cur = (this.gfind(g.id) || g).apps || [];
        if (cur.some(x => x.path.toLowerCase() === p.toLowerCase())) return;
        const apps = [...cur, { path: p, args: '', close: true }];
        this.gmut(g.id, { apps }); this.gset(g.id, { apps });
      },
      gAppsHint: (g.apps || []).length ? 'Started before the game (unless already running). Ticked ones close when the game exits.' : 'E.g. SimHub, Crew Chief or your wheel software: started with the game, closed afterwards.',
      gOpts: g.opts, onGOpts: e => this.setOpts(g.id, e.target.value),
      gOptsHint: g.launcher ? 'Passed to the launcher you picked above.' : g.steam ? "Passed to the game on launch, like Steam's own Launch Options." : 'Appended to the .exe command line.',
      gInfo: rows.map((r, i) => ({ label: r[0], val: r[1], mono: !!r[2], plain: !r[2], bd: i === rows.length - 1 ? 'transparent' : 'rgba(var(--fg-rgb),.06)' })),
      onShortcut: () => this.shortcut(g, a, mon),
      onGEdit: () => this.openEdit(g.id), onGRemove: () => this.setState({ rmId: g.id, acctMenu: false }),
    };
  }

  launchVals(b) {
    const S = this.state, L = S.launch, lg = L ? this.gfind(L.gid) : null;
    if (!L || !lg) return { lOn: false, gRunOn: false };
    const lmon = L.mon ? this.mons().find(m => m.id === L.mon) : null, nm = this.normMon(), changed = !!L.changed;
    const la = L.acct ? this.find(L.acct) : null;
    return {
      lOn: !L.hidden, lName: lg.name, lCoverBg: this.cardBg(lg), lIniTxt: this.coverOf(lg) ? '' : iniOf(lg),
      lLaunching: !L.running, lRunning: L.running, lTitle: L.running ? 'Now playing' : 'Launching',
      lMeta: [la ? la.name : lg.steam ? 'current account' : 'non-Steam', lmon ? lmon.label + (L.mode === 'only' ? ' only' : '') : 'default display', L.res || null].filter(Boolean).join(' · '),
      lPct: Math.round(L.step / Math.max(1, L.steps.length - 1) * 100) + '%', lBarBg: L.running ? '#4ade80' : 'linear-gradient(90deg,var(--accent),var(--accent-2))',
      lSteps: L.steps.map((s, i) => { const done = i < L.step, act = i === L.step, live = act && L.running; return { label: s.label, sub: s.sub || '', hasSub: !!s.sub, done: done && !s.skip, skipped: done && !!s.skip, active: act && !L.running, todo: i > L.step, live, color: live ? 'var(--ok-fg)' : done && s.skip ? 'var(--text-subtle)' : done ? 'var(--text-soft)' : act ? 'var(--accent-strong)' : 'var(--text-subtle)' }; }),
      lStopLbl: changed && L.restore ? 'Stop · Restore display' : 'Stop tracking', onLStop: () => this.stopGame(), onLHide: () => this.setState(s => ({ launch: s.launch && { ...s.launch, hidden: true } })),
      lRunHint: changed ? (L.restore ? 'Quitting the game puts your display back' + (nm ? ' (' + nm.label + ' primary)' : '') + '. Stop only stops tracking; it never closes the game.' : 'Restore is off, so the display stays as it is after you quit.') : 'SwapDeck tracks playtime while the game runs. Stop never closes the game.',
      gRunOn: L.running, gRunName: lg.name, gRunHasMon: !!lmon || !!L.res, gRunMon: (lmon ? lmon.label : L.res || '').toUpperCase(),
      tbText: (L.running ? 'playing ' : 'launching ') + lg.name + (lmon ? ' · ' + lmon.label : ''), tbDot: changed ? 'var(--accent)' : '#4ade80',
    };
  }

  addGameVals() {
    const ag = this.state.ag;
    if (!ag) return { agOn: false };
    const base = ag.mode === 'edit' ? this.gfind(ag.id) : null, nmx = ag.name.trim() || (ag.exe ? ag.exe.split('\\').pop().replace(/\.exe$/i, '') : 'New game');
    const tmp = { name: nmx, img: ag.cover === 'image' ? ag.img : null, steam: false }, can = !!ag.exe && !!ag.name.trim();
    return {
      agOn: true, agTitle: base ? 'Edit ' + base.name : 'Add a non-Steam game', agSub: base ? 'Changes apply next time you launch it.' : 'Anything with an .exe: sims, launchers, emulators.', agBtn: base ? 'Save changes' : 'Add to library',
      agExeText: ag.exe || 'No file chosen', agExeFg: ag.exe ? 'var(--text-soft)' : 'var(--text-subtle)', onAgBrowse: () => this.agBrowse(),
      agName: ag.name, onAgName: e => this.setAg({ name: e.target.value }), agArgs: ag.args, onAgArgs: e => this.setAg({ args: e.target.value }),
      agCovers: [['exe', 'Exe icon'], ['gen', 'Generated'], ['image', 'Custom image…']].map(([k, l]) => { const sel = ag.cover === k; return { label: l, bd: sel ? 'rgba(var(--accent-rgb),.55)' : 'rgba(var(--fg-rgb),.12)', bg: sel ? 'rgba(var(--accent-rgb),.08)' : 'transparent', fg: sel ? 'var(--accent-strong)' : 'var(--text-soft)', on: k === 'image' ? () => this.agImage() : () => this.setAg({ cover: k }) }; }),
      agCoverHint: ag.cover === 'image' && ag.img ? ag.imgName + ' · portrait 600×900 looks best' : ag.cover === 'exe' ? "The .exe's own icon on a generated background." : "A gradient card with the game's initials.",
      agPrevBg: this.cardBg(tmp), agPrevNoArt: !tmp.img, agPrevExe: !tmp.img && ag.cover === 'exe', agPrevIniChip: !tmp.img && ag.cover !== 'exe', agPrevIni: iniOf(tmp), agPrevName: nmx,
      agSaveBg: can ? 'var(--btn-bg)' : 'var(--btn-dis)', onAgSave: () => this.agSave(), onAgCancel: () => this.setState({ ag: null }), imgRef: this.imgRef, onImgFile: () => {},
    };
  }

  drawerVals(running) {
    const S = this.state, d = this.find(S.drawerId), cfg = S.settings;
    if (!d) return { drawerOn: false };
    const f = S.fetching[d.id], ld = i => f !== undefined && f <= i, L = d.linked, st = d.stats || null, ac = (st && st.acct) || null, c = (st && st.cs2) || null, p = d.pub || null;
    const dCanSw = !(d.current && running), g = this.launchOf(d);
    const tradeC = p && p.trade === 'banned' ? BAD : p && p.trade === 'probation' ? WARN : OK;
    const hasCs2Tab = !(L && st && !c && st.cs2Note === 'not-played');
    const tabsDef = [['overview', 'Overview', false], ...(hasCs2Tab ? [['cs2', 'CS2', !L]] : []), ['games', 'Games' + (L && st ? ' · ' + st.games.length : ''), !L]];
    const tab = tabsDef.some(t => t[0] === S.tab) ? S.tab : 'overview';
    const updatedAt = L ? d.statsAt : d.pubAt;
    const games = st ? st.games.slice().sort(S.gSort === 'name' ? (x, y) => x.n.localeCompare(y.n) : S.gSort === 'recent' ? (x, y) => y.w - x.w || y.h - x.h : (x, y) => y.h - x.h) : [];
    const maxH = Math.max(1, ...games.map(x => x.h)), totH = games.reduce((s, x) => s + x.h, 0);
    const vac = new Set((ac && ac.vacGames) || []);
    const cd = c && c.cd && c.cd.until > Date.now() ? c.cd : null;
    const seg = (cur, k, l, on) => ({ label: l, bg: cur === k ? 'rgba(var(--fg-rgb),.1)' : 'transparent', fg: cur === k ? 'var(--text)' : 'var(--text-subtle)', on });
    const dash = '—';
    const instSteam = S.lib.filter(x => x.steam && x.installed);
    const gameIc = x => { const lg = S.lib.find(y => y.steam && String(y.appid) === String(x.appid)); const base = G(GAMECOL[hash(x.appid || x.n) % GAMECOL.length], '#111'); return x.icon ? 'url("' + x.icon + '") center/cover no-repeat,' + base : lg ? this.cardBg(lg) : base; };
    const xpMax = c && c.xpMax ? c.xpMax : 1;
    return {
      drawerOn: true, onDrawerClose: () => this.setState({ drawerId: null }),
      dName: d.name, dLogin: d.login, dIni: d.ini, dLast: d.last, dSid: d.sid,
      dBg: 'radial-gradient(120% 120% at 10% 0%,rgba(var(--fg-rgb),.22),transparent 55%),' + d.grad,
      dHasAv: !!d.avatar, dAvBg: d.avatar ? 'url("' + d.avatar + '") center/cover no-repeat,#111' : 'rgba(0,0,0,.28)',
      dCur: d.current, dCurLabel: running ? 'CURRENT' : 'AUTO-LOGIN', dStText: stText(p), dStDot: ST[stKey(p)],
      dLinked: L, dNotLinked: !L,
      dCanSwitch: dCanSw, dSignedIn: !dCanSw, dSwLabel: d.current ? 'Start Steam' : 'Switch', dSwSub: g ? 'then ' + g : 'no game after',
      onDSwitch: () => this.switchTo(d.id),
      dPinFg: d.pinned ? '#fbbf24' : '#fff', dPinFill: d.pinned ? '#fbbf24' : 'none', dPinTitle: d.pinned ? 'Unpin' : 'Pin', onDPin: () => this.mut(d.id, { pinned: !d.pinned }),
      dUrl: 'https://steamcommunity.com/profiles/' + d.sid,
      dFetching: f !== undefined, dIdle: f === undefined,
      dUpd: f !== undefined ? 'Updating… ' + (f + 1) + '/' + (L ? 4 : 1) : (updatedAt ? 'Updated ' + rel(updatedAt) : 'Never updated'),
      onDRefresh: () => this.fetchStats(d.id), onDLink: () => this.openLink(d.id), onDUnlink: () => this.setState({ unlinkId: d.id }),
      tabs: tabsDef.map(([k, l, lock]) => ({ label: l, lock, fg: tab === k ? 'var(--text)' : 'var(--text-subtle)', bd: tab === k ? 'var(--accent)' : 'transparent', on: () => this.setState({ tab: k }) })),
      tabOv: tab === 'overview', tabCs: tab === 'cs2', tabGm: tab === 'games',
      pubRows: [
        this.row('Online status', stText(p), !p || p.st === 'offline' ? NEU : p.st === 'away' ? WARN : OK, false, ld(0)),
        this.row('Profile visibility', !p ? dash : p.priv ? 'Private' : 'Public', !p ? NEU : p.priv ? WARN : OK, false, ld(0)),
        this.row('VAC ban', !p ? dash : p.vac ? 'Yes' : 'No', !p ? NEU : p.vac ? BAD : OK, false, ld(0)),
        this.row('Trade ban', !p ? dash : p.trade === 'none' ? 'None' : p.trade === 'banned' ? 'Banned' : 'Probation', !p ? NEU : tradeC, false, ld(0)),
        this.row('Limited account', !p ? dash : p.lim ? 'Yes' : 'No', !p ? NEU : p.lim ? WARN : OK, false, ld(0)),
        this.row('Member since', (p && p.since) || dash, null, true, ld(0)),
      ],
      acctRows: [
        this.row('Steam level', ac && ac.level != null ? String(ac.level) : dash, null, true, ld(1)),
        this.row('Wallet balance', (ac && ac.wallet) || dash, null, true, ld(1)),
        this.row('Games owned', st ? fmt(st.games.length) : dash, null, true, ld(1)),
        this.row('Friends', ac && ac.friends != null ? fmt(ac.friends) : dash, null, true, ld(1)),
        this.row('CS2 Prime', !ac || ac.prime == null ? 'Unknown' : ac.prime ? 'Prime' : 'Not Prime', ac && ac.prime ? OK : NEU, false, ld(1)),
        this.row('VAC bans', ac && ac.vacCount ? (ac.vacGames.length ? 'VAC banned in: ' + ac.vacGames.map(shortName).join(', ') : ac.vacCount + ' ban' + (ac.vacCount === 1 ? '' : 's')) : 'None', ac && ac.vacCount ? BAD : OK, false, ld(1)),
        this.row('Community ban', ac && ac.communityBanned ? 'Yes' : 'No', ac && ac.communityBanned ? BAD : OK, false, ld(1)),
      ],
      pcRows: [
        this.row('Login name', d.login, null, true),
        this.row('SteamID64', d.sid, null, true),
        this.row('Auto-login account', d.current ? 'Yes' : 'No', d.current ? OK : NEU),
        this.row('Avatar source', d.avatarSrc === 'local' ? 'Steam local cache' : d.avatarSrc === 'profile' ? 'Public profile' : 'Generated', null, true),
      ],
      launchOpts: [['default', 'Default', this.defGameName() ? shortName(this.defGameName()) : 'nothing', null], ['none', 'Nothing', '', null], ...instSteam.map(x => [String(x.appid), x.name, '', x])].map(([k, l, sub, game]) => {
        const act = (d.launch || 'default') === k;
        return { label: l, sub, hasSub: !!sub, isG: !!game, ini: game ? shortName(l).slice(0, 4) : '', icBg: game ? this.cardBg(game) : '', bg: act ? 'rgba(var(--accent-rgb),.12)' : 'rgba(var(--fg-rgb),.02)', bd: act ? 'rgba(var(--accent-rgb),.55)' : 'rgba(var(--fg-rgb),.09)', fg: act ? 'var(--text-soft)' : 'var(--text-muted)', act, on: () => { this.mut(d.id, { launch: k }); this.setState({ dLaunchMenu: false }); } };
      }),
      dLaunchNow: g ? 'Launches ' + g + ' after switching' : 'Only signs in, no game launches',
      dTagOpts: [...KNOWN, ...d.tags.filter(t => !KNOWN.includes(t))].map(t => { const act = d.tags.includes(t), cc = tc(t); return { label: t, mark: act ? '✓' : '+', bg: act ? cc[0] : 'transparent', fg: act ? cc[1] : 'var(--text-subtle)', bd: act ? cc[2] : 'rgba(var(--fg-rgb),.18)', bs: act ? 'solid' : 'dashed', on: () => this.mut(d.id, x => ({ tags: (x.tags || []).includes(t) ? x.tags.filter(y => y !== t) : [...(x.tags || []), t] })) }; }),
      dNote: d.note, dNoteCount: d.note.length + ' / 140', onDNote: e => this.editNote(d.id, e.target.value),
      acctLoading: L && ld(1), acctReady: L,
      csLoading: L && ld(3), csReady: L && !ld(3) && !!c, gmLoading: L && ld(2), gmReady: L && !ld(2) && !!st,
      csEmpty: L && !ld(3) && !c, csEmptyTitle: st && st.cs2Note === 'in-game' ? 'In a game right now' : 'No CS2 stats yet',
      csEmptyText: st && st.cs2Note === 'in-game' ? 'This account is playing on another session. Asking CS2 would kick it, so SwapDeck waits. Refresh when you are out of the game.' : 'Hit "Refresh stats" to ask CS2\'s servers for ranks, level and medals.',
      gmEmpty: L && !ld(2) && !st, gmEmptyTitle: 'No game list yet', gmEmptyText: 'Hit "Refresh stats" to load owned games and hours.',
      cdOn: !!cd, cdOff: !cd, cdKind: cd ? cd.kind : '', cdReason: cd ? cd.reason : '', cdLeft: cd ? left(cd.until) : '',
      prText: !c || c.premier == null ? 'Unrated' : fmt(c.premier), prFg: tier(c && c.premier), prBg: hexA(tier(c && c.premier), .1), prBd: hexA(tier(c && c.premier), .4),
      prWins: !c ? '' : c.premier == null ? (c.vacBanned ? 'Account is VAC banned' : 'Win 10 Premier matches for a rating') : c.premierWins + ' wins',
      dGames: S.lib.filter(x => x.steam && x.acct === d.id).map(x => ({ name: x.name, bg: this.cardBg(x), iniTxt: this.coverOf(x) ? '' : iniOf(x), hasMon: !!x.display.mon, on: () => this.setState({ gd: x.id, drawerId: null }) })),
      dHasGames: S.lib.some(x => x.steam && x.acct === d.id), dNoGames: !S.lib.some(x => x.steam && x.acct === d.id),
      ...(() => {
        const log = S.playLog[d.sid] || {}, rows = Object.entries(log).map(([gid, e]) => ({ g: S.lib.find(x => x.id === gid), e })).filter(r => r.g && r.e.ms > 0).sort((x, y) => y.e.ms - x.e.ms);
        const tot = rows.reduce((t, r) => t + r.e.ms, 0), hrs = ms => (ms / 3600000).toFixed(1) + ' h';
        return { dPlayOn: rows.length > 0, dPlayTotal: hrs(tot) + ' total', dPlay: rows.map(r => ({ name: r.g.name, bg: this.cardBg(r.g), h: hrs(r.e.ms), sub: r.e.n + ' session' + (r.e.n === 1 ? '' : 's') + ' · last ' + rel(r.e.last) })) };
      })(),
      onDManageLib: () => this.setState({ drawerId: null, view: 'lib', lq: '', lf: 'all' }),
      dAdvOpen: S.dAdv, dAdvRot: S.dAdv ? 'rotate(180deg)' : 'none', onDAdv: () => this.setState(s => ({ dAdv: !s.dAdv })),
      dLaunchMenu: S.dLaunchMenu, onDLaunchMenu: () => this.setState(s => ({ dLaunchMenu: !s.dLaunchMenu })), dLaunchBd: S.dLaunchMenu ? 'rgba(var(--accent-rgb),.55)' : 'rgba(var(--fg-rgb),.12)',
      dLaunchLbl: !d.launch || d.launch === 'default' ? 'Default (' + (this.defGameName() || 'nothing') + ')' : d.launch === 'none' ? 'Nothing' : (this.gameName(d.launch) || 'App ' + d.launch),
      dPwSaved: !!(L && d.hasCredentials), dNoPw: !(L && d.hasCredentials), onDForgetPw: () => this.forgetPassword(d.id),
      ranks: [['Competitive', c && c.comp], ['Wingman', c && c.wing]].map(([l, r]) => { const i = r ? r.i : 0, name = r ? r.name : 'Unranked', col = rankCol(i); return { label: l.toUpperCase(), name, ab: r && i ? abbr(name) : '—', col, artBg: G(col, '#1f2937'), wins: r ? r.wins + ' wins' : 'No ranked wins yet' }; }),
      lvl: c ? c.level : 0, lvlNext: c ? c.level + 1 : 1, xpText: c ? fmt(c.xp) + ' / ' + fmt(c.xpMax) + ' XP' : '', xpLeft: c ? fmt(c.xpMax - c.xp) + ' XP to level ' + (c.level + 1) : '', xpPct: c ? Math.round(c.xp / xpMax * 100) + '%' : '0%',
      coms: [['Friendly', c ? c.com.f : 0], ['Teacher', c ? c.com.t : 0], ['Leader', c ? c.com.l : 0]].map(([l, n]) => ({ label: l, n: fmt(n), isF: l === 'Friendly', isT: l === 'Teacher', isL: l === 'Leader' })),
      medals: ((c && c.medals) || []).map(m => { const col = GAMECOL[hash(m.name) % GAMECOL.length]; return m.icon ? { name: m.name, ab: '', bg: 'url("' + m.icon + '") center/contain no-repeat', bd: 'transparent' } : { name: m.name, ab: abbr(m.name), bg: 'radial-gradient(circle at 35% 30%,' + hexA(col, .95) + ',' + hexA(col, .35) + ' 60%,rgba(0,0,0,.4))', bd: hexA(col, .6) }; }),
      medalCount: c && c.medals ? c.medals.length + ' in inventory' : 'Inventory unavailable',
      banHas: !!(ac && (ac.vacCount > 0 || ac.communityBanned)), banNone: !(ac && (ac.vacCount > 0 || ac.communityBanned)),
      banVac: ac && ac.vacCount ? (ac.vacGames.length ? 'VAC banned in: ' + ac.vacGames.join(', ') : ac.vacCount + ' VAC ban' + (ac.vacCount === 1 ? '' : 's')) : 'No VAC bans',
      banGame: ac && ac.communityBanned ? 'Community banned' : 'No community ban',
      gSorts: [['hours', 'Hours'], ['recent', 'Last 2 weeks'], ['name', 'Name']].map(([k, l]) => seg(S.gSort, k, l, () => this.setState({ gSort: k }))),
      gSummary: games.length + ' games · ' + fmt(Math.round(totH)) + ' h total',
      gameRows: games.map(x => ({ n: x.n, ab: x.icon ? '' : shortName(x.n).slice(0, 4), icBg: gameIc(x), h: fmt(x.h) + ' h', w: x.w ? fmt(x.w) + ' h' : '—', wFg: x.w ? 'var(--ok-fg)' : 'var(--text-subtle)', pct: Math.max(2, Math.round(x.h / maxH * 100)) + '%', banned: vac.has(x.n) })),
      onDForget: () => this.setState({ confirmId: d.id }),
      tagDraft: S.tagDraft, onTagDraft: e => this.setState({ tagDraft: e.target.value }),
      onTagKey: e => { if (e.key !== 'Enter') return; const t = S.tagDraft.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 16); if (t && !d.tags.includes(t)) this.mut(d.id, { tags: [...d.tags, t] }); this.setState({ tagDraft: '' }); },
    };
  }
  row(label, val, c, plain, loading) { return { label, val, bg: c ? c[0] : '', fg: c ? c[1] : '', bd: c ? c[2] : '', loading: !!loading, chip: !loading && !plain, plain: !loading && !!plain }; }

  linkVals() {
    const Lk = this.state.link, lkAcc = Lk ? this.find(Lk.id) : null, step = Lk && Lk.step;
    const is = k => !!Lk && step === k;
    return {
      linkOn: !!Lk, lkName: lkAcc ? lkAcc.name : '', lkCanClose: !!Lk && step !== 'working', onLkClose: () => this.closeLink(),
      lkChoose: is('choose'), lkQR: is('qr'), lkScanned: is('scanned'), lkPW: is('pw'), lkGuard: is('guard'),
      lkToken: is('token'), lkApprove: is('approve'), lkWorking: is('working'), lkOk: is('ok'), lkFail: is('fail'), lkWork: Lk ? Lk.work : '', lkErr: Lk ? Lk.err : '',
      lkBack: !!Lk && ['qr', 'scanned', 'pw', 'guard', 'fail', 'token', 'approve'].includes(step), onLkBack: () => this.toChoose(),
      qrPath: Lk && Lk.qr ? Lk.qr.path : '', qrBox: Lk && Lk.qr ? '0 0 ' + Lk.qr.size + ' ' + Lk.qr.size : '0 0 29 29',
      onLkQR: () => this.linkQR(), onLkPWStart: () => this.setLink({ step: 'pw' }), onLkTokenStart: () => this.setLink({ step: 'token', tok: '' }),
      lkTok: Lk ? Lk.tok || '' : '', onLkTok: e => this.setLink({ tok: e.target.value.trim() }), lkTokBg: Lk && (Lk.tok || '').length > 20 ? 'var(--btn-bg)' : 'var(--btn-dis)', onLkUseTok: () => this.linkTok(),
      lkRemBg: Lk && Lk.remember ? 'var(--accent)' : 'transparent', lkRemBd: Lk && Lk.remember ? 'var(--accent)' : 'rgba(var(--fg-rgb),.3)', onLkRem: () => this.setLink({ remember: !(Lk && Lk.remember) }),
      lkGErr: !!(Lk && Lk.gErr), lkGErrText: Lk && Lk.gErr ? Lk.gErr : '', onLkApprove: () => {},
      lkLogin: Lk ? Lk.login : '', lkPw: Lk ? Lk.pw : '', onLkLogin: e => this.setLink({ login: e.target.value }), onLkPwIn: e => this.setLink({ pw: e.target.value }),
      onLkPwKey: e => { if (e.key === 'Enter') this.linkPW(); }, onLkSignIn: () => this.linkPW(),
      lkCode: Lk ? Lk.code : '', onLkCode: e => this.setLink({ code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5), gErr: null }), onLkCodeKey: e => { if (e.key === 'Enter') this.linkGuard(); }, onLkVerify: () => this.linkGuard(),
      lkGuardText: Lk && Lk.guard === 'email' ? 'Enter the code Steam emailed to your ' + (Lk.detail ? '@' + Lk.detail + ' ' : '') + 'address.' + (Lk.canConfirm ? ' Or approve the sign-in in the Steam Mobile app.' : '') : 'Enter the code shown in the Steam Mobile app (Steam Guard).' + (Lk && Lk.canConfirm ? ' Or just approve the sign-in there.' : ''),
      lkGuardSwap: '', onLkGuardSwap: () => {},
      lkSignInBg: Lk && Lk.login && Lk.pw ? 'var(--btn-bg)' : 'var(--btn-dis)', lkVerifyBg: Lk && Lk.code.length === 5 ? 'var(--btn-bg)' : 'var(--btn-dis)',
      onLkDone: () => this.setState({ link: null, tab: 'cs2' }), onLkRetry: () => this.toChoose(),
    };
  }

  baseVals() {
    const S = this.state, accts = this.accts, steam = this.steamState, running = steam === 'running', cfg = S.settings;
    const vis = this.visible(), selId = this.selId();
    const cur = accts.find(a => a.current), nf = steam === 'not-found', has = accts.length > 0, busy = S.steam.busy;
    const allTags = [...KNOWN.filter(t => accts.some(a => a.tags.includes(t))), ...[...new Set(accts.flatMap(a => a.tags))].filter(t => !KNOWN.includes(t))];
    const tagFilters = [{ label: 'All', n: accts.length, act: !S.tagF, key: null }, ...allTags.map(t => ({ label: t, n: accts.filter(a => a.tags.includes(t)).length, act: S.tagF === t, key: t }))].map(f => {
      const c = f.key ? tc(f.key) : ['rgba(var(--fg-rgb),.1)', 'var(--text)', 'rgba(var(--fg-rgb),.3)'];
      return { label: f.label, n: f.n, bg: f.act ? c[0] : 'transparent', fg: f.act ? c[1] : 'var(--text-muted)', bd: f.act ? c[2] : 'rgba(var(--fg-rgb),.13)', on: () => this.setState({ tagF: f.act ? null : f.key, hover: null }) };
    });
    const seg = (curK, k, l, on) => ({ label: l, bg: curK === k ? 'rgba(var(--fg-rgb),.1)' : 'transparent', fg: curK === k ? 'var(--text)' : 'var(--text-subtle)', on });
    const sorts = [['pinned', 'Pinned first'], ['recent', 'Last used'], ['name', 'Name']].map(([k, l]) => seg(S.sort, k, l, () => this.setState({ sort: k })));
    const idx = vis.findIndex(a => a.id === selId);
    const sw = S.sw;
    const swSteps = sw ? sw.steps.map((l, i) => ({ label: l, done: i < sw.step, active: i === sw.step, todo: i > sw.step, color: i < sw.step ? 'var(--ok-fg)' : i === sw.step ? 'var(--text)' : 'var(--text-subtle)' })) : [];
    const confirmAcc = this.find(S.confirmId), unlinkAcc = this.find(S.unlinkId);
    const onBg = 'linear-gradient(90deg,var(--accent),var(--accent-2))', offBg = 'rgba(var(--fg-rgb),.16)';
    return {
      tbDot: nf ? '#f87171' : sw || busy ? 'var(--accent)' : running ? '#4ade80' : 'var(--text-subtle)',
      tbText: nf ? 'steam not found' : sw ? 'switching → ' + sw.name : busy ? (busy === 'closing' ? 'closing steam…' : 'starting steam…') : running ? (cur ? cur.name : 'steam running') : 'steam closed',
      stRun: running && !busy, stClosed: steam === 'closed' && !busy, stNF: nf, stBusy: !!busy && !nf,
      stLabel: cur ? 'Signed in as' : 'Steam running', stName: cur ? cur.name : '', stSub: cur ? '· next start signs in as ' + cur.name : '',
      stBusyText: busy === 'closing' ? 'Closing Steam…' : 'Starting Steam…',
      showClose: running && !busy, showStart: steam === 'closed' && !busy,
      onCloseSteam: () => this.closeSteam(), onStartSteam: () => this.startSteam(), onAdd: () => this.addAcc(), onSetOpen: () => this.openSettings(),
      showToolbar: !nf && has, searchRef: this.searchRef, q: S.q, onQ: e => this.setState({ q: e.target.value, hover: null }), tagFilters, sorts,
      showGallery: !nf && has && vis.length > 0, galRef: this.galRef, onGalLeave: () => this.setState({ hover: null }),
      showNoResults: !nf && has && vis.length === 0, nrTitle: S.q.trim() ? 'No accounts match "' + S.q.trim() + '"' : 'No accounts tagged ' + (S.tagF || ''),
      onClearFilters: () => this.setState({ q: '', tagF: null }), showEmpty: !nf && !has,
      retrying: S.retrying, notRetrying: !S.retrying, onRetry: () => this.retry(), onBrowse: () => this.browse(),
      counter: (idx + 1) + ' / ' + vis.length, onPrev: () => this.step(-1), onNext: () => this.step(1),
      swOn: !!sw, swName: sw ? sw.name : '', swIni: sw ? sw.ini : '', swBg: sw ? (sw.avatar ? 'url("' + sw.avatar + '") center/cover' : 'radial-gradient(120% 90% at 20% 0%,rgba(var(--fg-rgb),.25),transparent 60%),' + sw.grad) : '',
      swText: sw ? sw.steps[sw.step] || '' : '', swPct: sw ? Math.round(((sw.step + 1) / sw.steps.length) * 100) + '%' : '0%', swSteps,
      swMeta: sw ? 'steam.exe ' + (cfg.steamArgs || '') + (sw.game ? ' · then ' + sw.game : '') : '',
      confirmOn: !!confirmAcc, confirmName: confirmAcc ? confirmAcc.name : '', confirmWarn: !!(confirmAcc && confirmAcc.current && running), confirmRunning: running,
      onConfirmNo: () => this.setState({ confirmId: null }), onConfirmYes: () => this.forget(),
      unlinkOn: !!unlinkAcc, unlinkName: unlinkAcc ? unlinkAcc.name : '', onUnlinkNo: () => this.setState({ unlinkId: null }), onUnlinkYes: () => this.unlink(),
      setOpen: S.setOpen, onSetClose: () => this.setState({ setOpen: false, rp: null }), stop: e => e.stopPropagation(),
      clBg: cfg.closeAfter ? onBg : offBg, clX: cfg.closeAfter ? 'translateX(18px)' : 'translateX(0px)', onCl: () => this.setCfg({ closeAfter: !cfg.closeAfter }),
      cfgOpts: cfg.steamArgs || '', onOpts: e => { const v = e.target.value; this.setState(s => ({ settings: { ...s.settings, steamArgs: v } })); clearTimeout(this._argT); this._argT = setTimeout(() => api.setSettings({ steamArgs: v }), 400); },
      pathText: nf ? 'Not found — browse to steam.exe' : S.steam.exe || '', pathFg: nf ? 'var(--bad-fg)' : 'var(--text-soft)', pathBd: nf ? 'rgba(248,113,113,.4)' : 'rgba(var(--fg-rgb),.1)',
      addOpen: S.addOpen, onAddCancel: () => this.cancelAdd(),
      toasts: S.toasts.map(t => ({ title: t.title, msg: t.msg, fg: TOAST[t.type][0], bd: TOAST[t.type][1], isOk: t.type === 'success', isInfo: t.type === 'info', isWarn: t.type === 'warning', isErr: t.type === 'error', hasAction: !!t.action, actionLabel: t.action ? t.action.label : '', onAction: () => { this.dismiss(t.id); if (t.action) t.action.fn(); }, onClose: () => this.dismiss(t.id) })),
    };
  }

  renderVals() {
    const S = this.state;
    LIGHT = (S.settings.base || 'dark') === 'light';
    const running = this.steamState === 'running', isLib = S.view === 'lib';
    const b = this.baseVals(), lv = this.launchVals(b), nm = this.normMon(), tm = this.testMon();
    const vt = (k, label, n) => { const on = S.view === k; return { label, n, isAcc: k === 'acc', isLib: k === 'lib', bg: on ? 'rgba(var(--fg-rgb),.1)' : 'transparent', fg: on ? 'var(--text)' : 'var(--text-subtle)', nFg: on ? 'var(--text-muted)' : 'var(--text-subtle)', on: () => this.setView(k) }; };
    const rmG = S.rmId ? this.gfind(S.rmId) : null;
    const dv = displayVals(
      { monitors: S.monitors, settings: S.settings, monPos: S.monPos, session: S.launch },
      { applying: S.disp.applying, err: S.disp.err },
      { setNormal: p => this.setCfg(p), apply: () => this.applyNormal() },
    );
    return {
      ...b, ...this.tileVals(), ...this.drawerVals(running), ...this.linkVals(), ...this.libraryVals(), ...this.gameVals(), ...lv, ...this.addGameVals(),
      ...this.settingsVals(), ...this.themeVals(), ...dv,
      // Tag rows scroll sideways with the normal mouse wheel.
      onChipWheel: e => { const el = e.currentTarget; if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && el.scrollWidth > el.clientWidth) { e.preventDefault(); chipScroll(el, e.deltaY); } },
      chipRef: this.chipRef, onChipScroll: e => chipFade(e.currentTarget),
      tbText: lv.tbText || b.tbText, tbDot: lv.tbDot || b.tbDot,
      isLib, isAcc: !isLib, showClose: b.showClose && !S.launch,
      showToolbar: b.showToolbar && !isLib, showGallery: b.showGallery && !isLib && !this.gallery, showPanels: b.showGallery && !isLib && this.gallery,
      panelsEl: b.showGallery && !isLib && this.gallery ? galleryEl(this, this.tileVals().tiles, this.accts, this.selId()) : null, libGridRef: this.libGridRef, showAcctLoading: false, showNoResults: b.showNoResults && !isLib, showEmpty: b.showEmpty && !isLib, stNFPanel: b.stNF && !isLib,
      viewTabs: [vt('acc', 'Accounts', this.accts.length), vt('lib', 'Library', S.lib.length)],
      onGRunOpen: () => this.setState(s => ({ launch: s.launch && { ...s.launch, hidden: false } })), onGStop: e => { e.stopPropagation(); this.stopGame(); },
      rmOn: !!rmG, rmName: rmG ? rmG.name : '', onRmNo: () => this.setState({ rmId: null }), onRmYes: () => this.removeGame(),
      dTestName: tm ? tm.label : 'another monitor', dTestIdle: !S.disp.testing && !!tm, dTesting: !!S.disp.testing, onDTest: () => this.testDisp(), onRestoreNow: () => this.restoreNow(),
      rootRef: this.rootRef, onWin: a => api.win(a), verShort: 'v' + (S.version || ''),
      _nm: nm,
    };
  }

  render() {
    if (!this.state.loaded) return html`<div style="height:100vh;display:grid;place-items:center"><span class="spinner" style="width:26px;height:26px;border-width:3px"></span></div>`;
    return view(this.renderVals());
  }
}

render(html`<${App} />`, document.getElementById('root'));

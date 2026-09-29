import { html, render, Component } from './vendor/htm-preact.js';

const api = window.api;

// ---------- palette & helpers (from the design) ----------

const TAGC = {
  fps: ['rgba(34,211,238,.14)', '#67e8f9', 'rgba(34,211,238,.45)'],
  racing: ['rgba(251,191,36,.14)', '#fcd34d', 'rgba(251,191,36,.45)'],
  horror: ['rgba(248,113,113,.16)', '#fca5a5', 'rgba(248,113,113,.5)'],
};
const KNOWN = ['fps', 'racing', 'horror'];
const CUSTOM = [
  ['rgba(45,212,191,.14)', '#5eead4', 'rgba(45,212,191,.45)'],
  ['rgba(167,139,250,.14)', '#c4b5fd', 'rgba(167,139,250,.45)'],
  ['rgba(96,165,250,.14)', '#93c5fd', 'rgba(96,165,250,.45)'],
  ['rgba(244,114,182,.14)', '#f9a8d4', 'rgba(244,114,182,.45)'],
  ['rgba(163,230,53,.14)', '#bef264', 'rgba(163,230,53,.45)'],
];
const NEU = ['rgba(255,255,255,.07)', '#d4d4d8', 'rgba(255,255,255,.22)'];
const OK = ['rgba(74,222,128,.12)', '#86efac', 'rgba(74,222,128,.38)'];
const BAD = ['rgba(248,113,113,.14)', '#fca5a5', 'rgba(248,113,113,.45)'];
const WARN = ['rgba(251,191,36,.12)', '#fcd34d', 'rgba(251,191,36,.4)'];
const TOAST = { success: ['#4ade80', 'rgba(74,222,128,.35)'], info: ['#67e8f9', 'rgba(34,211,238,.35)'], warning: ['#fbbf24', 'rgba(251,191,36,.4)'], error: ['#f87171', 'rgba(248,113,113,.45)'] };
const G = (a, b) => 'linear-gradient(150deg,' + a + ',' + b + ')';
const GRADS = [G('#22d3ee', '#4f46e5'), G('#2dd4bf', '#0f766e'), G('#a78bfa', '#6d28d9'), G('#94a3b8', '#334155'), G('#fbbf24', '#b45309'), G('#60a5fa', '#1e3a8a'), G('#34d399', '#065f46'), G('#f472b6', '#9d174d'), G('#fb923c', '#9a3412'), G('#f87171', '#7f1d1d'), G('#a3e635', '#3f6212')];
const GAMECOL = ['#f59e0b', '#ef4444', '#f97316', '#b45309', '#a855f7', '#eab308', '#3b82f6', '#22c55e', '#dc2626', '#84cc16', '#0ea5e9', '#06b6d4', '#fb923c'];
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
const tc = t => TAGC[t] || CUSTOM[hash(t) % CUSTOM.length];
const hexA = (h, a) => { const n = parseInt(h.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; };
const fmt = n => Number(n).toLocaleString('en-US');
const abbr = n => n.replace(/[^A-Za-z0-9 ]/g, '').split(/\s+/).filter(Boolean).slice(0, 3).map(w => /^\d+$/.test(w) ? w.slice(-2) : w[0]).join('').toUpperCase() || '?';
const initials = name => {
  const parts = name.replace(/([a-z])([A-Z])/g, '$1 $2').split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0] || name || '?').slice(0, 2).toUpperCase();
};
const SHORT = { 'Counter-Strike 2': 'CS2', "Baldur's Gate 3": 'BG3', 'Deep Rock Galactic': 'DRG', 'Rocket League': 'RL', 'Apex Legends': 'Apex', 'Assetto Corsa Competizione': 'ACC', 'Assetto Corsa': 'AC', 'iRacing': 'iRacing', 'Automobilista 2': 'AMS2', 'Phasmophobia': 'Phasmo', 'Lethal Company': 'Lethal', 'Dead by Daylight': 'DBD' };
const shortName = n => SHORT[n] || (n.length <= 12 ? n : abbr(n));
const rankCol = i => i < 1 ? '#94a3b8' : i < 7 ? '#94a3b8' : i < 11 ? '#fbbf24' : i < 15 ? '#60a5fa' : i < 18 ? '#a78bfa' : '#f472b6';
const tier = r => r == null ? '#8d8d98' : r < 5000 ? '#b0c3d9' : r < 10000 ? '#8cc6ff' : r < 15000 ? '#6a7dff' : r < 20000 ? '#c166ff' : r < 25000 ? '#f03cff' : r < 30000 ? '#eb4b4b' : '#fed700';
const ST = { ingame: '#4ade80', online: '#38bdf8', away: '#fbbf24', offline: '#71717a', unknown: '#52525b' };
const stText = p => !p ? 'Status unknown' : p.st === 'ingame' ? 'In-Game: ' + p.game : p.st === 'online' ? 'Online' : p.st === 'away' ? 'Away' : 'Offline';
const W_EXP = 340, W_COL = 104;

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

// ---------- icons ----------

const I = {
  min: html`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14"/></svg>`,
  max: html`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="4"/></svg>`,
  x: (s = 12, w = 2.4) => html`<svg width=${s} height=${s} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width=${w} stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
  power: html`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/></svg>`,
  play: html`<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>`,
  userPlus: (s = 14) => html`<svg width=${s} height=${s} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/></svg>`,
  gear: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,
  search: (s = 14, c = '#7c7c88', st = '') => html`<svg width=${s} height=${s} viewBox="0 0 24 24" fill="none" stroke=${c} stroke-width="2" stroke-linecap="round" style=${st}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
  link: (s, c, w) => html`<svg width=${s} height=${s} viewBox="0 0 24 24" fill="none" stroke=${c} stroke-width=${w} stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  star: (s, fill, stroke = 'currentColor', w = 1.8) => html`<svg width=${s} height=${s} viewBox="0 0 24 24" fill=${fill} stroke=${stroke} stroke-width=${w} stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  clock: (s, w = 2) => html`<svg width=${s} height=${s} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width=${w} stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  lock: (s, w = 2) => html`<svg width=${s} height=${s} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width=${w} stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  arrow: (s = 14) => html`<svg width=${s} height=${s} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,
  check: (s, c, w) => html`<svg width=${s} height=${s} viewBox="0 0 24 24" fill="none" stroke=${c} stroke-width=${w} stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
  plus: html`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>`,
  warn: (s, w = 2) => html`<svg width=${s} height=${s} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width=${w} stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
  chevL: html`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`,
  chevR: html`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`,
  ext: html`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>`,
  refresh: html`<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>`,
  trash: (s) => html`<svg width=${s} height=${s} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`,
  qr: html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0a0a0c" stroke-width="2.2" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM18 18h3v3h-3z"/></svg>`,
  shield: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>`,
  phone: html`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg>`,
  smile: html`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01"/><path d="M15 9h.01"/></svg>`,
  book: html`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
  crown: html`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/><path d="M5 21h14"/></svg>`,
  okCircle: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`,
  info: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
  errCircle: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>`,
};

const Spin = (s, border = 2, extra = '') => html`<span class="spinner" style=${`width:${s}px;height:${s}px;border-width:${border}px;${extra}`}></span>`;
const Chip = (val, c) => html`<span style=${`font:600 10.5px 'Geist Mono',monospace;padding:3px 9px;border-radius:99px;background:${c[0]};color:${c[1]};border:1px solid ${c[2]};text-align:right`}>${val}</span>`;
const Toggle = on => html`<span style=${`position:relative;width:40px;height:22px;flex:none;border-radius:99px;background:${on ? 'linear-gradient(90deg,#22d3ee,#6366f1)' : 'rgba(255,255,255,.16)'};transition:background .25s`}><span style=${`position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:99px;background:#fff;transform:${on ? 'translateX(18px)' : 'translateX(0px)'};transition:transform .25s cubic-bezier(.22,1,.36,1)`}></span></span>`;
const stop = e => e.stopPropagation();

// ---------- app ----------

class App extends Component {
  state = {
    loaded: false, steam: { found: true, running: false, activeSid: null, autoLoginUser: '', checked: [] },
    accounts: [], games: [], settings: {}, version: '',
    q: '', tagF: null, sort: 'pinned', sel: null, hover: null, drawerId: null, tab: 'overview', gSort: 'hours',
    fetching: {}, sw: null, toasts: [], confirmId: null, unlinkId: null, setOpen: false, addOpen: false,
    retrying: false, tagDraft: '', link: null, now: Date.now(),
  };
  _t = []; _tid = 0;

  later(ms, fn) { const id = setTimeout(fn, ms); this._t.push(id); return id; }

  async componentDidMount() {
    this._key = e => this.onKey(e);
    window.addEventListener('keydown', this._key);
    this._off = [
      api.on('steam', steam => this.setState({ steam })),
      api.on('accounts', accounts => this.setState({ accounts })),
      api.on('account', a => a && this.replaceAcc(a)),
      api.on('switch', p => this.setState(s => ({ sw: s.sw && s.sw.sid === p.sid ? { ...s.sw, steps: p.steps, step: p.step } : s.sw }))),
      api.on('stats', p => this.setState(s => {
        const f = { ...s.fetching };
        if (p.step == null) delete f[p.sid]; else f[p.sid] = p.step;
        return { fetching: f };
      })),
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
    ];
    this._clock = setInterval(() => this.setState({ now: Date.now() }), 30000);
    await this.reload();
    this.setState({ loaded: true });
    this.later(350, () => this.scrollToSel(this.selId(), 'auto'));
  }
  componentWillUnmount() {
    window.removeEventListener('keydown', this._key);
    this._off.forEach(f => f());
    this._t.forEach(clearTimeout);
    clearInterval(this._clock);
  }

  async reload() {
    const st = await api.state();
    this.setState({ steam: st.steam, accounts: st.accounts, games: st.games, settings: st.settings, version: st.version, zoom: st.zoom, update: st.update });
    return st;
  }

  // ---- derived ----
  get steamState() { const s = this.state.steam; return !s.found ? 'not-found' : s.running ? 'running' : 'closed'; }
  decorate(a) {
    const s = this.state.steam;
    const current = s.running ? a.sid === s.activeSid : !!(s.autoLoginUser && a.login.toLowerCase() === s.autoLoginUser.toLowerCase());
    return { ...a, id: a.sid, ini: initials(a.name), grad: GRADS[hash(a.sid) % GRADS.length], current, last: rel(a.lastUsed), ts: a.lastUsed ? -a.lastUsed : Infinity };
  }
  get accts() { return this.state.accounts.map(a => this.decorate(a)); }
  find(id) { return this.accts.find(x => x.id === id); }
  gameName(appid) { const g = this.state.games.find(x => x.appid === String(appid)); return g ? g.name : null; }
  launchOf(a) {
    const s = this.state.settings;
    if (a.launch === 'none') return null;
    if (a.launch === 'default') return s.launchAfter && s.defaultGame ? (this.gameName(s.defaultGame) || 'App ' + s.defaultGame) : null;
    return this.gameName(a.launch) || 'App ' + a.launch;
  }
  visible() {
    const S = this.state, q = S.q.trim().toLowerCase();
    const v = this.accts.filter(a => (a.name + ' ' + a.login).toLowerCase().includes(q) && (!S.tagF || a.tags.includes(S.tagF)));
    const byT = (x, y) => x.ts - y.ts, byN = (x, y) => x.name.localeCompare(y.name, undefined, { sensitivity: 'base' });
    return v.sort(S.sort === 'name' ? byN : S.sort === 'recent' ? byT : (x, y) => (+y.pinned - +x.pinned) || byT(x, y));
  }
  selId() { const v = this.visible(); if (v.some(a => a.id === this.state.sel)) return this.state.sel; const c = v.find(a => a.current); return c ? c.id : (v[0] && v[0].id); }

  // ---- gallery ----
  galRef = el => {
    if (this._gal === el) return;
    if (this._gal) this._gal.removeEventListener('wheel', this._wheel);
    this._gal = el;
    if (el) el.addEventListener('wheel', this._wheel, { passive: false });
  };
  _wheel = e => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.preventDefault(); this._gal.scrollLeft += e.deltaY; } };
  scrollToSel(id, behavior) {
    const g = this._gal; if (!g || !id) return;
    const el = g.querySelector('[data-pid="' + id + '"]'); if (!el) return;
    g.scrollTo({ left: Math.max(0, el.offsetLeft - (g.clientWidth - W_EXP) / 2), behavior: behavior || 'smooth' });
  }
  select(id, scroll) { this.setState({ sel: id, hover: null }); if (scroll) this.later(40, () => this.scrollToSel(id)); }
  step(d) { const v = this.visible(); if (!v.length) return; const i = v.findIndex(a => a.id === this.selId()); this.select(v[Math.max(0, Math.min(v.length - 1, i + d))].id, true); }

  // ---- toasts ----
  toast(type, title, msg, action) {
    const id = ++this._tid;
    this.setState(s => ({ toasts: [...s.toasts, { id, type, title, msg, action }].slice(-4) }));
    this.later(type === 'error' ? 8000 : 4800, () => this.dismiss(id));
  }
  dismiss(id) { this.setState(s => ({ toasts: s.toasts.filter(t => t.id !== id) })); }

  // ---- data ----
  replaceAcc(a) {
    // Don't let a background refresh clobber a note that's still being typed.
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
  }
  async setCfg(patch) {
    this.setState(s => ({ settings: { ...s.settings, ...patch } }));
    const settings = await api.setSettings(patch);
    this.setState({ settings });
  }

  onKey(e) {
    const S = this.state, tag = (e.target && e.target.tagName || '').toLowerCase(), typing = tag === 'input' || tag === 'textarea' || tag === 'select';
    if (e.key === 'Escape') {
      if (S.link && S.link.step !== 'working') return this.closeLink();
      if (S.confirmId) return this.setState({ confirmId: null });
      if (S.unlinkId) return this.setState({ unlinkId: null });
      if (S.setOpen) return this.setState({ setOpen: false });
      if (S.addOpen) return this.cancelAdd();
      if (S.drawerId) return this.setState({ drawerId: null });
      if (typing) e.target.blur();
      return;
    }
    if (typing || S.sw || S.confirmId || S.unlinkId || S.setOpen || S.addOpen || S.link) return;
    if (e.key === '/') { e.preventDefault(); if (this._search) this._search.focus(); return; }
    if (S.drawerId) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); this.step(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); this.step(-1); }
    else if (e.key === 'Enter') { const id = this.selId(); if (id) this.switchTo(id); }
  }

  // ---- steam actions ----
  busyToast(r) {
    if (r.code === 'NOT_FOUND') { this.toast('error', 'Steam not found', 'Set the Steam location in Settings first.', { label: 'Open settings', fn: () => this.setState({ setOpen: true }) }); return true; }
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
    if (this.steamState === 'not-found') { this.toast('error', 'Steam not found', "Adding an account needs Steam's login window.", { label: 'Open settings', fn: () => this.setState({ setOpen: true }) }); return; }
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
    this.setState({ drawerId: id, tab: 'overview', tagDraft: '' });
    if (a && (!a.pubAt || (a.linked && !a.statsAt))) this.fetchStats(id);
  }
  async fetchStats(id) {
    if (this.state.fetching[id] !== undefined) return;
    this.setState(s => ({ fetching: { ...s.fetching, [id]: 0 } }));
    const r = await api.refreshStats(id);
    if (!r.ok) {
      this.setState(s => { const f = { ...s.fetching }; delete f[id]; return { fetching: f }; });
      return;
    }
    if (r.account) this.replaceAcc(r.account);
    const b = r.account;
    for (const w of r.warnings) this.toast(w.type, w.title, w.msg);
    if (!r.warnings.some(w => w.type === 'error')) {
      this.toast('success', 'Stats updated', (b ? b.name : '') + (b && b.linked ? ' · profile, account, games and CS2' : ' · public profile'));
    }
    if (b && b.pub && b.pub.priv) this.toast('warning', 'Profile is private', 'Online status and bans may be out of date.' + (b.linked ? '' : ' Link the account to see everything.'));
  }
  async forget() {
    const id = this.state.confirmId, a = this.find(id);
    this.setState({ confirmId: null, drawerId: null, sel: null });
    const r = await api.forget(id);
    if (!r.ok) { if (!this.busyToast(r)) this.toast('error', "Couldn't forget account", r.error); return; }
    await this.reload();
    this.toast('info', 'Forgot ' + (a ? a.name : 'account'), "Removed from Steam's saved logins on this PC." + (r.restarted ? ' Steam restarted.' : ''));
  }
  async unlink() {
    const id = this.state.unlinkId, a = this.find(id);
    this.setState({ unlinkId: null, tab: 'overview' });
    const res = await api.unlink(id);
    if (res) this.replaceAcc(res);
    this.toast('info', 'Unlinked ' + (a ? a.name : ''), 'Stats removed. Switching and the public profile still work.');
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
    if (!st.steam.found) this.toast('error', 'Still no Steam', 'Checked the registry and default install folders.', { label: 'Browse…', fn: () => this.browse() });
    else this.toast('success', 'Steam found', 'Using ' + st.steam.exe);
  }

  // ---- linking ----
  openLink(id) { const a = this.find(id); this.setState({ link: { id, step: 'choose', login: a ? a.login : '', pw: '', code: '', guard: 'mobile', qr: null } }); }
  setLink(p) { this.setState(s => ({ link: s.link && { ...s.link, ...p } })); }
  closeLink() { api.linkCancel(); this.setState({ link: null }); }
  onLinkEvent(e) {
    const L = this.state.link; if (!L) return;
    if (e.step === 'guard') this.setLink({ step: 'guard', guard: e.guard || L.guard, detail: e.detail ?? L.detail, canConfirm: e.canConfirm ?? L.canConfirm, error: e.error || null, code: e.keep ? '' : L.code });
    else this.setLink({ ...e });
    if (e.step === 'ok') this.later(50, () => this.fetchStats(L.id));
  }
  linkQR() { const L = this.state.link; this.setLink({ step: 'qr', qr: null }); api.linkQR(L.id); }
  linkPW() {
    const L = this.state.link; if (!L || !L.login || !L.pw) return;
    this.setLink({ step: 'working', work: 'Signing in to Steam…', pw: '' });
    api.linkPassword(L.id, L.login, L.pw);
  }
  linkGuard() {
    const L = this.state.link; if (!L || L.code.length < 5) return;
    this.setLink({ step: 'working', work: 'Checking Steam Guard code…', error: null });
    api.linkCode(L.code);
  }

  // =================== render ===================

  render() {
    const S = this.state;
    if (!S.loaded) return html`<div style="height:100vh;display:grid;place-items:center">${Spin(26, 3)}</div>`;
    const accts = this.accts, steam = this.steamState, running = steam === 'running', nf = steam === 'not-found';
    const vis = this.visible(), selId = this.selId(), has = accts.length > 0;
    const cur = accts.find(a => a.current), busy = S.steam.busy;
    const d = this.find(S.drawerId);

    return html`
<div style="position:relative;height:100vh;min-height:640px;min-width:900px;display:flex;flex-direction:column;overflow:hidden;background:#0a0a0c;color:#f4f4f5;font-family:'Geist',system-ui,sans-serif">
  ${this.renderTitle(nf, running, cur, busy)}
  ${this.renderStatusRow(nf, running, steam, cur, busy)}
  ${!nf && has ? this.renderToolbar(accts) : null}
  <div style="position:relative;flex:1;min-height:0;display:flex;flex-direction:column">
    ${!nf && has && vis.length > 0 ? this.renderGallery(vis, selId, running) : null}
    ${!nf && has && vis.length === 0 ? this.renderNoResults() : null}
    ${!nf && !has ? this.renderEmpty() : null}
    ${nf ? this.renderNotFound() : null}
    ${!nf && has && vis.length > 0 ? this.renderFooter(vis, selId) : null}
  </div>
  ${d ? this.renderDrawer(d, running) : null}
  ${S.sw ? this.renderSwitching() : null}
  ${S.confirmId ? this.renderConfirm(running) : null}
  ${S.unlinkId ? this.renderUnlink() : null}
  ${S.setOpen ? this.renderSettings(nf) : null}
  ${S.addOpen ? this.renderAdd() : null}
  ${S.link ? this.renderLink() : null}
  ${this.renderToasts()}
</div>`;
  }

  renderTitle(nf, running, cur, busy) {
    const S = this.state, sw = S.sw;
    const dot = nf ? '#f87171' : sw || busy ? '#22d3ee' : running ? '#4ade80' : '#71717a';
    const text = nf ? 'steam not found' : sw ? 'switching → ' + sw.name : busy ? (busy === 'closing' ? 'closing steam…' : 'starting steam…') : running ? (cur ? cur.name : 'steam running') : 'steam closed';
    const wbtn = 'width:34px;height:28px;border-radius:8px;border:0;background:transparent;color:#a1a1aa;display:grid;place-items:center;cursor:pointer';
    return html`
<div class="drag" style="position:relative;display:flex;align-items:center;gap:10px;height:44px;flex:none;padding:0 8px 0 14px;background:linear-gradient(180deg,#111116,#0c0c10);border-bottom:1px solid rgba(255,255,255,.07);user-select:none">
  <div style="position:absolute;left:0;right:0;bottom:-1px;height:1px;background:linear-gradient(90deg,transparent,rgba(34,211,238,.55) 30%,rgba(129,140,248,.55) 70%,transparent);pointer-events:none"></div>
  <div style="position:relative;width:22px;height:22px;flex:none;border-radius:7px;background:linear-gradient(135deg,#22d3ee,#6366f1);box-shadow:0 0 16px rgba(34,211,238,.35)">
    <span style="position:absolute;left:5px;top:5px;width:8px;height:8px;border-radius:3px;background:rgba(255,255,255,.95)"></span>
    <span style="position:absolute;right:5px;bottom:5px;width:8px;height:8px;border-radius:3px;background:rgba(10,10,14,.55);border:1.5px solid rgba(255,255,255,.95);box-sizing:border-box"></span>
  </div>
  <span style="font:700 13px 'Geist',sans-serif;color:#f4f4f5;letter-spacing:-.01em">SwapDeck</span>
  <span style="font:600 9px 'Geist Mono',monospace;letter-spacing:.08em;color:#8d8d98;padding:3px 6px;border-radius:5px;border:1px solid rgba(255,255,255,.12)">v${S.version.split('.').slice(0, 2).join('.')}</span>
  <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;align-items:center;gap:8px;padding:5px 12px 5px 10px;border-radius:99px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);white-space:nowrap">
    <span style=${`width:6px;height:6px;border-radius:99px;background:${dot};box-shadow:0 0 8px ${dot}`}></span>
    <span style="font:500 11px 'Geist Mono',monospace;color:#c9c9d1">${text}</span>
  </div>
  <div class="nodrag" style="margin-left:auto;display:flex;align-items:center;gap:4px">
    <button class="hv-min" style=${wbtn} aria-label="Minimize" onClick=${() => api.win('min')}>${I.min}</button>
    <button class="hv-max" style=${wbtn} aria-label="Maximize" onClick=${() => api.win('max')}>${I.max}</button>
    <button class="hv-close" style=${wbtn} aria-label="Close" onClick=${() => api.win('close')}>${I.x(12)}</button>
  </div>
</div>`;
  }

  renderStatusRow(nf, running, steam, cur, busy) {
    const pill = 'display:flex;align-items:center;gap:9px;padding:7px 14px 7px 12px;border-radius:99px;';
    return html`
<div style="display:flex;align-items:center;gap:10px;padding:16px 24px 12px;flex:none;flex-wrap:wrap">
  ${running && !busy ? html`<div style=${pill + 'background:rgba(74,222,128,.07);border:1px solid rgba(74,222,128,.25)'}>
    <span style="width:8px;height:8px;border-radius:99px;background:#4ade80;box-shadow:0 0 10px #4ade80;animation:pdot 2.4s ease-in-out infinite"></span>
    <span style="font:500 12.5px 'Geist',sans-serif;color:#86efac">${cur ? 'Signed in as' : 'Steam running'}</span>
    <span style="font:600 12.5px 'Geist',sans-serif;color:#f4f4f5">${cur ? cur.name : ''}</span>
  </div>` : null}
  ${steam === 'closed' && !busy ? html`<div style=${pill + 'background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12)'}>
    <span style="width:8px;height:8px;border-radius:99px;background:#71717a"></span>
    <span style="font:500 12.5px 'Geist',sans-serif;color:#d4d4d8">Steam closed</span>
    <span style="font:400 11.5px 'Geist',sans-serif;color:#8d8d98">${cur ? '· next start signs in as ' + cur.name : ''}</span>
  </div>` : null}
  ${busy && !nf ? html`<div style=${pill + 'background:rgba(34,211,238,.07);border:1px solid rgba(34,211,238,.28)'}>
    ${Spin(11)}<span style="font:500 12.5px 'Geist',sans-serif;color:#a5f3fc">${busy === 'closing' ? 'Closing Steam…' : 'Starting Steam…'}</span>
  </div>` : null}
  ${nf ? html`<div style=${pill + 'background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.35)'}>
    <span style="width:8px;height:8px;border-radius:99px;background:#f87171"></span>
    <span style="font:500 12.5px 'Geist',sans-serif;color:#fca5a5">Steam not found</span>
  </div>` : null}
  ${running && !busy ? html`<button class="hv-danger-outline" style="display:flex;align-items:center;gap:7px;padding:8px 13px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:transparent;color:#c9c9d1;font:500 12px 'Geist',sans-serif;cursor:pointer" onClick=${() => this.closeSteam()}>${I.power}Close Steam</button>` : null}
  ${steam === 'closed' && !busy ? html`<button class="hv-green" style="display:flex;align-items:center;gap:7px;padding:8px 13px;border-radius:10px;border:1px solid rgba(74,222,128,.35);background:rgba(74,222,128,.08);color:#86efac;font:500 12px 'Geist',sans-serif;cursor:pointer" onClick=${() => this.startSteam()}>${I.play}Start Steam</button>` : null}
  <div style="flex:1"></div>
  <button class="add-btn" onClick=${() => this.addAcc()}><span style="position:relative;display:flex;align-items:center;gap:8px;background:#111116;border-radius:11px;padding:8px 15px;font:600 12.5px 'Geist',sans-serif;color:#f4f4f5">${I.userPlus()}Add account</span></button>
  <button class="hv-bright" style="width:36px;height:36px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:transparent;color:#a1a1aa;cursor:pointer;display:grid;place-items:center" onClick=${() => this.setState({ setOpen: true })} aria-label="Settings">${I.gear}</button>
</div>`;
  }

  renderToolbar(accts) {
    const S = this.state;
    const allTags = [...KNOWN.filter(t => accts.some(a => a.tags.includes(t))), ...[...new Set(accts.flatMap(a => a.tags))].filter(t => !KNOWN.includes(t))];
    const filters = [{ label: 'All', n: accts.length, act: !S.tagF, key: null }, ...allTags.map(t => ({ label: t, n: accts.filter(a => a.tags.includes(t)).length, act: S.tagF === t, key: t }))];
    const seg = (curV, k, l, on) => html`<button style=${`padding:5px 11px;border-radius:8px;border:0;background:${curV === k ? 'rgba(255,255,255,.1)' : 'transparent'};color:${curV === k ? '#f4f4f5' : '#8d8d98'};font:500 11.5px 'Geist',sans-serif;cursor:pointer`} onClick=${on}>${l}</button>`;
    return html`
<div style="display:flex;align-items:center;gap:10px;padding:0 24px 16px;flex:none;flex-wrap:wrap">
  <div style="position:relative;flex:none">
    ${I.search(14, '#7c7c88', 'position:absolute;left:11px;top:50%;transform:translateY(-50%)')}
    <input ref=${el => (this._search = el)} class="fc-search" style="width:230px;padding:8px 30px 8px 33px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#f4f4f5;font:400 12.5px 'Geist',sans-serif;outline:none" placeholder="Search name or login" value=${S.q} onInput=${e => this.setState({ q: e.target.value, hover: null })} />
    <span style="position:absolute;right:9px;top:50%;transform:translateY(-50%);font:500 10px 'Geist Mono',monospace;color:#7c7c88;border:1px solid rgba(255,255,255,.14);border-radius:4px;padding:0 5px;line-height:15px">/</span>
  </div>
  <div style="display:flex;gap:6px;flex-wrap:wrap">
    ${filters.map(f => {
      const c = f.key ? tc(f.key) : ['rgba(255,255,255,.1)', '#f4f4f5', 'rgba(255,255,255,.3)'];
      return html`<button class="hv-bd35" style=${`display:flex;align-items:center;gap:6px;font:600 10px 'Geist Mono',monospace;letter-spacing:.05em;text-transform:uppercase;padding:6px 11px;border-radius:99px;background:${f.act ? c[0] : 'transparent'};color:${f.act ? c[1] : '#a1a1aa'};border:1px solid ${f.act ? c[2] : 'rgba(255,255,255,.13)'};cursor:pointer`} onClick=${() => this.setState({ tagF: f.act ? null : f.key, hover: null })}>${f.label}<span style="opacity:.6">${f.n}</span></button>`;
    })}
  </div>
  <div style="flex:1"></div>
  <div style="display:flex;gap:2px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:10px;padding:3px">
    ${[['pinned', 'Pinned first'], ['recent', 'Last used'], ['name', 'Name']].map(([k, l]) => seg(S.sort, k, l, () => this.setState({ sort: k })))}
  </div>
</div>`;
  }

  panelStats(a) {
    const st = a.stats, c = st && st.cs2;
    if (!a.linked) return html`<div style="display:flex;align-items:center;gap:7px;margin-top:11px;font:500 11px 'Geist',sans-serif;color:rgba(255,255,255,.62)">${I.lock(12)}Not linked · public profile only</div>`;
    const box = 'font:600 10.5px \'Geist Mono\',monospace;padding:6px 9px;border-radius:9px;background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.14);color:#e8e8ec;backdrop-filter:blur(6px)';
    if (!st) return html`<div style="display:flex;align-items:center;gap:6px;margin-top:11px"><span style=${box}>LINKED · STATS NOT LOADED</span></div>`;
    if (c) {
      const pr = c.premier, cd = c.cd && c.cd.until > Date.now() ? c.cd : null;
      return html`<div style="display:flex;align-items:center;gap:6px;margin-top:11px;flex-wrap:wrap">
        <span style="display:flex;align-items:center;gap:7px;padding:4px 10px 4px 4px;border-radius:9px;background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(6px)"><span style=${`font:700 8.5px 'Geist Mono',monospace;letter-spacing:.08em;padding:3px 5px;border-radius:6px;background:${hexA(tier(pr), .2)};color:${tier(pr)}`}>PREMIER</span><span style=${`font:700 13px 'Geist Mono',monospace;color:${tier(pr)}`}>${pr == null ? 'N/A' : fmt(pr)}</span></span>
        <span style=${box}>LVL ${c.level}</span>
        ${cd ? html`<span style="display:flex;align-items:center;gap:5px;font:600 10.5px 'Geist Mono',monospace;padding:6px 9px;border-radius:9px;background:rgba(120,53,15,.6);border:1px solid rgba(251,191,36,.45);color:#fcd34d;backdrop-filter:blur(6px)">${I.clock(11, 2.2)}Cooldown ${left(cd.until)}</span>` : null}
      </div>`;
    }
    return html`<div style="display:flex;align-items:center;gap:6px;margin-top:11px;flex-wrap:wrap">
      ${st.acct && st.acct.level != null ? html`<span style=${box}>STEAM LVL ${st.acct.level}</span>` : null}
      <span style=${box}>${fmt(st.games.length)} GAMES</span>
    </div>`;
  }

  renderGallery(vis, selId, running) {
    const S = this.state;
    const expId = S.hover && vis.some(a => a.id === S.hover) ? S.hover : selId;
    return html`
<div ref=${this.galRef} class="gallery" style="position:relative;flex:1;min-height:0;display:flex;align-items:stretch;gap:10px;overflow-x:auto;overflow-y:hidden;padding:4px 24px 14px" onMouseLeave=${() => this.setState({ hover: null })}>
  ${vis.map(a => {
    const exp = a.id === expId, isSel = a.id === selId, canSw = !(a.current && running), g = this.launchOf(a), p = a.pub;
    const noImg = !a.avatar;
    const bg = a.avatar ? `url("${a.avatar}") center/cover no-repeat,#111` : 'radial-gradient(120% 70% at 18% 8%,rgba(255,255,255,.26),transparent 58%),' + a.grad;
    const ring = a.current ? '0 0 0 2px #22d3ee,0 0 44px rgba(34,211,238,.26)' : (isSel && !exp ? '0 0 0 2px rgba(255,255,255,.45)' : '0 0 0 1px rgba(255,255,255,.1)');
    const stc = p ? ST[p.st] : ST.unknown;
    const onClick = () => { this.select(a.id); clearTimeout(this._clk); this._clk = this.later(240, () => this.openDetails(a.id)); };
    const onDbl = e => { e.preventDefault(); clearTimeout(this._clk); this.switchTo(a.id); };
    return html`
  <div key=${a.id} data-pid=${a.id} style=${`position:relative;flex:none;width:${exp ? W_EXP : W_COL}px;min-height:440px;border-radius:20px;overflow:hidden;cursor:pointer;user-select:none;transition:width .55s cubic-bezier(.22,1,.36,1),box-shadow .3s;background:${bg};box-shadow:${ring}`}
    onMouseEnter=${() => { if (S.hover !== a.id) this.setState({ hover: a.id }); }} onClick=${onClick} onDblClick=${onDbl} onContextMenu=${e => { e.preventDefault(); this.openDetails(a.id); }}>
    ${noImg ? html`<div style=${`position:absolute;right:-14px;top:34px;font:700 170px/1 'Geist Mono',monospace;letter-spacing:-.04em;color:rgba(255,255,255,.13);opacity:${exp ? 1 : 0};transition:opacity .4s;pointer-events:none`}>${a.ini}</div>` : null}
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.1) 0%,rgba(0,0,0,0) 20%,rgba(0,0,0,.9) 100%);pointer-events:none"></div>
    <div style=${`position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;padding:16px 0 18px;opacity:${exp ? 0 : 1};transition:opacity .25s;pointer-events:none`}>
      ${noImg ? html`<span style="width:46px;height:46px;border-radius:14px;background:rgba(0,0,0,.24);border:1px solid rgba(255,255,255,.2);display:grid;place-items:center;font:600 15px 'Geist Mono',monospace;color:#fff">${a.ini}</span>` : null}
      <span style=${`margin-top:10px;width:8px;height:8px;border-radius:99px;background:${stc};box-shadow:0 0 0 2px rgba(0,0,0,.35)`}></span>
      <div style="margin-top:auto;display:flex;flex-direction:column;align-items:center;gap:10px">
        ${a.linked ? I.link(13, '#67e8f9', 2.2) : null}
        ${a.pinned ? I.star(13, '#fbbf24', '#fbbf24', 1.5) : null}
        <span style="writing-mode:vertical-rl;transform:rotate(180deg);font:600 13.5px 'Geist',sans-serif;color:#fff;white-space:nowrap;max-height:230px;overflow:hidden;text-overflow:ellipsis">${a.name}</span>
      </div>
    </div>
    <div style=${`position:absolute;top:14px;left:16px;right:14px;display:flex;align-items:center;gap:6px;opacity:${exp ? 1 : 0};transition:opacity .3s .1s;pointer-events:${exp ? 'auto' : 'none'}`}>
      ${a.current ? html`<span style="display:flex;align-items:center;gap:6px;font:600 9.5px 'Geist Mono',monospace;letter-spacing:.09em;padding:5px 9px;border-radius:99px;background:rgba(6,30,38,.78);color:#67e8f9;border:1px solid rgba(34,211,238,.5);backdrop-filter:blur(6px);white-space:nowrap"><span style="width:6px;height:6px;border-radius:99px;background:#22d3ee"></span>${running ? 'CURRENT' : 'AUTO-LOGIN'}</span>` : null}
      ${S.fetching[a.id] !== undefined ? html`<span style="display:flex;align-items:center;gap:6px;font:600 9.5px 'Geist Mono',monospace;letter-spacing:.06em;padding:5px 9px;border-radius:99px;background:rgba(0,0,0,.45);color:#e8e8ec;border:1px solid rgba(255,255,255,.2);backdrop-filter:blur(6px)">${Spin(9, 1.5)}UPDATING</span>` : null}
      <button class="hv-dark50" style=${`margin-left:auto;width:30px;height:30px;border-radius:9px;border:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.28);backdrop-filter:blur(6px);display:grid;place-items:center;cursor:pointer;color:${a.pinned ? '#fbbf24' : '#fff'}`} onClick=${e => { e.stopPropagation(); this.mut(a.id, { pinned: !a.pinned }); }} onDblClick=${stop} title=${a.pinned ? 'Unpin' : 'Pin to front'}>${I.star(14, a.pinned ? '#fbbf24' : 'none')}</button>
    </div>
    <div style=${`position:absolute;left:20px;bottom:18px;width:300px;opacity:${exp ? 1 : 0};transform:${exp ? 'translateY(0px)' : 'translateY(16px)'};transition:opacity .35s .12s,transform .5s .12s;pointer-events:${exp ? 'auto' : 'none'}`}>
      <div style="display:flex;align-items:center;gap:6px;font:500 10.5px 'Geist Mono',monospace;color:rgba(255,255,255,.72)">${I.clock(11)}Last used ${a.last}</div>
      <div style="font:700 23px/1.15 'Geist',sans-serif;color:#fff;margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:-.01em">${a.name}</div>
      <div style="font:500 11.5px 'Geist Mono',monospace;color:rgba(255,255,255,.7);margin-top:2px">${a.login}</div>
      <div style=${`display:flex;align-items:center;gap:7px;margin-top:8px;font:500 12px 'Geist',sans-serif;color:${!p || p.st === 'offline' ? 'rgba(255,255,255,.62)' : ST[p.st]}`}><span style=${`width:7px;height:7px;border-radius:99px;background:${stc}`}></span>${stText(p)}</div>
      <div style="display:flex;gap:5px;margin-top:10px;flex-wrap:wrap;min-height:21px">
        ${a.tags.map(t => html`<span style=${`font:600 9.5px 'Geist Mono',monospace;letter-spacing:.05em;text-transform:uppercase;padding:4px 9px;border-radius:99px;background:rgba(0,0,0,.42);color:${tc(t)[1]};border:1px solid ${tc(t)[2]};backdrop-filter:blur(6px)`}>${t}</span>`)}
      </div>
      <div style=${`font:400 12px/1.5 'Geist',sans-serif;color:${a.note ? 'rgba(255,255,255,.82)' : 'rgba(255,255,255,.5)'};margin-top:8px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden`}>${a.note || 'No note'}</div>
      ${this.panelStats(a)}
      <div style="display:flex;gap:7px;margin-top:12px">
        ${canSw ? html`<button class="hv-cyanbg" style="flex:1;display:flex;align-items:center;gap:10px;padding:10px 14px;border:0;border-radius:11px;background:#fff;color:#0a0a0c;font:600 13px 'Geist',sans-serif;cursor:pointer" onClick=${e => { e.stopPropagation(); this.switchTo(a.id); }} onDblClick=${stop}>${a.current ? 'Start Steam' : 'Switch'}${g ? html`<span style="font:600 10px 'Geist Mono',monospace;padding:3px 7px;border-radius:6px;background:rgba(10,10,12,.08);color:#3f3f46">▶ ${shortName(g)}</span>` : null}<span style="margin-left:auto;display:flex">${I.arrow()}</span></button>` : html`<div style="flex:1;display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:11px;background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.18);color:#fff;font:600 13px 'Geist',sans-serif;backdrop-filter:blur(6px)">${I.check(14, '#4ade80', 2.4)}Signed in</div>`}
      </div>
    </div>
  </div>`;
  })}
  <div class="hv-addcol" style="flex:none;width:78px;min-height:440px;border-radius:20px;border:1.5px dashed rgba(255,255,255,.18);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#8d8d98;cursor:pointer;transition:border-color .25s,color .25s,background .25s" onClick=${() => this.addAcc()}>
    ${I.plus}
    <span style="writing-mode:vertical-rl;transform:rotate(180deg);font:500 12px 'Geist',sans-serif;white-space:nowrap">Add account</span>
  </div>
</div>`;
  }

  renderNoResults() {
    const S = this.state;
    return html`
<div style="flex:1;display:grid;place-items:center;padding:24px">
  <div style="text-align:center;max-width:320px">
    <div style="width:52px;height:52px;margin:0 auto 16px;border-radius:15px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.03);display:grid;place-items:center;color:#8d8d98">${I.search(20, 'currentColor')}</div>
    <div style="font:600 16px 'Geist',sans-serif;color:#f4f4f5">${S.q.trim() ? 'No accounts match "' + S.q.trim() + '"' : 'No accounts tagged ' + (S.tagF || '')}</div>
    <div style="font:400 12.5px/1.6 'Geist',sans-serif;color:#8d8d98;margin-top:6px">Try a different name or login, or clear the tag filter.</div>
    <button class="hv-bd30" style="margin-top:16px;padding:8px 16px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:transparent;color:#e8e8ec;font:500 12.5px 'Geist',sans-serif;cursor:pointer" onClick=${() => this.setState({ q: '', tagF: null })}>Clear filters</button>
  </div>
</div>`;
  }

  renderEmpty() {
    return html`
<div style="flex:1;display:flex;gap:10px;padding:4px 24px 14px;min-height:0;overflow:hidden">
  <div style="position:relative;flex:none;width:360px;border-radius:20px;border:1.5px dashed rgba(34,211,238,.4);background:radial-gradient(100% 70% at 30% 10%,rgba(34,211,238,.09),transparent 70%);display:flex;flex-direction:column;justify-content:flex-end;padding:24px">
    <div style="width:54px;height:54px;border-radius:16px;background:rgba(34,211,238,.1);border:1px solid rgba(34,211,238,.35);display:grid;place-items:center;color:#67e8f9;margin-bottom:auto">${I.userPlus(22)}</div>
    <div style="font:700 22px/1.2 'Geist',sans-serif;color:#f4f4f5;letter-spacing:-.01em">No saved accounts yet</div>
    <div style="font:400 12.5px/1.6 'Geist',sans-serif;color:#a1a1aa;margin-top:8px;text-wrap:pretty">Sign in once through Steam and the account lands here. After that, switching is one click.</div>
    <button class="hv-cyanbg" style="margin-top:18px;display:flex;align-items:center;justify-content:space-between;padding:11px 15px;border:0;border-radius:11px;background:#fff;color:#0a0a0c;font:600 13px 'Geist',sans-serif;cursor:pointer" onClick=${() => this.addAcc()}>Add your first account${I.arrow()}</button>
  </div>
  ${[.8, .6, .42, .26, .14].map((o, i) => html`<div style=${`flex:none;width:104px;border-radius:20px;border:1.5px dashed rgba(255,255,255,${[.12, .1, .09, .08, .07][i]});opacity:${o}`}></div>`)}
</div>`;
  }

  renderNotFound() {
    const S = this.state;
    return html`
<div style="flex:1;display:grid;place-items:center;padding:24px">
  <div style="width:420px;max-width:100%;border-radius:20px;border:1px solid rgba(248,113,113,.28);background:radial-gradient(100% 80% at 20% 0%,rgba(248,113,113,.09),transparent 70%),#101014;padding:26px">
    <div style="width:50px;height:50px;border-radius:15px;background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.35);display:grid;place-items:center;color:#f87171">${I.warn(22)}</div>
    <div style="font:700 20px 'Geist',sans-serif;color:#f4f4f5;margin-top:18px">Couldn't find Steam</div>
    <div style="font:400 12.5px/1.6 'Geist',sans-serif;color:#a1a1aa;margin-top:7px;text-wrap:pretty">Saved accounts are read from Steam's own login list, so they show up once SwapDeck knows where <span style="font-family:'Geist Mono',monospace;color:#e8e8ec">steam.exe</span> is.</div>
    <div style="margin-top:14px;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);font:400 11px/1.7 'Geist Mono',monospace;color:#8d8d98">Checked: ${(S.steam.checked || []).map((c, i) => html`${i ? html`<br />` : null}${c}`)}</div>
    <div style="display:flex;gap:8px;margin-top:18px">
      <button class="hv-cyanbg" style="padding:9px 16px;border:0;border-radius:10px;background:#fff;color:#0a0a0c;font:600 12.5px 'Geist',sans-serif;cursor:pointer" onClick=${() => this.browse()}>Browse for steam.exe…</button>
      ${!S.retrying ? html`<button class="hv-bd30" style="padding:9px 15px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:transparent;color:#e8e8ec;font:500 12.5px 'Geist',sans-serif;cursor:pointer" onClick=${() => this.retry()}>Retry</button>` : html`<span style="display:flex;align-items:center;gap:8px;padding:9px 15px;font:500 12.5px 'Geist',sans-serif;color:#8d8d98">${Spin(11)}Searching…</span>`}
    </div>
  </div>
</div>`;
  }

  renderFooter(vis, selId) {
    const idx = vis.findIndex(a => a.id === selId);
    const kbd = 'font:500 10px \'Geist Mono\',monospace;color:#a1a1aa;border:1px solid rgba(255,255,255,.14);border-radius:4px;padding:1px 5px';
    const nav = 'width:30px;height:30px;border-radius:9px;border:1px solid rgba(255,255,255,.12);background:transparent;color:#c9c9d1;display:grid;place-items:center;cursor:pointer';
    return html`
<div style="display:flex;align-items:center;gap:16px;padding:0 24px 14px;flex:none">
  <div style="display:flex;gap:14px;flex-wrap:wrap;font:400 11px 'Geist',sans-serif;color:#7c7c88">
    <span style="display:flex;align-items:center;gap:6px"><span style=${kbd}>← →</span>browse</span>
    <span style="display:flex;align-items:center;gap:6px"><span style=${kbd}>Enter</span>switch</span>
    <span>Click for details · double-click to switch · scroll wheel moves sideways</span>
  </div>
  <div style="margin-left:auto;display:flex;align-items:center;gap:8px">
    <span style="font:500 11px 'Geist Mono',monospace;color:#a1a1aa">${idx + 1} / ${vis.length}</span>
    <button class="hv-bd30" style=${nav} onClick=${() => this.step(-1)} aria-label="Previous">${I.chevL}</button>
    <button class="hv-bd30" style=${nav} onClick=${() => this.step(1)} aria-label="Next">${I.chevR}</button>
  </div>
</div>`;
  }

  // ---------- drawer ----------

  row(label, val, c, plain, loading) {
    return html`<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05)">
      <span style="font:500 12.5px 'Geist',sans-serif;color:#d4d4d8">${label}</span>
      ${loading ? html`<span class="shim" style="width:72px;height:20px;border-radius:99px"></span>` : plain ? html`<span style="font:500 12.5px 'Geist Mono',monospace;color:#f4f4f5;text-align:right">${val}</span>` : Chip(val, c)}
    </div>`;
  }

  renderDrawer(d, running) {
    const S = this.state, f = S.fetching[d.id], ld = i => f !== undefined && f <= i, L = d.linked;
    const st = d.stats, ac = st && st.acct, cs = st && st.cs2, p = d.pub;
    const dCanSw = !(d.current && running), g = this.launchOf(d);
    const hasCs2Tab = !(L && st && !cs && st.cs2Note === 'not-played');
    const tabs = [['overview', 'Overview', false], ...(hasCs2Tab ? [['cs2', 'CS2', !L]] : []), ['games', 'Games' + (L && st ? ' · ' + st.games.length : ''), !L]];
    const tab = tabs.some(t => t[0] === S.tab) ? S.tab : 'overview';
    const updatedAt = L ? d.statsAt : d.pubAt;
    const upd = f !== undefined ? 'Updating… ' + (f + 1) + '/' + (L ? 4 : 1) : (updatedAt ? 'Updated ' + rel(updatedAt) : 'Never updated');
    const url = 'https://steamcommunity.com/profiles/' + d.sid;
    const card = 'border-radius:14px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.02);';
    const label = 'font:600 10px \'Geist Mono\',monospace;letter-spacing:.1em;color:#8d8d98';
    const tradeC = p && p.trade === 'banned' ? BAD : p && p.trade === 'probation' ? WARN : OK;

    const overview = html`
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px">
  <div style=${card + 'padding:14px 16px 6px'}>
    <div style=${label + ';margin-bottom:4px'}>PUBLIC PROFILE</div>
    ${p || ld(0) ? [
      this.row('Online status', stText(p), !p || p.st === 'offline' ? NEU : p.st === 'away' ? WARN : OK, false, ld(0)),
      this.row('Profile visibility', p && p.priv ? 'Private' : 'Public', p && p.priv ? WARN : OK, false, ld(0)),
      this.row('VAC ban', p && p.vac ? 'Yes' : 'No', p && p.vac ? BAD : OK, false, ld(0)),
      this.row('Trade ban', !p || p.trade === 'none' ? 'None' : p.trade === 'banned' ? 'Banned' : 'Probation', tradeC, false, ld(0)),
      this.row('Limited account', p && p.lim ? 'Yes' : 'No', p && p.lim ? WARN : OK, false, ld(0)),
      this.row('Member since', (p && p.since) || '—', null, true, ld(0)),
    ] : html`<div style="padding:12px 0;font:400 12px 'Geist',sans-serif;color:#8d8d98">Not loaded yet. Hit "Refresh stats".</div>`}
  </div>
  <div style=${card + 'padding:14px 16px 6px'}>
    <div style="display:flex;align-items:center;margin-bottom:4px"><span style=${label}>STEAM ACCOUNT</span>${L ? html`<span style="margin-left:auto;font:500 10px 'Geist Mono',monospace;color:#86efac">via linked login</span>` : null}</div>
    ${L && (ac || ld(1)) ? [
      this.row('Steam level', ac && ac.level != null ? String(ac.level) : '—', null, true, ld(1)),
      this.row('Wallet balance', (ac && ac.wallet) || '—', null, true, ld(1)),
      this.row('Games owned', st ? fmt(st.games.length) : '—', null, true, ld(1)),
      this.row('Friends', ac ? fmt(ac.friends) : '—', null, true, ld(1)),
      this.row('CS2 Prime', !ac || ac.prime == null ? 'Unknown' : ac.prime ? 'Prime' : 'Not Prime', ac && ac.prime ? OK : NEU, false, ld(1)),
      this.row('VAC bans', ac && ac.vacCount ? (ac.vacGames.length ? 'VAC banned in: ' + ac.vacGames.map(shortName).join(', ') : ac.vacCount + ' ban' + (ac.vacCount === 1 ? '' : 's')) : 'None', ac && ac.vacCount ? BAD : OK, false, ld(1)),
      this.row('Community ban', ac && ac.communityBanned ? 'Yes' : 'No', ac && ac.communityBanned ? BAD : OK, false, ld(1)),
    ] : null}
    ${L && !ac && !ld(1) ? html`<div style="padding:12px 0;font:400 12px 'Geist',sans-serif;color:#8d8d98">Linked. Hit "Refresh stats" to load account data.</div>` : null}
    ${!L ? html`<div style="display:flex;flex-direction:column;align-items:flex-start;gap:10px;padding:14px 0 12px">
      <span style="width:38px;height:38px;border-radius:11px;background:rgba(34,211,238,.08);border:1px solid rgba(34,211,238,.3);display:grid;place-items:center;color:#67e8f9">${I.lock(16)}</span>
      <div style="font:600 13.5px 'Geist',sans-serif;color:#f4f4f5">Link to unlock account stats</div>
      <div style="font:400 12px/1.55 'Geist',sans-serif;color:#a1a1aa">Steam level, wallet, games and hours, friends, Prime, VAC bans per game, plus CS2 ranks and medals. One-time sign-in with QR or password.</div>
      <button class="hv-cyanbg" style="padding:8px 14px;border:0;border-radius:10px;background:#fff;color:#0a0a0c;font:600 12px 'Geist',sans-serif;cursor:pointer" onClick=${() => this.openLink(d.id)}>Link account</button>
    </div>` : null}
  </div>
  <div style=${card + 'padding:14px 16px'}>
    <div style="display:flex;align-items:baseline;margin-bottom:10px"><span style=${label}>LAUNCH AFTER SWITCHING</span><span style="margin-left:auto;font:400 11px 'Geist',sans-serif;color:#a1a1aa">${g ? 'Launches ' + g + ' after switching' : 'Only signs in, no game launches'}</span></div>
    <div class="scroll-y" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;max-height:246px;overflow-y:auto">
      ${[['default', 'Default', S.settings.launchAfter && S.settings.defaultGame ? shortName(this.gameName(S.settings.defaultGame) || '?') : 'nothing', null], ['none', 'Nothing', '', null], ...S.games.map(x => [x.appid, x.name, '', x])].map(([k, l, sub, game]) => {
        const act = d.launch === k;
        return html`<button class="hv-bd30" style=${`display:flex;align-items:center;gap:8px;padding:6px 9px;border-radius:9px;border:1px solid ${act ? 'rgba(34,211,238,.55)' : 'rgba(255,255,255,.09)'};background:${act ? 'rgba(34,211,238,.12)' : 'rgba(255,255,255,.02)'};color:${act ? '#e8e8ec' : '#a1a1aa'};font:500 11.5px 'Geist',sans-serif;cursor:pointer;text-align:left;min-width:0`} onClick=${() => this.mut(d.id, { launch: k })} title=${l}>
          ${game ? (game.icon ? html`<img src=${game.icon} style="width:22px;height:22px;flex:none;border-radius:6px" />` : html`<span style=${`width:22px;height:22px;flex:none;border-radius:6px;background:${G(GAMECOL[hash(k) % GAMECOL.length], '#111')};display:grid;place-items:center;font:700 7px 'Geist Mono',monospace;color:#fff`}>${shortName(l).slice(0, 4)}</span>`) : null}
          <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${l}</span>
          ${sub ? html`<span style="font:500 9.5px 'Geist Mono',monospace;color:#8d8d98">(${sub})</span>` : null}
          ${act ? html`<span style="margin-left:auto;flex:none;display:flex">${I.check(12, '#22d3ee', 3)}</span>` : null}
        </button>`;
      })}
    </div>
    <div style="font:400 10.5px 'Geist',sans-serif;color:#7c7c88;margin-top:8px">${S.games.length ? 'Games installed on this PC. "Default" follows Settings.' : 'No installed games found in your Steam libraries.'}</div>
  </div>
  <div style=${card + 'padding:14px 16px 6px'}>
    <div style=${label + ';margin-bottom:4px'}>ON THIS PC</div>
    ${this.row('Login name', d.login, null, true)}
    ${this.row('Last used', d.last, null, true)}
    ${this.row('Signed in now', d.current && running ? 'Yes' : 'No', d.current && running ? OK : NEU)}
    ${this.row('Auto-login account', d.current ? 'Yes' : 'No', d.current ? OK : NEU)}
    ${this.row('Avatar', d.avatarSrc === 'local' ? 'Steam local cache' : d.avatarSrc === 'profile' ? 'Public profile' : 'None', null, true)}
    <div style="font:400 10.5px 'Geist Mono',monospace;color:#7c7c88;padding:9px 0 6px">SteamID64 ${d.sid}</div>
  </div>
  <div style=${card + 'grid-column:1 / -1;padding:14px 16px;display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px'}>
    <div>
      <div style=${label + ';margin-bottom:10px'}>TAGS</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
        ${[...KNOWN, ...d.tags.filter(t => !KNOWN.includes(t))].map(t => {
          const act = d.tags.includes(t), cc = tc(t);
          return html`<button class="hv-bright125" style=${`display:flex;align-items:center;gap:5px;font:600 10px 'Geist Mono',monospace;letter-spacing:.05em;text-transform:uppercase;padding:5px 10px;border-radius:99px;background:${act ? cc[0] : 'transparent'};color:${act ? cc[1] : '#8d8d98'};border:1px ${act ? 'solid' : 'dashed'} ${act ? cc[2] : 'rgba(255,255,255,.18)'};cursor:pointer`} onClick=${() => this.mut(d.id, x => ({ tags: x.tags.includes(t) ? x.tags.filter(y => y !== t) : [...x.tags, t] }))}>${act ? '✓' : '+'} ${t}</button>`;
        })}
        <input class="fc-tag" style="width:108px;padding:5px 10px;border-radius:99px;border:1px dashed rgba(255,255,255,.18);background:transparent;color:#e8e8ec;font:500 10.5px 'Geist Mono',monospace;outline:none" placeholder="+ custom tag" value=${S.tagDraft}
          onInput=${e => this.setState({ tagDraft: e.target.value })}
          onKeyDown=${e => { if (e.key !== 'Enter') return; const t = S.tagDraft.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 16); if (t && !d.tags.includes(t)) this.mut(d.id, { tags: [...d.tags, t] }); this.setState({ tagDraft: '' }); }} />
      </div>
    </div>
    <div>
      <div style="display:flex;align-items:baseline;margin-bottom:8px"><span style=${label}>NOTE</span><span style="margin-left:auto;font:400 10.5px 'Geist Mono',monospace;color:#7c7c88">${d.note.length} / 140</span></div>
      <textarea class="fc-cyan" style="width:100%;resize:none;padding:9px 11px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);color:#e8e8ec;font:400 12.5px/1.55 'Geist',sans-serif;outline:none" rows="2" maxlength="140" placeholder="e.g. sim racing league account, ACC + iRacing" value=${d.note}
        onInput=${e => this.editNote(d.id, e.target.value)}></textarea>
    </div>
  </div>
</div>`;

    return html`
<div style="position:absolute;inset:44px 0 0 0;z-index:40;background:rgba(4,4,7,.72);backdrop-filter:blur(10px);display:grid;place-items:center;padding:24px;animation:fade .2s ease" onClick=${() => this.setState({ drawerId: null })}>
  <div style="width:820px;max-width:100%;height:min(720px,calc(100vh - 92px));background:#0f0f13;border:1px solid rgba(255,255,255,.1);border-radius:20px;overflow:hidden;box-shadow:0 30px 90px rgba(0,0,0,.65);display:flex;flex-direction:column;animation:dfade .25s cubic-bezier(.22,1,.36,1)" onClick=${stop}>
    <div style=${`position:relative;padding:16px 20px 0;background:radial-gradient(120% 120% at 10% 0%,rgba(255,255,255,.22),transparent 55%),${d.grad};overflow:hidden;flex:none`}>
      ${d.avatar ? html`<div style=${`position:absolute;inset:0;background:url("${d.avatar}") center/cover;filter:blur(18px) saturate(1.2);opacity:.55;transform:scale(1.2)`}></div>` : html`<div style="position:absolute;right:-10px;top:-24px;font:700 150px/1 'Geist Mono',monospace;color:rgba(255,255,255,.1);pointer-events:none">${d.ini}</div>`}
      <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(15,15,19,.15),rgba(15,15,19,.7) 55%,#0f0f13);pointer-events:none"></div>
      <div style="position:relative;display:flex;align-items:center;gap:7px">
        ${d.current ? html`<span style="display:flex;align-items:center;gap:6px;font:600 9.5px 'Geist Mono',monospace;letter-spacing:.09em;padding:5px 9px;border-radius:99px;background:rgba(6,30,38,.78);color:#67e8f9;border:1px solid rgba(34,211,238,.5)"><span style="width:6px;height:6px;border-radius:99px;background:#22d3ee"></span>${running ? 'CURRENT' : 'AUTO-LOGIN'}</span>` : null}
        ${L ? html`<span style="display:flex;align-items:center;gap:6px;font:600 9.5px 'Geist Mono',monospace;letter-spacing:.09em;padding:5px 9px;border-radius:99px;background:rgba(0,0,0,.4);color:#86efac;border:1px solid rgba(74,222,128,.45)">${I.link(10, 'currentColor', 2.6)}LINKED</span>` : html`<span style="font:600 9.5px 'Geist Mono',monospace;letter-spacing:.09em;padding:5px 9px;border-radius:99px;background:rgba(0,0,0,.4);color:#c9c9d1;border:1px solid rgba(255,255,255,.2)">NOT LINKED</span><button class="hv-cyan20" style="display:flex;align-items:center;gap:6px;padding:5px 11px;border-radius:99px;border:1px solid rgba(34,211,238,.55);background:rgba(6,30,38,.7);color:#67e8f9;font:600 11px 'Geist',sans-serif;cursor:pointer" onClick=${() => this.openLink(d.id)}>Link account</button>`}
        <button class="hv-dark55" style="margin-left:auto;width:30px;height:30px;border-radius:9px;border:1px solid rgba(255,255,255,.2);background:rgba(0,0,0,.3);color:#fff;display:grid;place-items:center;cursor:pointer" onClick=${() => this.setState({ drawerId: null })} aria-label="Close details">${I.x(14, 2)}</button>
      </div>
      <div style="position:relative;display:flex;align-items:flex-end;gap:16px;margin-top:14px;flex-wrap:wrap">
        ${d.avatar ? html`<img src=${d.avatar} style="width:68px;height:68px;flex:none;border-radius:18px;border:1px solid rgba(255,255,255,.25);object-fit:cover" />` : html`<span style="width:68px;height:68px;flex:none;border-radius:18px;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.25);display:grid;place-items:center;font:600 21px 'Geist Mono',monospace;color:#fff">${d.ini}</span>`}
        <div style="min-width:0;flex:1">
          <div style="font:700 24px 'Geist',sans-serif;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:-.01em">${d.name}</div>
          <div style="display:flex;align-items:center;gap:7px;margin-top:4px;font:500 12.5px 'Geist',sans-serif;color:#e8e8ec"><span style=${`width:7px;height:7px;border-radius:99px;background:${p ? ST[p.st] : ST.unknown}`}></span>${stText(p)}</div>
          <div style="font:500 11px 'Geist Mono',monospace;color:rgba(255,255,255,.65);margin-top:3px">${d.login} · last used ${d.last}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">
          <div style="display:flex;gap:6px">
            ${dCanSw ? html`<button class="hv-cyanbg" style="display:flex;flex-direction:column;align-items:flex-start;gap:1px;padding:7px 16px;border:0;border-radius:10px;background:#fff;color:#0a0a0c;cursor:pointer" onClick=${() => this.switchTo(d.id)}><span style="font:600 13px 'Geist',sans-serif">${d.current ? 'Start Steam' : 'Switch'} →</span><span style="font:500 9.5px 'Geist Mono',monospace;color:#52525b">${g ? 'then ' + g : 'no game after'}</span></button>` : html`<div style="display:flex;align-items:center;gap:7px;padding:9px 14px;border-radius:10px;background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.18);color:#fff;font:600 12.5px 'Geist',sans-serif">${I.check(13, '#4ade80', 2.4)}Signed in</div>`}
            <button class="hv-dark55" style=${`width:40px;border-radius:10px;border:1px solid rgba(255,255,255,.2);background:rgba(0,0,0,.3);color:${d.pinned ? '#fbbf24' : '#fff'};display:grid;place-items:center;cursor:pointer`} onClick=${() => this.mut(d.id, { pinned: !d.pinned })} title=${d.pinned ? 'Unpin' : 'Pin'}>${I.star(14, d.pinned ? '#fbbf24' : 'none')}</button>
            <button class="hv-dark55" style="display:flex;align-items:center;gap:6px;padding:0 12px;border-radius:10px;border:1px solid rgba(255,255,255,.2);background:rgba(0,0,0,.3);color:#fff;font:500 12px 'Geist',sans-serif;cursor:pointer" onClick=${() => api.openProfile(url)}>${I.ext}Steam profile</button>
          </div>
          <div style="display:flex;align-items:center;gap:9px">
            <span style="font:500 10.5px 'Geist Mono',monospace;color:#a1a1aa">${upd}</span>
            ${f === undefined ? html`<button class="hv-cyan15" style="display:flex;align-items:center;gap:6px;padding:5px 10px;border-radius:8px;border:1px solid rgba(34,211,238,.4);background:rgba(0,0,0,.3);color:#67e8f9;font:600 11px 'Geist',sans-serif;cursor:pointer" onClick=${() => this.fetchStats(d.id)}>${I.refresh}Refresh stats</button>` : html`<span style="display:flex;align-items:center;gap:6px;padding:5px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.14);color:#a1a1aa;font:600 11px 'Geist',sans-serif">${Spin(10, 1.5)}Fetching</span>`}
          </div>
        </div>
      </div>
      <div style="position:relative;display:flex;gap:22px;margin-top:16px;border-bottom:1px solid rgba(255,255,255,.08)">
        ${tabs.map(([k, l, lock]) => html`<button class="hv-white" style=${`display:flex;align-items:center;gap:6px;padding:10px 0 11px;border:0;border-bottom:2px solid ${tab === k ? '#22d3ee' : 'transparent'};margin-bottom:-1px;background:transparent;color:${tab === k ? '#f4f4f5' : '#8d8d98'};font:600 12.5px 'Geist',sans-serif;cursor:pointer`} onClick=${() => this.setState({ tab: k })}>${l}${lock ? I.lock(11, 2.2) : null}</button>`)}
      </div>
    </div>
    <div class="scroll-y" style="flex:1;overflow-y:auto;padding:18px 20px 22px">
      ${tab === 'overview' ? overview : null}
      ${tab === 'cs2' ? this.renderCs2Tab(d, ld) : null}
      ${tab === 'games' ? this.renderGamesTab(d, ld) : null}
    </div>
    <div style="padding:12px 20px;border-top:1px solid rgba(255,255,255,.07);flex:none;display:flex;align-items:center;gap:8px">
      <span style="font:400 11px/1.4 'Geist',sans-serif;color:#8d8d98;flex:1">Forget removes the saved login from Steam on this PC. Unlink only removes stats access.</span>
      ${L ? html`<button class="hv-bright30" style="display:flex;align-items:center;gap:7px;padding:8px 13px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:transparent;color:#c9c9d1;font:500 12px 'Geist',sans-serif;cursor:pointer" onClick=${() => this.setState({ unlinkId: d.id })}>Unlink</button>` : null}
      <button class="hv-red10" style="display:flex;align-items:center;gap:7px;padding:8px 13px;border-radius:10px;border:1px solid rgba(248,113,113,.35);background:transparent;color:#fca5a5;font:500 12px 'Geist',sans-serif;cursor:pointer" onClick=${() => this.setState({ confirmId: d.id })}>${I.trash(13)}Forget account</button>
    </div>
  </div>
</div>`;
  }

  lockedTab(title, text, d) {
    return html`<div style="display:grid;place-items:center;padding:50px 20px;text-align:center">
      <span style="width:48px;height:48px;border-radius:14px;background:rgba(34,211,238,.08);border:1px solid rgba(34,211,238,.3);display:grid;place-items:center;color:#67e8f9">${I.lock(20)}</span>
      <div style="font:600 16px 'Geist',sans-serif;color:#f4f4f5;margin-top:14px">${title}</div>
      <div style="font:400 12.5px/1.6 'Geist',sans-serif;color:#a1a1aa;margin-top:6px;max-width:380px">${text}</div>
      ${d ? html`<button class="hv-cyanbg" style="margin-top:16px;padding:9px 16px;border:0;border-radius:10px;background:#fff;color:#0a0a0c;font:600 12.5px 'Geist',sans-serif;cursor:pointer" onClick=${() => this.openLink(d.id)}>Link account</button>` : null}
    </div>`;
  }

  renderCs2Tab(d, ld) {
    if (!d.linked) return this.lockedTab('CS2 stats need a linked account', 'Premier rating, Wingman and Competitive ranks, level, commendations, medals and cooldowns come from CS2\'s servers after a one-time sign-in.', d);
    if (ld(3)) return html`
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
  ${[['height:118px', 0], ['height:118px', .1], ['height:118px', .2], ['grid-column:1 / 3;height:96px', .15], ['height:96px', .25], ['grid-column:1 / -1;height:130px', .3]].map(([s, dl]) => html`<div style=${`${s};border-radius:14px;background:rgba(255,255,255,.05);animation:shim 1.2s ease-in-out ${dl}s infinite`}></div>`)}
</div>
<div style="margin-top:12px;font:500 11px 'Geist Mono',monospace;color:#8d8d98">Asking CS2's servers… usually 5–10 s</div>`;
    const c = d.stats && d.stats.cs2;
    if (!c) {
      const note = d.stats && d.stats.cs2Note;
      return this.lockedTab(note === 'in-game' ? 'In a game right now' : 'No CS2 stats yet', note === 'in-game' ? 'This account is playing on another session. Asking CS2 would kick it, so SwapDeck waits. Refresh when you are out of the game.' : 'Hit "Refresh stats" to ask CS2\'s servers for ranks, level and medals.', null);
    }
    const cd = c.cd && c.cd.until > Date.now() ? c.cd : null;
    const pr = c.premier, prC = tier(pr);
    const card = 'border-radius:14px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.02);padding:14px 16px';
    const lbl = 'font:600 10px \'Geist Mono\',monospace;letter-spacing:.1em;color:#a1a1aa';
    const ranks = [['Competitive', c.comp], ['Wingman', c.wing]];
    return html`
${cd ? html`<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:12px;background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.4);margin-bottom:12px">
  <span style="width:34px;height:34px;flex:none;border-radius:10px;background:rgba(251,191,36,.14);display:grid;place-items:center;color:#fbbf24">${I.clock(17, 2.2)}</span>
  <div style="flex:1;min-width:0"><div style="font:600 13px 'Geist',sans-serif;color:#fcd34d">${cd.kind} active</div><div style="font:400 12px 'Geist',sans-serif;color:#d4d4d8;margin-top:1px">Reason: ${cd.reason}</div></div>
  <div style="text-align:right"><div style="font:700 17px 'Geist Mono',monospace;color:#fcd34d">${left(cd.until)}</div><div style="font:500 10px 'Geist Mono',monospace;color:#a1a1aa">remaining</div></div>
</div>` : html`<div style="display:inline-flex;align-items:center;gap:7px;margin-bottom:12px;font:600 10.5px 'Geist Mono',monospace;padding:4px 10px;border-radius:99px;background:rgba(74,222,128,.1);color:#86efac;border:1px solid rgba(74,222,128,.35)"><span style="width:6px;height:6px;border-radius:99px;background:#4ade80"></span>No cooldown or penalty</div>`}
<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px">
  <div style=${`position:relative;border-radius:14px;border:1px solid ${hexA(prC, .4)};background:${hexA(prC, .1)};padding:14px 16px;overflow:hidden`}>
    <div style=${lbl}>PREMIER · CS RATING</div>
    <div style=${`font:800 32px/1.1 'Geist Mono',monospace;color:${prC};margin-top:12px;letter-spacing:-.02em`}>${pr == null ? 'Unrated' : fmt(pr)}</div>
    <div style="font:500 11.5px 'Geist',sans-serif;color:#a1a1aa;margin-top:6px">${pr == null ? (c.vacBanned ? 'Account is VAC banned' : 'Win 10 Premier matches for a rating') : c.premierWins + ' wins'}</div>
    <div style=${`position:absolute;left:0;top:0;bottom:0;width:4px;background:${prC}`}></div>
  </div>
  ${ranks.map(([l, r]) => {
    const i = r ? r.i : 0, name = r ? r.name : 'Unranked', col = rankCol(i);
    return html`<div style=${card}>
      <div style=${lbl}>${l.toUpperCase()}</div>
      <div style="display:flex;align-items:center;gap:10px;margin-top:12px">
        <span style=${`width:56px;height:24px;flex:none;border-radius:6px;background:${G(col, '#1f2937')};border:1px solid ${col};display:grid;place-items:center;font:700 10px 'Geist Mono',monospace;color:#fff`}>${i ? abbr(name) : '—'}</span>
        <span style="font:600 13px/1.25 'Geist',sans-serif;color:#f4f4f5">${name}</span>
      </div>
      <div style="font:500 11.5px 'Geist',sans-serif;color:#a1a1aa;margin-top:8px">${r ? r.wins + ' wins' : 'No ranked wins yet'}</div>
    </div>`;
  })}
  <div style=${card + ';grid-column:1 / 3'}>
    <div style="display:flex;align-items:center;gap:12px">
      <span style="width:42px;height:42px;flex:none;border-radius:99px;border:2px solid #22d3ee;display:grid;place-items:center;font:700 15px 'Geist Mono',monospace;color:#f4f4f5">${c.level}</span>
      <div style="flex:1;min-width:0"><div style=${lbl}>CS2 PROFILE LEVEL</div><div style="font:600 13.5px 'Geist',sans-serif;color:#f4f4f5;margin-top:2px">Level ${c.level}</div></div>
      <span style="font:500 11px 'Geist Mono',monospace;color:#a1a1aa">${fmt(c.xp)} / ${fmt(c.xpMax)} XP</span>
    </div>
    <div style="height:6px;border-radius:99px;background:rgba(255,255,255,.08);margin-top:12px;overflow:hidden"><div style=${`height:100%;width:${Math.round(c.xp / c.xpMax * 100)}%;border-radius:99px;background:linear-gradient(90deg,#22d3ee,#818cf8)`}></div></div>
    <div style="font:400 11px 'Geist',sans-serif;color:#8d8d98;margin-top:7px">${fmt(c.xpMax - c.xp)} XP to level ${c.level + 1}</div>
  </div>
  <div style=${card}>
    <div style=${lbl + ';margin-bottom:10px'}>COMMENDATIONS</div>
    <div style="display:flex;flex-direction:column;gap:7px">
      ${[['Friendly', c.com.f, I.smile], ['Teacher', c.com.t, I.book], ['Leader', c.com.l, I.crown]].map(([l, n, ic]) => html`<div style="display:flex;align-items:center;gap:8px;color:#c9c9d1">${ic}<span style="font:500 12.5px 'Geist',sans-serif">${l}</span><span style="margin-left:auto;font:700 13px 'Geist Mono',monospace;color:#f4f4f5">${fmt(n)}</span></div>`)}
    </div>
  </div>
  <div style=${card + ';grid-column:1 / -1'}>
    <div style="display:flex;align-items:baseline;margin-bottom:12px"><span style=${lbl}>MEDALS & SERVICE COINS</span><span style="margin-left:auto;font:400 11px 'Geist',sans-serif;color:#8d8d98">${c.medals ? c.medals.length + ' in inventory' : 'Inventory unavailable'}</span></div>
    ${c.medals && c.medals.length ? html`<div style="display:flex;gap:14px;flex-wrap:wrap">
      ${c.medals.map(m => {
        const col = GAMECOL[hash(m.name) % GAMECOL.length];
        return html`<div style="width:76px;display:flex;flex-direction:column;align-items:center;gap:6px" title=${m.name}>
          ${m.icon ? html`<img src=${m.icon} style="width:50px;height:50px;object-fit:contain;filter:drop-shadow(0 4px 12px rgba(0,0,0,.45))" />` : html`<span style=${`width:50px;height:50px;border-radius:99px;background:radial-gradient(circle at 35% 30%,${hexA(col, .95)},${hexA(col, .35)} 60%,rgba(0,0,0,.4));border:1.5px solid ${hexA(col, .6)};display:grid;place-items:center;font:700 11px 'Geist Mono',monospace;color:#fff`}>${abbr(m.name)}</span>`}
          <span style="font:400 10px/1.3 'Geist',sans-serif;color:#a1a1aa;text-align:center;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${m.name}</span>
        </div>`;
      })}
    </div>` : html`<div style="font:400 12px 'Geist',sans-serif;color:#8d8d98">${c.medals ? 'No medals or coins yet.' : "Couldn't read the CS2 inventory this time."}</div>`}
  </div>
</div>`;
  }

  renderGamesTab(d, ld) {
    const S = this.state;
    if (!d.linked) return this.lockedTab('Game list needs a linked account', 'Every owned game with total hours and hours in the last 2 weeks, plus which games carry a VAC ban.', d);
    if (ld(2)) return html`<div style="display:flex;flex-direction:column;gap:8px">${[0, .1, .2, .3, .4].map(dl => html`<div style=${`height:46px;border-radius:12px;background:rgba(255,255,255,.05);animation:shim 1.2s ease-in-out ${dl}s infinite`}></div>`)}</div>`;
    const st = d.stats;
    if (!st) return this.lockedTab('No game list yet', 'Hit "Refresh stats" to load owned games and hours.', null);
    const ac = st.acct || {};
    const vac = new Set(ac.vacGames || []);
    const games = st.games.slice().sort(S.gSort === 'name' ? (x, y) => x.n.localeCompare(y.n) : S.gSort === 'recent' ? (x, y) => y.w - x.w || y.h - x.h : (x, y) => y.h - x.h);
    const maxH = Math.max(...st.games.map(x => x.h), 1), totH = st.games.reduce((s, x) => s + x.h, 0);
    const banHas = ac.vacCount > 0 || ac.communityBanned;
    const seg = (k, l) => html`<button style=${`padding:5px 11px;border-radius:8px;border:0;background:${S.gSort === k ? 'rgba(255,255,255,.1)' : 'transparent'};color:${S.gSort === k ? '#f4f4f5' : '#8d8d98'};font:500 11.5px 'Geist',sans-serif;cursor:pointer`} onClick=${() => this.setState({ gSort: k })}>${l}</button>`;
    const cols = 'display:grid;grid-template-columns:36px minmax(0,1fr) 90px 90px;gap:12px';
    return html`
${banHas ? html`<div style="padding:12px 14px;border-radius:12px;background:rgba(248,113,113,.07);border:1px solid rgba(248,113,113,.4);margin-bottom:14px">
  <div style="font:600 10px 'Geist Mono',monospace;letter-spacing:.1em;color:#fca5a5;margin-bottom:6px">BANS ON RECORD</div>
  <div style="font:600 13px 'Geist',sans-serif;color:#f4f4f5">${ac.vacCount ? (ac.vacGames.length ? 'VAC banned in: ' + ac.vacGames.join(', ') : ac.vacCount + ' VAC ban' + (ac.vacCount === 1 ? '' : 's')) : 'No VAC bans'}</div>
  <div style="font:400 12px 'Geist',sans-serif;color:#d4d4d8;margin-top:3px">${ac.communityBanned ? 'Community banned' : 'No community ban'}</div>
</div>` : html`<div style="display:inline-flex;align-items:center;gap:7px;margin-bottom:14px;font:600 10.5px 'Geist Mono',monospace;padding:4px 10px;border-radius:99px;background:rgba(74,222,128,.1);color:#86efac;border:1px solid rgba(74,222,128,.35)"><span style="width:6px;height:6px;border-radius:99px;background:#4ade80"></span>No VAC or community bans</div>`}
<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap">
  <span style="font:500 12px 'Geist',sans-serif;color:#a1a1aa">${st.games.length} games · ${fmt(Math.round(totH))} h total</span>
  <div style="margin-left:auto;display:flex;gap:2px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:10px;padding:3px">${seg('hours', 'Hours')}${seg('recent', 'Last 2 weeks')}${seg('name', 'Name')}</div>
</div>
<div style=${cols + ";padding:6px 10px;font:600 9.5px 'Geist Mono',monospace;letter-spacing:.08em;color:#7c7c88"}><span></span><span>GAME</span><span style="text-align:right">2 WEEKS</span><span style="text-align:right">TOTAL</span></div>
${games.map(x => html`
<div class="hv-row" style=${cols + ';position:relative;align-items:center;padding:7px 10px;border-radius:10px;overflow:hidden'}>
  <div style=${`position:absolute;left:0;bottom:0;height:2px;width:${Math.max(2, Math.round(x.h / maxH * 100))}%;background:linear-gradient(90deg,rgba(34,211,238,.5),rgba(129,140,248,.2))`}></div>
  ${x.icon ? html`<img src=${x.icon} style="width:36px;height:36px;border-radius:8px" loading="lazy" />` : html`<span style=${`width:36px;height:36px;border-radius:8px;background:${G(GAMECOL[hash(x.appid) % GAMECOL.length], '#111')};display:grid;place-items:center;font:700 9px 'Geist Mono',monospace;color:#fff`}>${shortName(x.n).slice(0, 4)}</span>`}
  <div style="display:flex;align-items:center;gap:8px;min-width:0"><span style="font:600 13px 'Geist',sans-serif;color:#f4f4f5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${x.n}</span>${vac.has(x.n) ? html`<span style="flex:none;font:700 9px 'Geist Mono',monospace;letter-spacing:.06em;padding:2px 7px;border-radius:99px;background:rgba(248,113,113,.15);color:#fca5a5;border:1px solid rgba(248,113,113,.45)">VAC</span>` : null}</div>
  <span style=${`text-align:right;font:500 12px 'Geist Mono',monospace;color:${x.w ? '#86efac' : '#6f6f7a'}`}>${x.w ? fmt(x.w) + ' h' : '—'}</span>
  <span style="text-align:right;font:600 12.5px 'Geist Mono',monospace;color:#f4f4f5">${fmt(x.h)} h</span>
</div>`)}`;
  }

  // ---------- overlays ----------

  renderSwitching() {
    const sw = this.state.sw, cfg = this.state.settings;
    const bg = sw.avatar ? `url("${sw.avatar}") center/cover` : 'radial-gradient(120% 90% at 20% 0%,rgba(255,255,255,.25),transparent 60%),' + sw.grad;
    return html`
<div style="position:absolute;inset:44px 0 0 0;z-index:50;background:rgba(4,4,7,.8);backdrop-filter:blur(14px);display:grid;place-items:center;animation:fade .25s ease">
  <div style="width:360px;animation:dfade .3s ease">
    <div class="sw-ring"><div style=${`position:relative;width:100%;height:100%;border-radius:22px;background:${bg};display:grid;place-items:center;font:600 22px 'Geist Mono',monospace;color:#fff`}>${sw.avatar ? null : sw.ini}</div></div>
    <div style="font:500 12px 'Geist',sans-serif;color:#8d8d98;margin-top:22px">Switching to</div>
    <div style="font:700 26px 'Geist',sans-serif;color:#f4f4f5;letter-spacing:-.01em;margin-top:2px">${sw.name}</div>
    <div style="font:500 14px 'Geist',sans-serif;color:#a5f3fc;margin-top:14px;min-height:20px">${sw.steps[sw.step]}</div>
    <div style="height:3px;border-radius:99px;background:rgba(255,255,255,.08);margin-top:12px;overflow:hidden"><div style=${`height:100%;width:${Math.round(((sw.step + 1) / sw.steps.length) * 100)}%;background:linear-gradient(90deg,#22d3ee,#818cf8);border-radius:99px;transition:width .6s ease`}></div></div>
    <div style="display:flex;flex-direction:column;gap:9px;margin-top:18px">
      ${sw.steps.map((l, i) => html`<div style="display:flex;align-items:center;gap:10px">
        ${i < sw.step ? html`<span style="width:16px;height:16px;flex:none;border-radius:99px;background:rgba(74,222,128,.15);border:1px solid rgba(74,222,128,.5);display:grid;place-items:center">${I.check(9, '#4ade80', 3.5)}</span>` : i === sw.step ? Spin(16, 2, 'border-color:rgba(255,255,255,.16);border-top-color:#22d3ee') : html`<span style="width:16px;height:16px;flex:none;box-sizing:border-box;border-radius:99px;border:1px solid rgba(255,255,255,.16)"></span>`}
        <span style=${`font-family:'Geist',sans-serif;font-size:12.5px;color:${i < sw.step ? '#86efac' : i === sw.step ? '#f4f4f5' : '#6f6f7a'}`}>${l}</span>
      </div>`)}
    </div>
    <div style="margin-top:20px;font:400 11px 'Geist Mono',monospace;color:#7c7c88">steam.exe ${cfg.steamArgs || ''}${sw.game ? ' · then ' + sw.game : ''}</div>
  </div>
</div>`;
  }

  modal(z, body, onBackdrop) {
    return html`<div style=${`position:absolute;inset:44px 0 0 0;z-index:${z};background:rgba(4,4,7,.7);backdrop-filter:blur(8px);display:grid;place-items:center;animation:fade .2s ease`} onClick=${onBackdrop}>
      <div style="width:360px;background:#111116;border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:22px 24px;box-shadow:0 24px 80px rgba(0,0,0,.6);animation:dfade .2s ease" onClick=${stop}>${body}</div>
    </div>`;
  }

  renderConfirm(running) {
    const a = this.find(this.state.confirmId); if (!a) return null;
    return this.modal(55, html`
      <div style="width:40px;height:40px;border-radius:12px;background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.35);display:grid;place-items:center;color:#f87171">${I.trash(17)}</div>
      <div style="font:600 16px 'Geist',sans-serif;color:#f4f4f5;margin-top:14px">Forget ${a.name}?</div>
      <div style="font:400 12.5px/1.6 'Geist',sans-serif;color:#a1a1aa;margin-top:7px">This removes the saved login from Steam on this PC. The Steam account itself isn't touched, and you can add it back by signing in again.${running ? ' Steam restarts to apply this.' : ''}</div>
      ${a.current && running ? html`<div style="margin-top:12px;padding:9px 11px;border-radius:10px;background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.3);font:400 12px/1.5 'Geist',sans-serif;color:#fcd34d">You're signed in on this account right now. Steam will sign out.</div>` : null}
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px">
        <button class="hv-bright" style="padding:8px 15px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:transparent;color:#c9c9d1;font:500 12.5px 'Geist',sans-serif;cursor:pointer" onClick=${() => this.setState({ confirmId: null })}>Cancel</button>
        <button class="hv-red" style="padding:8px 15px;border-radius:10px;border:0;background:#dc2626;color:#fff;font:600 12.5px 'Geist',sans-serif;cursor:pointer" onClick=${() => this.forget()}>Forget account</button>
      </div>`, () => this.setState({ confirmId: null }));
  }

  renderUnlink() {
    const a = this.find(this.state.unlinkId); if (!a) return null;
    return this.modal(55, html`
      <div style="font:600 16px 'Geist',sans-serif;color:#f4f4f5">Unlink ${a.name}?</div>
      <div style="font:400 12.5px/1.6 'Geist',sans-serif;color:#a1a1aa;margin-top:7px">SwapDeck deletes its Steam sign-in token and cached stats for this account. Switching and the public profile keep working. You can link again anytime.</div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px">
        <button class="hv-bright" style="padding:8px 15px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:transparent;color:#c9c9d1;font:500 12.5px 'Geist',sans-serif;cursor:pointer" onClick=${() => this.setState({ unlinkId: null })}>Cancel</button>
        <button class="hv-gray" style="padding:8px 15px;border-radius:10px;border:0;background:#fff;color:#0a0a0c;font:600 12.5px 'Geist',sans-serif;cursor:pointer" onClick=${() => this.unlink()}>Unlink</button>
      </div>`, () => this.setState({ unlinkId: null }));
  }

  renderSettings(nf) {
    const S = this.state, cfg = S.settings;
    const sect = (t, m) => html`<div style=${`font:600 10px 'Geist Mono',monospace;letter-spacing:.1em;color:#8d8d98;margin:${m}`}>${t}</div>`;
    const toggleRow = (title, sub, on, fn) => html`<div style="display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.06);cursor:pointer" onClick=${fn}>
      <div style="flex:1"><div style="font:500 13px 'Geist',sans-serif;color:#f4f4f5">${title}</div><div style="font:400 11.5px 'Geist',sans-serif;color:#8d8d98;margin-top:2px">${sub}</div></div>${Toggle(on)}</div>`;
    const onLaunch = () => {
      const patch = { launchAfter: !cfg.launchAfter };
      if (!cfg.defaultGame && S.games.length) patch.defaultGame = (S.games.find(g => g.appid === '730') || S.games[0]).appid;
      this.setCfg(patch);
    };
    return html`
<div style="position:absolute;inset:44px 0 0 0;z-index:52;background:rgba(4,4,7,.7);backdrop-filter:blur(8px);display:grid;place-items:center;animation:fade .2s ease" onClick=${() => this.setState({ setOpen: false })}>
  <div class="scroll-y" style="width:440px;max-height:calc(100vh - 100px);overflow-y:auto;background:#111116;border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:22px 24px;box-shadow:0 24px 80px rgba(0,0,0,.6);animation:dfade .2s ease" onClick=${stop}>
    <div style="display:flex;align-items:center"><span style="font:600 16px 'Geist',sans-serif;color:#f4f4f5">Settings</span><button class="hv-ghost" style="margin-left:auto;width:28px;height:28px;border-radius:8px;border:0;background:transparent;color:#a1a1aa;display:grid;place-items:center;cursor:pointer" onClick=${() => this.setState({ setOpen: false })} aria-label="Close settings">${I.x(14, 2)}</button></div>
    ${sect('AFTER SWITCHING', '18px 0 4px')}
    ${toggleRow('Launch a game after switching', 'Default for every account. Each account can pick its own game in its details.', !!cfg.launchAfter, onLaunch)}
    ${cfg.launchAfter ? html`<div style="padding:10px 0 12px;border-bottom:1px solid rgba(255,255,255,.06)">
      <label style="display:block;font:500 12px 'Geist',sans-serif;color:#d4d4d8;margin-bottom:7px">Default game</label>
      <select class="sd-select fc-cyan" value=${cfg.defaultGame || ''} onChange=${e => this.setCfg({ defaultGame: e.target.value || null })}>
        ${S.games.length ? S.games.map(g => html`<option value=${g.appid}>${g.name}</option>`) : html`<option value="">No installed games found</option>`}
      </select>
    </div>` : null}
    ${toggleRow('Close app after switching', 'Quits SwapDeck when the switch finishes', !!cfg.closeAfter, () => this.setCfg({ closeAfter: !cfg.closeAfter }))}
    ${sect('STEAM', '20px 0 8px')}
    <label style="display:block;font:500 13px 'Geist',sans-serif;color:#f4f4f5;margin-bottom:7px">Extra Steam launch options</label>
    <input class="fc-cyan" style="width:100%;padding:9px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);color:#e8e8ec;font:500 12.5px 'Geist Mono',monospace;outline:none" placeholder="-silent" value=${cfg.steamArgs || ''}
      onInput=${e => { const v = e.target.value; this.setState(s => ({ settings: { ...s.settings, steamArgs: v } })); clearTimeout(this._argT); this._argT = setTimeout(() => api.setSettings({ steamArgs: v }), 400); }} />
    <div style="font:400 11px 'Geist',sans-serif;color:#8d8d98;margin-top:6px">Passed to steam.exe every time it starts, e.g. <span style="font-family:'Geist Mono',monospace;color:#c9c9d1">-silent -noverifyfiles</span></div>
    <label style="display:block;font:500 13px 'Geist',sans-serif;color:#f4f4f5;margin:16px 0 7px">Steam location</label>
    <div style="display:flex;gap:7px">
      <div style=${`flex:1;min-width:0;padding:9px 12px;border-radius:10px;border:1px solid ${nf ? 'rgba(248,113,113,.4)' : 'rgba(255,255,255,.1)'};background:rgba(255,255,255,.03);color:${nf ? '#fca5a5' : '#c9c9d1'};font:500 11.5px 'Geist Mono',monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis`} title=${S.steam.exe || ''}>${nf ? 'Not found — browse to steam.exe' : S.steam.exe}</div>
      <button class="hv-bd30" style="padding:8px 13px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:transparent;color:#e8e8ec;font:500 12px 'Geist',sans-serif;cursor:pointer" onClick=${() => this.browse()}>Browse…</button>
    </div>
    ${sect('APP', '20px 0 8px')}
    <div style="display:flex;align-items:baseline;margin-bottom:7px"><label style="font:500 13px 'Geist',sans-serif;color:#f4f4f5">UI scale</label><span style="margin-left:auto;font:500 11px 'Geist Mono',monospace;color:#8d8d98">now ${Math.round((S.zoom || 1) * 100)}%</span></div>
    <div style="display:flex;gap:2px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:10px;padding:3px">
      ${[['auto', 'Auto'], [0.8, '80%'], [0.9, '90%'], [1, '100%'], [1.1, '110%'], [1.25, '125%'], [1.5, '150%']].map(([k, l]) => {
        const act = (cfg.uiScale ?? 'auto') === k;
        return html`<button style=${`flex:1;padding:6px 0;border-radius:8px;border:0;background:${act ? 'rgba(34,211,238,.14)' : 'transparent'};color:${act ? '#67e8f9' : '#8d8d98'};font:500 11.5px 'Geist',sans-serif;cursor:pointer`} onClick=${() => this.setCfg({ uiScale: k })}>${l}</button>`;
      })}
    </div>
    <div style="font:400 11px 'Geist',sans-serif;color:#8d8d98;margin-top:6px">Auto fits everything to the window size. Shortcuts: <span style="font-family:'Geist Mono',monospace;color:#c9c9d1">Ctrl +</span> / <span style="font-family:'Geist Mono',monospace;color:#c9c9d1">Ctrl −</span> / <span style="font-family:'Geist Mono',monospace;color:#c9c9d1">Ctrl 0</span> (auto) or Ctrl + mouse wheel.</div>
    ${this.renderUpdateRow()}
    ${sect('PRIVACY', '20px 0 8px')}
    <div style="font:400 11.5px/1.6 'Geist',sans-serif;color:#8d8d98">Linked accounts store only Steam's sign-in token, encrypted with Windows (DPAPI) in SwapDeck's app data. Passwords are never saved. Tags, notes and cached stats stay on this PC.</div>
    <div style="display:flex;justify-content:flex-end;margin-top:22px">
      <button class="hv-cyanbg" style="padding:9px 20px;border:0;border-radius:10px;background:#fff;color:#0a0a0c;font:600 12.5px 'Geist',sans-serif;cursor:pointer" onClick=${() => this.setState({ setOpen: false })}>Done</button>
    </div>
  </div>
</div>`;
  }

  renderUpdateRow() {
    const S = this.state, u = S.update || { state: 'idle' };
    const btn = 'padding:8px 13px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:transparent;color:#e8e8ec;font:500 12px \'Geist\',sans-serif;cursor:pointer;white-space:nowrap';
    let text, action = null;
    switch (u.state) {
      case 'unsupported': text = u.portable ? 'Portable version: updates aren\'t automatic. Use the installer from GitHub Releases to get them.' : 'Development build: updates only work in the installed app.'; break;
      case 'checking': text = html`<span style="display:inline-flex;align-items:center;gap:7px">${Spin(10, 1.5)}Checking GitHub for updates…</span>`; break;
      case 'downloading': text = html`<span style="display:inline-flex;align-items:center;gap:7px">${Spin(10, 1.5)}Downloading v${u.version}… ${u.percent || 0}%</span>`; break;
      case 'ready': text = html`<span style="color:#86efac">v${u.version} is downloaded and installs when you quit.</span>`; action = html`<button class="hv-cyanbg" style="padding:8px 13px;border:0;border-radius:10px;background:#fff;color:#0a0a0c;font:600 12px 'Geist',sans-serif;cursor:pointer;white-space:nowrap" onClick=${() => api.installUpdate()}>Restart to update</button>`; break;
      case 'none': text = 'Up to date' + (u.checkedAt ? ' · checked ' + rel(u.checkedAt) : '') + '.'; break;
      case 'error': text = html`<span style="color:#fcd34d">${u.error}</span>`; break;
      default: text = 'Updates are checked automatically at startup and every 6 hours.';
    }
    if (!action && u.state !== 'unsupported') action = html`<button class="hv-bd30" style=${btn} disabled=${u.state === 'checking' || u.state === 'downloading'} onClick=${() => api.checkUpdates()}>Check for updates</button>`;
    return html`
      <label style="display:block;font:500 13px 'Geist',sans-serif;color:#f4f4f5;margin:16px 0 7px">Updates</label>
      <div style="display:flex;align-items:center;gap:10px">
        <div style="flex:1;min-width:0;font:400 11.5px/1.5 'Geist',sans-serif;color:#8d8d98"><span style="font:500 11.5px 'Geist Mono',monospace;color:#c9c9d1">SwapDeck v${S.version}</span> · ${text}</div>
        ${action}
      </div>`;
  }

  renderAdd() {
    return html`
<div style="position:absolute;inset:44px 0 0 0;z-index:53;background:rgba(4,4,7,.7);backdrop-filter:blur(8px);display:grid;place-items:center;animation:fade .2s ease">
  <div style="width:360px;background:#111116;border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:24px;box-shadow:0 24px 80px rgba(0,0,0,.6);animation:dfade .2s ease">
    ${Spin(26, 3, 'border-color:rgba(255,255,255,.14);border-top-color:#22d3ee')}
    <div style="font:600 16px 'Geist',sans-serif;color:#f4f4f5;margin-top:16px">Waiting for Steam sign-in…</div>
    <div style="font:400 12.5px/1.6 'Geist',sans-serif;color:#a1a1aa;margin-top:7px">Steam's login window is opening. Sign in there (tick "Remember me") and the account shows up here automatically. If Steam shows your saved accounts, pick "Add account".</div>
    <div style="display:flex;justify-content:flex-end;margin-top:18px">
      <button class="hv-bright" style="padding:8px 15px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:transparent;color:#c9c9d1;font:500 12.5px 'Geist',sans-serif;cursor:pointer" onClick=${() => this.cancelAdd()}>Cancel</button>
    </div>
  </div>
</div>`;
  }

  renderLink() {
    const S = this.state, Lk = S.link, acc = this.find(Lk.id), name = acc ? acc.name : '';
    const back = ['qr', 'scanned', 'pw', 'guard', 'confirm', 'fail'].includes(Lk.step);
    const input = "width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.03);color:#f4f4f5;font:500 13px 'Geist Mono',monospace;outline:none";
    const toChoose = () => { api.linkCancel(); this.setLink({ step: 'choose', code: '', pw: '', qr: null, error: null }); };
    const qrBox = (dim) => Lk.qr ? html`<svg viewBox=${`0 0 ${Lk.qr.size} ${Lk.qr.size}`} width="190" height="190" shape-rendering="crispEdges" style=${`display:block;${dim ? 'opacity:.18' : ''}`}><path d=${Lk.qr.path} fill="#0a0a0c" /></svg>` : html`<div style="width:190px;height:190px;display:grid;place-items:center">${Spin(26, 3, 'border-color:rgba(0,0,0,.12);border-top-color:#22d3ee')}</div>`;
    const white = (on) => `width:100%;padding:11px 14px;border:0;border-radius:11px;background:${on ? '#fff' : 'rgba(255,255,255,.25)'};color:#0a0a0c;font:600 13px 'Geist',sans-serif;cursor:pointer;text-align:left`;

    let body = null;
    if (Lk.step === 'choose') body = html`
      <div style="font:400 12.5px/1.6 'Geist',sans-serif;color:#a1a1aa;margin-bottom:14px">Sign in once so SwapDeck can read this account's stats, games and CS2 profile. Switching never needs this.</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <button class="hv-cyan12" style="display:flex;align-items:center;gap:13px;padding:13px 14px;border-radius:13px;border:1px solid rgba(34,211,238,.45);background:rgba(34,211,238,.06);cursor:pointer;text-align:left" onClick=${() => this.linkQR()}>
          <span style="width:38px;height:38px;flex:none;border-radius:10px;background:#fff;display:grid;place-items:center">${I.qr}</span>
          <div style="flex:1"><div style="display:flex;align-items:center;gap:7px"><span style="font:600 13.5px 'Geist',sans-serif;color:#f4f4f5">Scan a QR code</span><span style="font:600 9px 'Geist Mono',monospace;letter-spacing:.06em;padding:2px 6px;border-radius:99px;background:rgba(34,211,238,.15);color:#67e8f9">RECOMMENDED</span></div><div style="font:400 11.5px 'Geist',sans-serif;color:#a1a1aa;margin-top:2px">Use the Steam Mobile app. No password typed here.</div></div>
        </button>
        <button class="hv-bd28" style="display:flex;align-items:center;gap:13px;padding:13px 14px;border-radius:13px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.02);cursor:pointer;text-align:left" onClick=${() => this.setLink({ step: 'pw' })}>
          <span style="width:38px;height:38px;flex:none;border-radius:10px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);display:grid;place-items:center;color:#e8e8ec">${I.lock(18)}</span>
          <div style="flex:1"><div style="font:600 13.5px 'Geist',sans-serif;color:#f4f4f5">Login and password</div><div style="font:400 11.5px 'Geist',sans-serif;color:#a1a1aa;margin-top:2px">Then a Steam Guard code from email or the app.</div></div>
        </button>
      </div>
      <div style="font:400 11px/1.5 'Geist',sans-serif;color:#7c7c88;margin-top:14px">SwapDeck keeps only Steam's sign-in token, encrypted on this PC. Your password is never stored.</div>`;
    else if (Lk.step === 'qr') body = html`
      <div style="display:flex;flex-direction:column;align-items:center;text-align:center">
        <div style="padding:12px;border-radius:16px;background:#fff">${qrBox(false)}</div>
        <div style="font:600 14px 'Geist',sans-serif;color:#f4f4f5;margin-top:16px">Scan with the Steam mobile app</div>
        <div style="font:400 12px/1.6 'Geist',sans-serif;color:#a1a1aa;margin-top:5px">Open Steam on your phone → Steam Guard → scan the QR code. Make sure the app is on <b style="color:#e8e8ec">${name}</b>.</div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:14px;font:500 11.5px 'Geist Mono',monospace;color:#8d8d98">${Spin(10, 1.5)}Waiting for scan · code refreshes automatically</div>
      </div>`;
    else if (Lk.step === 'scanned') body = html`
      <div style="display:flex;flex-direction:column;align-items:center;text-align:center">
        <div style="position:relative;padding:12px;border-radius:16px;background:#fff">${qrBox(true)}<span style="position:absolute;inset:0;display:grid;place-items:center"><span style="width:56px;height:56px;border-radius:99px;background:#16a34a;display:grid;place-items:center">${I.check(26, '#fff', 3)}</span></span></div>
        <div style="font:600 14px 'Geist',sans-serif;color:#f4f4f5;margin-top:16px">Scanned. Approve on your phone</div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:10px;font:500 11.5px 'Geist Mono',monospace;color:#8d8d98">${Spin(10, 1.5)}Waiting for approval…</div>
      </div>`;
    else if (Lk.step === 'pw') body = html`
      <label style="display:block;font:500 12px 'Geist',sans-serif;color:#d4d4d8;margin-bottom:6px">Steam login name</label>
      <input class="fc-cyan" style=${input} value=${Lk.login} onInput=${e => this.setLink({ login: e.target.value })} autocomplete="off" spellcheck="false" />
      <label style="display:block;font:500 12px 'Geist',sans-serif;color:#d4d4d8;margin:14px 0 6px">Password</label>
      <input type="password" class="fc-cyan" style=${input} placeholder="••••••••" value=${Lk.pw} onInput=${e => this.setLink({ pw: e.target.value })} onKeyDown=${e => { if (e.key === 'Enter') this.linkPW(); }} autocomplete="off" />
      <button style=${white(Lk.login && Lk.pw) + ';margin-top:18px'} onClick=${() => this.linkPW()}>Sign in →</button>
      <div style="font:400 11px/1.5 'Geist',sans-serif;color:#7c7c88;margin-top:12px">Sent straight to Steam over an encrypted connection. Only the resulting token is kept.</div>`;
    else if (Lk.step === 'guard') body = html`
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px"><span style="width:34px;height:34px;flex:none;border-radius:10px;background:rgba(34,211,238,.1);border:1px solid rgba(34,211,238,.35);display:grid;place-items:center;color:#67e8f9">${I.shield}</span><div style="font:600 14px 'Geist',sans-serif;color:#f4f4f5">Steam Guard code</div></div>
      <div style="font:400 12.5px/1.6 'Geist',sans-serif;color:#a1a1aa;margin-bottom:12px">${Lk.guard === 'email' ? `Enter the code Steam emailed to your ${Lk.detail ? '@' + Lk.detail + ' ' : ''}address.` : 'Enter the code shown in the Steam Mobile app (Steam Guard).'}${Lk.canConfirm ? ' Or just approve the sign-in in the Steam Mobile app.' : ''}</div>
      <input class="fc-cyan" style="width:100%;padding:12px 14px;border-radius:11px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.03);color:#f4f4f5;font:700 24px 'Geist Mono',monospace;letter-spacing:.5em;text-transform:uppercase;outline:none;text-align:center" placeholder="•••••" maxlength="5" value=${Lk.code}
        onInput=${e => this.setLink({ code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) })} onKeyDown=${e => { if (e.key === 'Enter') this.linkGuard(); }} autocomplete="one-time-code" />
      ${Lk.error ? html`<div style="font:400 12px/1.5 'Geist',sans-serif;color:#fca5a5;margin-top:10px">${Lk.error}</div>` : null}
      <button style=${white(Lk.code.length === 5) + ';margin-top:14px'} onClick=${() => this.linkGuard()}>Verify and link →</button>`;
    else if (Lk.step === 'confirm') body = html`
      <div style="display:flex;flex-direction:column;align-items:center;padding:18px 0 8px;text-align:center">
        <span style="width:48px;height:48px;border-radius:14px;background:rgba(34,211,238,.1);border:1px solid rgba(34,211,238,.35);display:grid;place-items:center;color:#67e8f9">${I.phone}</span>
        <div style="font:600 14px 'Geist',sans-serif;color:#f4f4f5;margin-top:14px">Approve the sign-in</div>
        <div style="font:400 12.5px/1.6 'Geist',sans-serif;color:#a1a1aa;margin-top:6px">Steam sent a confirmation to your Steam Mobile app or email. Approve it and linking finishes here.</div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:14px;font:500 11.5px 'Geist Mono',monospace;color:#8d8d98">${Spin(10, 1.5)}Waiting for approval…</div>
      </div>`;
    else if (Lk.step === 'working') body = html`
      <div style="display:flex;flex-direction:column;align-items:center;padding:28px 0 12px;text-align:center">
        ${Spin(30, 3, 'border-color:rgba(255,255,255,.14);border-top-color:#22d3ee')}
        <div style="font:600 14px 'Geist',sans-serif;color:#f4f4f5;margin-top:16px">${Lk.work}</div>
      </div>`;
    else if (Lk.step === 'ok') body = html`
      <div style="display:flex;flex-direction:column;align-items:flex-start">
        <span style="width:48px;height:48px;border-radius:99px;background:rgba(74,222,128,.14);border:1px solid rgba(74,222,128,.5);display:grid;place-items:center">${I.check(22, '#4ade80', 3)}</span>
        <div style="font:700 18px 'Geist',sans-serif;color:#f4f4f5;margin-top:14px">${name} is linked</div>
        <div style="font:400 12.5px/1.6 'Geist',sans-serif;color:#a1a1aa;margin-top:6px">Fetching stats now. That takes about 5–15 seconds. Unlocked:</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px">
          ${['Steam account', 'Games + hours', 'CS2 ranks', 'Medals'].map(t => html`<span style="font:600 10.5px 'Geist Mono',monospace;padding:4px 10px;border-radius:99px;background:rgba(255,255,255,.06);color:#d4d4d8;border:1px solid rgba(255,255,255,.14)">${t}</span>`)}
        </div>
        <button class="hv-cyanbg" style="width:100%;margin-top:20px;padding:11px 14px;border:0;border-radius:11px;background:#fff;color:#0a0a0c;font:600 13px 'Geist',sans-serif;cursor:pointer;text-align:left" onClick=${() => this.setState({ link: null, tab: 'games' })}>See stats →</button>
      </div>`;
    else if (Lk.step === 'fail') body = html`
      <div style="display:flex;flex-direction:column;align-items:flex-start">
        <span style="width:48px;height:48px;border-radius:99px;background:rgba(248,113,113,.12);border:1px solid rgba(248,113,113,.5);display:grid;place-items:center;color:#f87171">${I.x(22, 3)}</span>
        <div style="font:700 18px 'Geist',sans-serif;color:#f4f4f5;margin-top:14px">Couldn't link ${name}</div>
        <div style="font:400 12.5px/1.6 'Geist',sans-serif;color:#a1a1aa;margin-top:6px">${Lk.err}</div>
        <div style="display:flex;gap:8px;margin-top:20px;width:100%">
          <button class="hv-cyanbg" style="flex:1;padding:10px 14px;border:0;border-radius:11px;background:#fff;color:#0a0a0c;font:600 13px 'Geist',sans-serif;cursor:pointer;text-align:left" onClick=${toChoose}>Try again</button>
          <button class="hv-bd30" style="padding:10px 16px;border-radius:11px;border:1px solid rgba(255,255,255,.14);background:transparent;color:#c9c9d1;font:500 13px 'Geist',sans-serif;cursor:pointer" onClick=${() => this.closeLink()}>Cancel</button>
        </div>
      </div>`;

    return html`
<div style="position:absolute;inset:44px 0 0 0;z-index:58;background:rgba(4,4,7,.78);backdrop-filter:blur(10px);display:grid;place-items:center;animation:fade .2s ease">
  <div style="width:420px;max-width:calc(100% - 40px);background:#111116;border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:22px 24px 24px;box-shadow:0 30px 90px rgba(0,0,0,.65);animation:dfade .22s ease">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:18px">
      ${back ? html`<button class="hv-ghost" style="width:28px;height:28px;border-radius:8px;border:0;background:transparent;color:#a1a1aa;display:grid;place-items:center;cursor:pointer" onClick=${toChoose} aria-label="Back">${I.chevL}</button>` : null}
      <div><div style="font:600 10px 'Geist Mono',monospace;letter-spacing:.1em;color:#67e8f9">LINK ACCOUNT</div><div style="font:600 15px 'Geist',sans-serif;color:#f4f4f5;margin-top:2px">${name}</div></div>
      ${Lk.step !== 'working' ? html`<button class="hv-ghost" style="margin-left:auto;width:28px;height:28px;border-radius:8px;border:0;background:transparent;color:#a1a1aa;display:grid;place-items:center;cursor:pointer" onClick=${() => this.closeLink()} aria-label="Close">${I.x(14, 2)}</button>` : null}
    </div>
    ${body}
  </div>
</div>`;
  }

  renderToasts() {
    return html`
<div style="position:absolute;right:20px;bottom:56px;z-index:70;display:flex;flex-direction:column;gap:8px;align-items:flex-end;pointer-events:none">
  ${this.state.toasts.map(t => {
    const [fg, bd] = TOAST[t.type];
    return html`<div key=${t.id} style=${`pointer-events:auto;display:flex;align-items:flex-start;gap:11px;width:340px;background:#15151b;border:1px solid ${bd};border-radius:13px;padding:12px 10px 12px 14px;box-shadow:0 14px 44px rgba(0,0,0,.55);animation:tin .3s cubic-bezier(.22,1,.36,1)`}>
      <span style=${`flex:none;margin-top:1px;color:${fg};display:flex`}>${t.type === 'success' ? I.okCircle : t.type === 'info' ? I.info : t.type === 'warning' ? I.warn(16, 2.2) : I.errCircle}</span>
      <div style="flex:1;min-width:0">
        <div style="font:600 12.5px 'Geist',sans-serif;color:#f4f4f5">${t.title}</div>
        <div style="font:400 12px/1.45 'Geist',sans-serif;color:#a1a1aa;margin-top:2px">${t.msg}</div>
        ${t.action ? html`<button class="hv-w06" style=${`margin-top:8px;padding:5px 11px;border-radius:8px;border:1px solid ${bd};background:transparent;color:${fg};font:600 11.5px 'Geist',sans-serif;cursor:pointer`} onClick=${() => { this.dismiss(t.id); t.action.fn(); }}>${t.action.label}</button>` : null}
      </div>
      <button class="hv-ghost" style="flex:none;width:24px;height:24px;border-radius:7px;border:0;background:transparent;color:#7c7c88;display:grid;place-items:center;cursor:pointer" onClick=${() => this.dismiss(t.id)} aria-label="Dismiss">${I.x(12, 2.2)}</button>
    </div>`;
  })}
</div>`;
  }
}

render(html`<${App} />`, document.getElementById('root'));

// The tray panel: a small SwapDeck popup above the tray icon. Switch accounts, play a recent game,
// see and stop what's running, open or quit SwapDeck. Uses the app's theme and accent.

import { html, render, Component } from './vendor/htm-preact.js';
import { ACCENTS, WIN_ACCENT, themeTokens } from './theme.js';

const api = window.api;
const GRADS = ['#22d3ee,#4f46e5', '#2dd4bf,#0f766e', '#a78bfa,#6d28d9', '#94a3b8,#334155', '#fbbf24,#b45309', '#60a5fa,#1e3a8a', '#34d399,#065f46', '#f472b6,#9d174d', '#fb923c,#9a3412'];
const hash = s => { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
const initials = n => { const p = n.replace(/([a-z])([A-Z])/g, '$1 $2').split(/[^A-Za-z0-9]+/).filter(Boolean); return (p.length >= 2 ? p[0][0] + p[1][0] : (p[0] || n || '?').slice(0, 2)).toUpperCase(); };
const avBg = a => a.avatar ? `url("${a.avatar}") center/cover no-repeat,#111` : 'linear-gradient(150deg,' + GRADS[hash(a.sid) % GRADS.length] + ')';
function rel(ms) {
  if (!ms) return 'not played yet';
  const m = (Date.now() - ms) / 60000;
  if (m < 60) return Math.max(1, Math.floor(m)) + ' min ago';
  const h = m / 60; if (h < 24) return Math.floor(h) + ' h ago';
  const d = h / 24; return d < 2 ? 'yesterday' : d < 30 ? Math.floor(d) + ' days ago' : Math.floor(d / 30) + ' mo ago';
}
const H = "font:600 10.5px 'Geist Mono',monospace;letter-spacing:.1em;color:var(--text-subtle)";
const spin = s => html`<span style=${`width:${s}px;height:${s}px;box-sizing:border-box;border-radius:99px;border:2px solid rgba(var(--fg-rgb),.2);border-top-color:var(--accent);animation:spin .8s linear infinite;display:inline-block`}></span>`;

class Tray extends Component {
  state = { d: null, switching: null };

  componentDidMount() {
    this.load();
    this._off = ['tray-show', 'steam', 'accounts', 'launch', 'launch-end', 'switch'].map(ch => api.on(ch, () => this.load()));
    this._key = e => { if (e.key === 'Escape') api.trayHide(); };
    window.addEventListener('keydown', this._key);
    this._ro = new ResizeObserver(() => { if (this._box) api.traySize(this._box.offsetHeight); });
  }
  componentWillUnmount() { this._off.forEach(f => f()); window.removeEventListener('keydown', this._key); this._ro.disconnect(); }
  async load() { const d = await api.trayData(); if (d) this.setState({ d }); }
  boxRef = el => { if (el && el !== this._box) { this._box = el; this._ro.observe(el); } };

  applyTheme(el, d) {
    if (!el || !d) return;
    const s = d.settings || {};
    const acc = s.accent === 'windows' ? (d.winAccent || WIN_ACCENT) : s.accent === 'custom' ? (s.customAccent || '#c084fc') : (ACCENTS.find(a => a[0] === s.accent) || ACCENTS[0])[2];
    const t = themeTokens(s.base || 'dark', acc, !!s.reduceMotion);
    for (const n in t) el.style.setProperty('--' + n, t[n]);
  }

  async switchTo(a) {
    if (this.state.switching) return;
    this.setState({ switching: a.sid });
    await api.switchTo(a.sid);
    this.setState({ switching: null });
    this.load();
  }
  async play(g) { api.trayHide(); await api.play(g.id); }

  render() {
    const { d, switching } = this.state;
    if (!d) return null;
    const st = d.steam, cur = st.running ? d.accounts.find(a => a.sid === st.activeSid) : null, sess = d.session;
    const sg = sess && d.games.find(g => g.id === sess.gid);
    const busy = !!st.busy || !!switching;
    const status = !st.found ? ['#f87171', 'Steam not found'] : switching ? ['var(--accent)', 'Switching…'] : st.busy ? ['var(--accent)', st.busy === 'closing' ? 'Closing Steam…' : 'Starting Steam…']
      : cur ? ['#4ade80', cur.name] : st.running ? ['#4ade80', 'Steam running'] : ['var(--text-subtle)', 'Steam closed'];
    const accts = [...d.accounts].sort((x, y) => (+y.pinned - +x.pinned) || (y.lastUsed - x.lastUsed));
    return html`
<div ref=${el => { this.boxRef(el); this.applyTheme(el, d); }} style="box-sizing:border-box;width:100%;background:var(--surface);border:1px solid var(--border);border-radius:16px;overflow:hidden;color:var(--text);font-family:'Geist',sans-serif;user-select:none">
  <div style="display:flex;align-items:center;gap:10px;padding:14px 16px 12px;border-bottom:1px solid rgba(var(--fg-rgb),.06)">
    <div style="position:relative;width:24px;height:24px;flex:none;border-radius:8px;background:linear-gradient(135deg,var(--accent),var(--accent-2))"><span style="position:absolute;left:5px;top:5px;width:8px;height:8px;border-radius:3px;background:rgba(255,255,255,.95)"></span><span style="position:absolute;right:5px;bottom:5px;width:8px;height:8px;border-radius:3px;background:rgba(10,10,14,.55);border:1.5px solid rgba(255,255,255,.95);box-sizing:border-box"></span></div>
    <span style="font:700 13.5px 'Geist',sans-serif">SwapDeck</span>
    <span style="margin-left:auto;display:flex;align-items:center;gap:7px;max-width:180px;padding:4px 10px;border-radius:99px;background:rgba(var(--fg-rgb),.05);border:1px solid rgba(var(--fg-rgb),.08);font:500 11.5px 'Geist',sans-serif;color:var(--text-soft)"><span style=${`width:7px;height:7px;flex:none;border-radius:99px;background:${status[0]}`}></span><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${status[1]}</span></span>
  </div>

  ${sess ? html`<div style="display:flex;align-items:center;gap:12px;margin:12px 12px 0;padding:10px 12px;border-radius:12px;background:rgba(74,222,128,.07);border:1px solid rgba(74,222,128,.3)">
    <span style=${`width:34px;height:46px;flex:none;border-radius:7px;background:${sg && sg.cover ? `url("${sg.cover}") center/cover` : 'rgba(var(--fg-rgb),.1)'}`}></span>
    <div style="flex:1;min-width:0"><div style="font:600 10px 'Geist Mono',monospace;letter-spacing:.1em;color:var(--ok-fg)">${sess.running ? 'NOW PLAYING' : 'LAUNCHING'}</div><div style="font:600 13px 'Geist',sans-serif;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${sg ? sg.name : 'Game'}</div></div>
    <button class="tp-stop" style="padding:6px 10px;border-radius:9px;border:1px solid rgba(248,113,113,.35);background:transparent;color:var(--bad-fg);font:500 11.5px 'Geist',sans-serif;cursor:pointer;flex:none" onClick=${() => api.stopGame()} title="Restores your display and stops tracking. The game keeps running.">Stop</button>
  </div>` : null}

  ${d.accounts.length ? html`<div style="padding:14px 12px 4px">
    <div style=${H + ';padding:0 4px 10px'}>SWITCH ACCOUNT</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px 6px">
      ${accts.map(a => {
        const isCur = cur && cur.sid === a.sid, sw = switching === a.sid, dis = !st.found || busy || isCur;
        return html`<button class="tp-av" style=${`display:flex;flex-direction:column;align-items:center;gap:6px;border:0;background:transparent;padding:2px 0;color:inherit;cursor:${dis ? 'default' : 'pointer'};transition:transform .15s;min-width:0`} onClick=${() => !dis && this.switchTo(a)} title=${isCur ? a.name + ' · signed in now' : 'Switch to ' + a.name}>
          <span style=${`position:relative;width:52px;height:52px;border-radius:16px;background:${avBg(a)};display:grid;place-items:center;font:600 15px 'Geist Mono',monospace;color:#fff;box-shadow:${isCur ? '0 0 0 2px var(--surface),0 0 0 4px var(--accent)' : '0 0 0 1px rgba(var(--fg-rgb),.12)'};opacity:${busy && !sw ? .5 : 1}`}>${a.avatar ? null : initials(a.name)}${sw ? html`<span style="position:absolute;inset:0;border-radius:16px;background:rgba(0,0,0,.55);display:grid;place-items:center">${spin(18)}</span>` : null}</span>
          <span style=${`max-width:100%;font:500 11px 'Geist',sans-serif;color:${isCur ? 'var(--accent-strong)' : 'var(--text-soft)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis`}>${a.name}</span>
        </button>`;
      })}
    </div>
  </div>` : null}

  ${d.games.length ? html`<div style="padding:12px 8px 6px">
    <div style=${H + ';padding:0 8px 6px'}>PLAY</div>
    ${d.games.map(g => {
      const dis = !!sess;
      return html`<div class="tp-row" style=${`display:flex;align-items:center;gap:11px;padding:6px 8px;border-radius:10px;cursor:${dis ? 'default' : 'pointer'};opacity:${dis && !(sess && sess.gid === g.id) ? .5 : 1}`} onClick=${() => !dis && this.play(g)}>
        <span style=${`width:28px;height:38px;flex:none;border-radius:6px;background:${g.cover ? `url("${g.cover}") center/cover,rgba(var(--fg-rgb),.08)` : 'rgba(var(--fg-rgb),.1)'}`}></span>
        <div style="flex:1;min-width:0"><div style="font:600 12.5px 'Geist',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${g.name}</div><div style="font:500 10.5px 'Geist Mono',monospace;color:var(--text-subtle)">${sess && sess.gid === g.id ? 'running' : rel(g.lastPlayed)}</div></div>
        ${dis ? null : html`<span class="tp-play" style="width:28px;height:28px;flex:none;border-radius:99px;background:var(--accent);color:var(--accent-contrast);display:grid;place-items:center;opacity:0;transition:opacity .15s"><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="7 4 20 12 7 20 7 4"/></svg></span>`}
      </div>`;
    })}
  </div>` : null}

  <div style="display:flex;gap:8px;padding:10px 12px 12px;border-top:1px solid rgba(var(--fg-rgb),.06);margin-top:6px">
    <button class="tp-main" style="flex:1;padding:9px 12px;border:0;border-radius:10px;background:var(--btn-bg);color:var(--btn-fg);font:600 12.5px 'Geist',sans-serif;cursor:pointer" onClick=${() => api.trayOpen()}>Open SwapDeck</button>
    <button class="tp-btn" style="padding:9px 14px;border-radius:10px;border:1px solid rgba(var(--fg-rgb),.12);background:transparent;color:var(--text-muted);font:500 12.5px 'Geist',sans-serif;cursor:pointer" onClick=${() => api.trayQuit()}>Quit</button>
  </div>
</div>`;
  }
}

render(html`<${Tray} />`, document.getElementById('root'));

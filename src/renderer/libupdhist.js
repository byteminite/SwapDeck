// Updates page extras: what Steam updated lately (read from its app manifests) and "Play when done".
import { html } from './vendor/htm-preact.js';
import { icon } from './libicons.js';

const DAY = 86400000;
const gb = bytes => bytes >= 1073741824 ? (bytes / 1073741824).toFixed(1) + ' GB' : Math.max(1, Math.round(bytes / 1048576)) + ' MB';
const midnight = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
function when(t) {
  const d = Math.round((midnight(Date.now()) - midnight(t)) / DAY);
  return d === 0 ? 'Today' : d === 1 ? 'Yesterday' : d < 7 ? new Date(t).toLocaleDateString('en-GB', { weekday: 'long' }) : d + ' days ago';
}

export function loadUpdHistory(app) {
  if (app._uhAt && Date.now() - app._uhAt < 60000) return;
  app._uhAt = Date.now();
  window.api.libUpdHistory().then(list => app.setState({ updHist: Array.isArray(list) ? list : [] })).catch(() => {});
}

export function updHistVals(app) {
  const S = app.state, today = midnight(Date.now());
  const hist = (S.updHist || []).map(h => ({ ...h, g: S.lib.find(g => g.steam && String(g.appid) === h.appid) })).filter(h => h.g);
  const days = [6, 5, 4, 3, 2, 1, 0].map(n => today - n * DAY), week = hist.filter(h => h.at >= days[0]);
  const vals = days.map(d => week.filter(h => h.at >= d && h.at < d + DAY).reduce((t, h) => t + h.bytes, 0)), max = Math.max(1, ...vals);
  return {
    week: { count: new Set(week.map(h => h.appid)).size, total: gb(week.reduce((t, h) => t + h.bytes, 0)),
      bars: vals.map((v, i) => ({ h: Math.max(6, v / max * 100), on: i === 6, tip: v ? gb(v) : 'Nothing', label: new Date(days[i]).toLocaleDateString('en-GB', { weekday: 'short' }) })) },
    recent: hist.slice(0, 6).map(h => ({ name: h.g.name, cover: app.cardBg(h.g), sub: when(h.at) + (h.bytes ? ' · ' + gb(h.bytes) : ''), open: () => app.openGame(h.g.id) })),
  };
}

export function updHistCards(H) {
  const week = html`<div class="uq-card"><h3>This week</h3><div class="uq-stats"><div class="uq-stat"><label>Games updated</label><b>${H.week.count}</b></div><div class="uq-stat"><label>Downloaded</label><b>${H.week.count ? H.week.total : '0 MB'}</b></div></div>
<div class="uq-bars">${H.week.bars.map(b => html`<i class=${b.on ? 'on' : ''} style=${'height:' + b.h + '%'} title=${b.label + ': ' + b.tip}></i>`)}</div><div class="uq-days">${H.week.bars.map(b => html`<span>${b.label}</span>`)}</div></div>`;
  const recent = H.recent.length ? html`<div class="uq-card"><h3>Recently updated</h3>${H.recent.map(r => html`<button class="uq-done" onClick=${r.open}><span class="uq-dth" style=${'background:' + r.cover}></span><span class="uq-m"><b>${r.name}</b><span>${r.sub}</span></span><span class="uq-link">Patch notes</span></button>`)}</div>` : null;
  return html`${week}${recent}`;
}

// "Play when done": games waiting for their update, started once Steam reports them up to date.
export function togglePwd(app, g) {
  const on = !(app.state.pwd || {})[g.id];
  app.setState(s => { const pwd = { ...(s.pwd || {}) }; if (on) pwd[g.id] = true; else delete pwd[g.id]; return { pwd }; });
  app.toast('info', on ? g.name + ' starts when the update finishes' : g.name + " won't start by itself", on ? 'Keep SwapDeck open (the tray is fine) until then.' : '');
}

export function playWhenDone(app, libUpd) {
  const pwd = app.state.pwd || {}, ids = Object.keys(pwd);
  if (!ids.length) return;
  const left = { ...pwd };
  for (const id of ids) {
    const g = app.gfind(id), st = g && libUpd[g.appid];
    if (g && st && st.state !== 'failed') continue;
    delete left[id];
    if (!g) continue;
    if (st) app.toast('warning', g.name + " didn't finish updating", 'Steam stopped the update, so it won\'t start by itself.');
    else if (app.state.launch) app.toast('info', g.name + ' is up to date', 'Another game is running, so it waits for you to press Play.');
    else { app.toast('success', g.name + ' is up to date', 'Starting it now.'); app.play(g.id); }
  }
  app.setState({ pwd: left });
}

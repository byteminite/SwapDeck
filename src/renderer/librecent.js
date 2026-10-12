// Library layout: Recently played (running or last game, Jump back in, sessions by day, this week, accounts).
import { html } from './vendor/htm-preact.js';
import { icon } from './libicons.js';
import { card, libList } from './libgamesvals.js';
import { cover } from './libgames.js';

const DAY = 86400000;
const short = n => String(n).replace(/\s*\(.*\)\s*$/, '') || n;
// The setup a session ran with (saved from 1.5.0 on), as small tags.
const setupTags = u => !u ? [] : [u.disp && ['monitor', u.disp + (u.res ? ' · ' + u.res : '')], !u.disp && u.res && ['monitor', u.res], u.snd && ['headphones', short(u.snd)], u.apps && u.apps.length && ['app', u.apps.join(', ')]].filter(Boolean);
const avBg = a => a.avatar ? 'url("' + a.avatar + '") center/cover no-repeat,#111' : a.grad;
const fmt = ms => { const m = Math.round(ms / 60000); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + String(m % 60).padStart(2, '0') + ' min' : ''); };
const clock = t => new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const midnight = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
function dayLabel(t, today) {
  const diff = Math.round((today - midnight(t)) / DAY);
  return diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : diff < 7 ? new Date(t).toLocaleDateString('en-GB', { weekday: 'long' }) : new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', ...(new Date(t).getFullYear() !== new Date(today).getFullYear() ? { year: 'numeric' } : {}) });
}

function hero(app, L) {
  const S = app.state;
  if (L && L.running) {
    const g = app.gfind(L.gid), a = L.acct && app.find(L.acct);
    if (g) return { g, live: true, label: 'Running now' + (a ? ' on ' + a.name : ''), text: 'Stop puts your display and sound back. It never closes the game.', a };
  }
  const g = libList(app).filter(x => x.installed && x.lastPlayed).sort((x, y) => y.lastPlayed - x.lastPlayed)[0];
  return g ? { g, live: false, label: 'Last played ' + dayLabel(g.lastPlayed, midnight(Date.now())).toLowerCase(), text: g.hours ? Math.round(g.hours).toLocaleString() + ' h played' : '' } : null;
}

// Newest unlocks come from Steam's files on this PC; read again when the recent games change or after a minute.
function loadAch(app) {
  const ids = app.state.lib.filter(g => g.steam && g.installed && g.lastPlayed).sort((x, y) => y.lastPlayed - x.lastPlayed).slice(0, 12).map(g => String(g.appid));
  const key = ids.join(',');
  if (app._achKey === key && Date.now() - app._achAt < 60000) return;
  app._achKey = key; app._achAt = Date.now();
  window.api.recentAchievements(ids).then(list => app.setState({ recentAch: Array.isArray(list) ? list : [] })).catch(() => {});
}

function achRows(app, today) {
  return (app.state.recentAch || []).map(x => {
    const g = app.state.lib.find(y => y.steam && String(y.appid) === x.appid), a = app.find(x.sid);
    if (!g) return null;
    return { name: x.name, icon: x.icon ? 'url("' + x.icon + '") center/cover no-repeat,#2c2c31' : app.cardBg(g), sub: g.name + (a ? ' · ' + a.name : '') + ' · ' + dayLabel(x.at, today),
      open: () => { app.openGame(g.id); app.setState({ lgTab: 'ach' }); } };
  }).filter(Boolean);
}

export function libRecentVals(app) {
  const S = app.state, L = S.launch, now = Date.now(), today = midnight(now), me = app.accts.find(a => a.current);
  loadAch(app);
  const H = hero(app, L), weekAgo = today - 6 * DAY;
  const sess = (S.sessions || []).filter(s => app.gfind(s.gid)).slice(0, 40);
  const week = sess.filter(s => s.start >= weekAgo);
  const ids = [...new Set(sess.map(s => s.gid))].filter(id => !(L && L.gid === id));
  const rest = libList(app).filter(g => g.installed && g.lastPlayed && !ids.includes(g.id) && !(L && L.gid === g.id)).sort((x, y) => y.lastPlayed - x.lastPlayed).map(g => g.id);
  const jump = [...ids, ...rest].map(id => app.gfind(id)).filter(g => g && g.installed).slice(0, 12).map(g => card(app, g, me, L));
  let day = '';
  const rows = sess.slice(0, 14).map(s => { const g = app.gfind(s.gid), a = app.find(s.sid), d = dayLabel(s.start, today), head = d !== day ? d : null; day = d;
    return { head, name: g.name, cap: app.cardBg(g), who: a ? a.name : 'Unknown account', dot: a ? avBg(a) : 'rgba(var(--fg-rgb),.14)', time: clock(s.start) + (s.ms ? ' to ' + clock(s.start + s.ms) : ''), dur: s.ms ? fmt(s.ms) : 'a moment', tags: setupTags(s.setup), open: () => app.openGame(g.id) }; });
  const mode = S.lrWk || 'h', days = [6, 5, 4, 3, 2, 1, 0].map(n => today - n * DAY);
  const vals = days.map(d => week.filter(s => s.start >= d && s.start < d + DAY).reduce((t, s) => t + (mode === 'h' ? s.ms / 3600000 : 1), 0));
  const max = Math.max(1e-9, ...vals), total = vals.reduce((t, v) => t + v, 0);
  const accts = app.accts.map(a => { const mine = week.filter(s => s.sid === a.id), live = L && L.running && L.acct === a.id && app.gfind(L.gid);
    return { name: a.name, ini: a.avatar ? '' : a.ini, bg: avBg(a), cur: a.current, line: live ? 'Playing ' + live.name + ' now' : mine.length ? app.gfind(mine[0].gid).name + ' · ' + fmt(mine.reduce((t, s) => t + s.ms, 0)) + ' this week' : 'Not played this week', liveOn: !!live, swOff: !!L, sw: () => app.switchTo(a.id) }; });
  return {
    hero: H && { name: H.g.name, bg: H.g.steam && H.g.hero ? 'url("' + H.g.hero + '") center/cover no-repeat,' + app.gradOf(H.g) : app.cardBg(H.g), live: H.live, label: H.label, text: H.text,
      onPlay: () => app.play(H.g.id), onShow: () => app.setState(s => ({ launch: s.launch && { ...s.launch, hidden: false } })), onStop: () => app.stopGame(), onOpen: () => app.openGame(H.g.id) },
    jump, rows, sessN: week.length, sessT: fmt(week.reduce((t, s) => t + s.ms, 0)),
    week: { mode, total: mode === 'h' ? total.toFixed(1) + ' h' : String(total), sub: mode === 'h' ? 'played through SwapDeck' : 'sessions', bars: vals.map((v, i) => ({ h: Math.max(4, v / max * 78), today: i === 6, label: new Date(days[i]).toLocaleDateString('en-GB', { weekday: 'short' }), v: mode === 'h' ? (v ? v.toFixed(1) : '') : (v || '') })),
      pick: k => () => app.setState({ lrWk: k }) },
    accts, ach: achRows(app, today),
  };
}

export function recentPage(R) {
  const h = R.hero;
  const top = h ? html`<div class="rp-hero" style=${'background:' + h.bg}><div class="rp-hin"><div><span class=${'rp-lbl' + (h.live ? ' live' : '')}>${h.live ? html`<i></i>` : icon('history', 14)}${h.label}</span><h2>${h.name}</h2>${h.text ? html`<p>${h.text}</p>` : null}</div>
<div class="rp-btns">${h.live ? html`<button class="gp-chip" onClick=${h.onStop}>${icon('x', 16)}Stop</button><button class="gp-cta" onClick=${h.onShow}>${icon('grid', 17)}Show game</button>` : html`<button class="gp-chip" onClick=${h.onOpen}>${icon('info', 16)}Details</button><button class="gp-cta" onClick=${h.onPlay}>${icon('play', 17)}Continue playing</button>`}</div></div></div>`
    : html`<div class="lg-empty">Nothing played yet. Press Play on a game and it shows up here.</div>`;
  const jump = R.jump.length ? html`<div class="rp-h">Jump back in</div><div class="lg-grid rp-jump">${R.jump.map(cover)}</div>` : null;
  const sess = html`<div><div class="rp-h">Recent sessions <small>${R.sessN} this week · ${R.sessT}</small></div>${R.rows.length ? R.rows.map(r => html`${r.head ? html`<div class="rp-day">${r.head}</div>` : null}<button class="rp-s" onClick=${r.open}><span class="rp-cap" style=${'background:' + r.cap}></span><span class="rp-sm"><b>${r.name}</b><span><i style=${'background:' + r.dot}></i>${r.who} · ${r.time}</span></span>${r.tags.length ? html`<span class="rp-tags">${r.tags.map(([ic, l]) => html`<span class="rp-tag" title=${l}>${icon(ic, 12)}<span>${l}</span></span>`)}</span>` : null}<span class="rp-dur">${r.dur}</span></button>`) : html`<div class="rp-none">Sessions you play through SwapDeck show up here.</div>`}</div>`;
  const W = R.week;
  const week = html`<div class="rp-card"><h3>This week<span class="su-seg"><button class=${W.mode === 'h' ? 'on' : ''} onClick=${W.pick('h')}>Hours</button><button class=${W.mode === 's' ? 'on' : ''} onClick=${W.pick('s')}>Sessions</button></span></h3><div class="rp-big">${W.total}<small>${W.sub}</small></div>
<div class="rp-bars">${W.bars.map(b => html`<div class=${b.today ? 'today' : ''}><em>${b.v}</em><i style=${'height:' + b.h + '%'}></i><span>${b.label}</span></div>`)}</div></div>`;
  const accts = html`<div class="rp-card"><h3>Your accounts this week</h3>${R.accts.map(a => html`<div class="rp-row"><span class="rp-av" style=${'background:' + a.bg}>${a.ini}</span><div class="rp-rm"><b>${a.name}</b><span class=${a.liveOn ? 'now' : ''}>${a.line}</span></div>${a.cur ? html`<span class="rp-mini cur">Signed in</span>` : html`<button class="rp-mini" disabled=${a.swOff} title=${a.swOff ? 'Stop the game first to switch accounts' : null} onClick=${a.sw}>Switch</button>`}</div>`)}</div>`;
  return html`<div class="rp-page">${top}${jump}<div class="rp">${sess}<div class="rp-side">${week}${accts}${R.ach.length ? html`<div class="rp-card"><h3>Latest achievements</h3>${R.ach.map(x => html`<button class="rp-row rp-ach" onClick=${x.open}><span class="rp-aic" style=${'background:' + x.icon}></span><span class="rp-rm"><b>${x.name}</b><span>${x.sub}</span></span></button>`)}</div>` : null}</div></div></div>`;
}

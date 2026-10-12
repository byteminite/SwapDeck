// Library layout: Updates (what Steam is updating right now and what is waiting). Steam does the downloading;
// this page only reads its state, so pausing or reordering happens in Steam's own Downloads page.
import { html } from './vendor/htm-preact.js';
import { icon } from './libicons.js';
import { updateBadge } from './updatebadge.js';
import { accountsOf } from './libgrid.js';
import { loadUpdHistory, updHistVals, updHistCards, togglePwd } from './libupdhist.js';

const BUSY = ['downloading', 'verifying'];
const gb = bytes => bytes >= 1073741824 ? (bytes / 1073741824).toFixed(1) + ' GB' : Math.max(1, Math.round(bytes / 1048576)) + ' MB';
const WAIT_TEXT = { queued: 'Next in line', paused: 'Paused in Steam', failed: 'Steam could not finish it' };
const CHIP = { queued: ['QUEUED', 'warn'], paused: ['PAUSED', 'warn'], failed: ['FAILED', 'bad'] };

function whoPlays(app, g) {
  const id = g.acct || accountsOf(g)[0], a = id && app.find(id);
  return a ? a.name : '';
}

export function updatingGames(app) {
  const hidden = new Set(app.state.settings.hiddenGames || []);
  return app.state.lib.filter(g => g.steam && g.installed && !hidden.has(g.id) && updateBadge(app.state.libUpd[g.appid]));
}

export function libUpdVals(app) {
  const S = app.state, list = updatingGames(app), pwd = S.pwd || {};
  loadUpdHistory(app);
  const row = g => {
    const st = S.libUpd[g.appid], busy = BUSY.includes(st.state), done = st.bytes && st.pct ? st.bytes * st.pct / 100 : 0;
    const what = st.state === 'verifying' ? 'Verifying files' : st.staging ? 'Installing' : 'Downloading';
    return { name: g.name, cover: app.cardBg(g), hero: g.hero ? 'url("' + g.hero + '") center 30%/cover no-repeat,' + app.gradOf(g) : app.cardBg(g), pct: st.pct || 0, busy,
      who: whoPlays(app, g), chip: CHIP[st.state] || null, pwd: !!pwd[g.id], canPwd: st.state !== 'failed',
      onPwd: e => { e.stopPropagation(); togglePwd(app, g); },
      line: busy ? what + (st.bytes ? ' · ' + gb(done) + ' of ' + gb(st.bytes) : '') : (WAIT_TEXT[st.state] || 'Waiting') + (st.bytes ? ' · ' + gb(st.bytes) : ''),
      open: () => app.openGame(g.id), onKey: e => { if (e.key === 'Enter' && e.target === e.currentTarget) app.openGame(g.id); } };
  };
  const now = list.filter(g => BUSY.includes(S.libUpd[g.appid].state)).map(row), wait = list.filter(g => !BUSY.includes(S.libUpd[g.appid].state)).map(row);
  const left = list.reduce((t, g) => { const st = S.libUpd[g.appid]; return t + (st.bytes ? st.bytes * (100 - (st.pct || 0)) / 100 : 0); }, 0);
  return { now, wait, left: left ? gb(left) : '0 MB', hist: updHistVals(app), onSteam: () => window.api.openSteamPage('downloads', 0) };
}

const pwdBtn = r => r.canPwd ? html`<button class=${'uq-btn' + (r.pwd ? ' on' : '')} aria-pressed=${r.pwd} onClick=${r.onPwd}>${icon(r.pwd ? 'check' : 'play', 15)}${r.pwd ? 'Plays when done' : 'Play when done'}</button>` : null;
const steamBtn = U => html`<button class="uq-btn" onClick=${U.onSteam}>${icon('external', 15)}Open Steam downloads</button>`;

function heroCard(r) {
  return html`<div class="uq-hero" role="button" tabindex="0" style=${'background:' + r.hero} onClick=${r.open} onKeyDown=${r.onKey}><div class="uq-hin"><span class="uq-hcv" style=${'background:' + r.cover}></span>
<div class="uq-m"><div class="uq-k">UPDATING NOW${r.who ? ' · PLAYS AS ' + r.who.toUpperCase() : ''}</div><b>${r.name}</b><div class="uq-s"><i></i>${r.line}</div><div class="uq-prog"><i style=${'width:' + r.pct + '%'}></i></div></div>
<div class="uq-r"><span class="uq-pct big">${r.pct}%</span>${pwdBtn(r)}</div></div></div>`;
}

function row(r) {
  return html`<div class="uq-row" role="button" tabindex="0" onClick=${r.open} onKeyDown=${r.onKey}><span class="uq-th" style=${'background:' + r.cover}></span>
<div class="uq-m"><b>${r.name}</b><div class=${'uq-s' + (r.busy ? '' : ' wait')}><i></i>${r.line}</div>${r.busy ? html`<div class="uq-prog"><i style=${'width:' + r.pct + '%'}></i></div>` : null}</div>
${r.busy ? html`<span class="uq-pct">${r.pct}%</span>` : r.chip ? html`<span class=${'uq-chip ' + r.chip[1]}>${r.chip[0]}</span>` : null}${pwdBtn(r)}</div>`;
}

export function updPage(U) {
  const n = U.now.length + U.wait.length;
  const top = n ? html`<div class="uq-top"><span class="uq-ic">${icon('refresh', 20)}</span><div><b>${U.now.length ? 'Steam is updating ' + (U.now.length === 1 ? U.now[0].name : U.now.length + ' games') : 'Updates waiting'}</b><span>${U.wait.length && U.now.length ? U.wait.length + ' more waiting. ' : ''}Steam downloads them, SwapDeck keeps an eye on it.</span></div><div class="uq-sp"></div>${steamBtn(U)}</div>`
    : html`<div class="uq-top"><span class="uq-ic ok">${icon('check2', 20)}</span><div><b>Everything is up to date</b><span>When Steam updates a game, it shows up here.</span></div><div class="uq-sp"></div>${steamBtn(U)}</div>`;
  const nowHTML = U.now.length ? html`<div class="uq-sec">${heroCard(U.now[0])}${U.now.slice(1).map(row)}</div>` : null;
  const waitHTML = U.wait.length ? html`<div class="uq-sec"><div class="uq-h">Waiting <small>${U.wait.length}</small></div>${U.wait.map(row)}</div>`
    : n ? html`<div class="uq-empty">${icon('check2', 18)}Nothing else is waiting. Steam checks for updates by itself.</div>` : null;
  const side = html`<aside class="uq-side">${n ? html`<div class="uq-card"><h3>Right now</h3><div class="uq-stats"><div class="uq-stat"><label>Updating</label><b>${U.now.length}</b></div><div class="uq-stat"><label>Waiting</label><b>${U.wait.length}</b></div><div class="uq-stat wide"><label>Left to download</label><b>${U.left}</b></div></div></div>` : null}${updHistCards(U.hist)}
<div class="uq-note">${icon('info', 16)}<span>Steam does the downloading. To pause, reorder or start an update, use Open Steam downloads. Play when done starts a game as soon as Steam finishes, while SwapDeck is open.</span></div></aside>`;
  return html`<div class="uq"><div class="uq-main">${top}${nowHTML}${waitHTML}</div>${side}</div>`;
}

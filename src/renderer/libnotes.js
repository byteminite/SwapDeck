// Library layout: notifications under the bell. Built from live state on every render (nothing is stored but
// which ones were read), so a note disappears by itself once its cause is gone.
import { html } from './vendor/htm-preact.js';
import { icon } from './libicons.js';
import { updateBadge } from './updatebadge.js';
import { updatingGames } from './libupd.js';

const TABS = [['all', 'All'], ['update', 'Updates'], ['account', 'Accounts']];
const TINT = { good: ['rgba(126,232,166,.14)', 'var(--ls-good)'], warn: ['rgba(255,210,122,.14)', 'var(--ls-warn)'], acc: ['rgba(var(--accent-rgb),.14)', 'var(--accent-light)'], bad: ['rgba(255,154,139,.14)', '#ff9a8b'] };
const gb = b => b >= 1073741824 ? (b / 1073741824).toFixed(1) + ' GB' : Math.max(1, Math.round(b / 1048576)) + ' MB';

// Re-render when the PC goes on or offline (navigator.onLine has no state of its own in the app).
function watchNet(app) {
  if (app._netHook) return;
  app._netHook = () => app.forceUpdate();
  window.addEventListener('online', app._netHook);
  window.addEventListener('offline', app._netHook);
}

export function notesList(app) {
  watchNet(app);
  const S = app.state, out = [], add = n => out.push(n), go = k => () => app.setState({ libPage: k, gd: null, drawerId: null, setOpen: false });
  const steam = app.steamState, L = S.launch;
  if (!navigator.onLine) add({ id: 'st-offline', kind: 'system', ic: 'alert', tone: 'warn', title: "You're offline", body: 'Switching and playing still work. News and stats come back when you reconnect.' });
  if (steam === 'not-found') add({ id: 'st-nosteam', kind: 'system', ic: 'search', tone: 'warn', title: "SwapDeck can't find Steam", body: 'Install Steam, or point SwapDeck to the folder steam.exe is in.', act: 'Find Steam', go: () => app.browse() });
  else if (steam !== 'running') add({ id: 'st-closed', kind: 'system', ic: 'power', tone: 'acc', title: "Steam isn't running", body: 'Play and Switch start it for you. Game updates continue once it is open.', act: 'Start Steam', go: () => app.startSteam() });
  if (!app.accts.length) add({ id: 'st-noacct', kind: 'account', ic: 'userplus', tone: 'acc', title: 'Add your first Steam account', body: 'Then switching and playing take one click.', act: 'Add account', go: () => app.addAcc() });
  const run = L && L.running && app.gfind(L.gid), runA = L && L.acct && app.find(L.acct);
  // A new id for every play session, so each run shows as new once.
  if (!run) app._runKey = null; else if (!app._runKey || app._runKey.gid !== run.id) app._runKey = { gid: run.id, t: Date.now() };
  if (run) add({ id: 'run-' + run.id + '-' + app._runKey.t, kind: 'update', ic: 'gamepad', tone: 'good', art: app.cardBg(run), title: run.name + ' is running', body: (runA ? 'Started on ' + runA.name + '. ' : '') + 'Stop puts your display and sound back.', go: () => app.setState(s => ({ launch: s.launch && { ...s.launch, hidden: false } })) });
  for (const g of updatingGames(app)) {
    const st = S.libUpd[g.appid], b = updateBadge(st), busy = b.busy;
    add({ id: 'upd-' + g.appid + '-' + st.state, kind: 'update', ic: busy ? 'refresh' : st.state === 'failed' ? 'alert' : 'clock', tone: busy ? 'acc' : st.state === 'failed' ? 'bad' : 'warn', art: app.cardBg(g),
      title: busy ? g.name + ' is updating' : st.state === 'failed' ? g.name + "'s update didn't finish" : g.name + ' has an update ' + (st.state === 'paused' ? 'paused' : 'waiting'),
      body: busy ? st.pct + '%' + (st.bytes ? ' of ' + gb(st.bytes) : '') + '. Steam does the downloading.' : st.state === 'failed' ? 'Open Steam downloads to try again.' : 'Steam updates it when it gets to it.',
      prog: busy ? st.pct : null, go: go('upd') });
  }
  const un = app.accts.filter(a => !a.linked);
  if (un.length) add({ id: 'un-' + un.map(a => a.id).sort().join(','), kind: 'account', ic: 'link', tone: 'acc', title: un.length === 1 ? un[0].name + " isn't connected for stats" : un.length + " accounts aren't connected for stats", body: 'Connect them so SwapDeck knows which games they own.', act: un.length === 1 ? 'Connect' : 'Connect all', go: () => un.length === 1 ? app.openLink(un[0].id) : app.connectAll() });
  const u = S.update || {};
  if (u.state === 'ready') add({ id: 'app-' + u.version, kind: 'update', ic: 'check2', tone: 'good', title: 'SwapDeck ' + u.version + ' is ready', body: "Restart to finish the update. See what's new after.", act: 'Restart now', go: () => app.installUpdate() });
  else if (u.state === 'downloading') add({ id: 'appdl-' + u.version, kind: 'update', ic: 'download', tone: 'acc', title: 'Downloading SwapDeck ' + u.version, body: (u.percent || 0) + '%. It installs when you restart.', prog: u.percent || 0, go: () => app.openSettings('updates') });
  const read = S.settings.notesRead || [];
  return out.map(n => ({ ...n, unread: !read.includes(n.id) }));
}

export const unreadCount = app => notesList(app).filter(n => n.unread).length;

function markRead(app, ids) {
  const read = app.state.settings.notesRead || [];
  const next = [...read.filter(x => !ids.includes(x)), ...ids].slice(-200);
  app.setCfg({ notesRead: next });
}

export function libNotesVals(app) {
  if (!app.state.lsNotes) return null;
  const tab = app.state.ntTab || 'all', all = notesList(app);
  const list = all.filter(n => tab === 'all' || n.kind === tab || (tab === 'update' && n.kind === 'system'));
  const close = () => app.setState({ lsNotes: false });
  return {
    tabs: TABS.map(([k, label]) => ({ label, on: tab === k, pick: () => app.setState({ ntTab: k }) })),
    unread: all.filter(n => n.unread).length, close,
    markAll: () => markRead(app, all.map(n => n.id)),
    list: list.map(n => ({ ...n, open: () => { markRead(app, [n.id]); close(); if (n.go) n.go(); } })),
  };
}

export function notesPanel(P) {
  const item = n => html`<div class=${'nt-i' + (n.unread ? '' : ' read')} role="button" tabindex="0" onClick=${n.open} onKeyDown=${e => { if (e.key === 'Enter' && e.target === e.currentTarget) n.open(); }}>
<span class="nt-ic" style=${n.art ? 'background:' + n.art : 'background:' + TINT[n.tone][0] + ';color:' + TINT[n.tone][1]}>${n.art ? null : icon(n.ic, 16)}</span>
<div class="nt-tx"><b>${n.title}</b><span>${n.body}</span>${n.prog != null ? html`<div class="nt-prog"><i style=${'width:' + n.prog + '%'}></i></div>` : null}${n.act ? html`<button class="nt-act" onClick=${e => { e.stopPropagation(); n.open(); }}>${n.act}</button>` : null}</div>
${n.unread ? html`<i class="nt-dot" aria-label="Unread"></i>` : null}</div>`;
  return html`<div class="lg-catch" onClick=${P.close}></div><div class="nt" role="dialog" aria-label="Notifications">
<div class="nt-h"><b>Notifications</b><span>${P.unread ? P.unread + ' new' : ''}</span><button class="nt-all" disabled=${!P.unread} onClick=${P.markAll}>Mark all read</button></div>
<div class="nt-tabs">${P.tabs.map(t => html`<button class=${t.on ? 'on' : ''} aria-pressed=${t.on} onClick=${t.pick}>${t.label}</button>`)}</div>
<div class="nt-list">${P.list.length ? P.list.map(item) : html`<div class="nt-none">${icon('check2', 18)}<span>You're all caught up.</span></div>`}</div></div>`;
}

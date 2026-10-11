// Props for the Library layout shell, built from the App component's state.
import { libGamesVals } from './libgamesvals.js';
import { gamesPage } from './libgames.js';
const PAGES = [['games', 'My games', "Here's your game library"], ['recent', 'Recently played', "Here's your last progress"], ['fav', 'Favourites', 'Your favourite games'], ['upd', 'Updates', "Here's what Steam is updating"]];

export function isLibLayout(app) {
  const st = app.state.settings || {};
  return st.layout === 'library';
}

export function libShellVals(app) {
  if (!isLibLayout(app)) return { libLayout: false };
  const S = app.state, page = S.libPage || 'games', me = app.accts.find(a => a.current) || app.accts[0];
  const meta = PAGES.find(p => p[0] === page) || PAGES[0];
  const go = k => app.setState({ libPage: k });
  const updCount = Object.values(S.libUpd || {}).filter(u => u && ['queued', 'downloading', 'paused', 'verifying', 'failed'].includes(u.state)).length;
  return {
    libLayout: true,
    ls: {
      page, go, updCount: updCount || null,
      hiName: me ? 'Hi, ' + me.name + '!' : 'Hi there!', hiSub: meta[2], pageTitle: meta[1],
      pills: PAGES.map(([k, label]) => ({ label, on: page === k, go: () => go(k) })),
      meIni: me ? (me.avatar ? '' : me.ini) : '+', meBg: me ? (me.avatar ? 'url("' + me.avatar + '") center/cover no-repeat,#111' : me.grad) : 'rgba(var(--fg-rgb),.1)',
      meOnline: !!(me && me.current),
      onSettings: () => app.openSettings(), onMe: () => me && app.openDetails && app.openDetails(me.id),
      onSearch: () => {}, onBell: () => {},
      contentRef: app.lsContentRef, content: page === 'games' ? gamesPage(libGamesVals(app).lsGames) : null,
    },
  };
}

// Settings > Appearance: the Classic / Library layout picker (shown in both layouts).
export function layoutVals(app) {
  const cur = isLibLayout(app) ? 'library' : 'classic';
  const tile = (k, label, sub) => ({ label, sub, on: cur === k, bd: cur === k ? 'var(--accent)' : 'rgba(var(--fg-rgb),.12)', ring: cur === k ? '0 0 0 3px rgba(var(--accent-rgb),.18)' : 'none', isLib: k === 'library', pick: () => app.setCfg({ layout: k }) });
  return { layoutTiles: [tile('classic', 'Classic', 'Accounts and Library pages, as before'), tile('library', 'Library', 'Rail, cover grid and full game pages')] };
}

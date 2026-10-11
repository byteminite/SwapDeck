// Props for the Library layout shell, built from the App component's state.
import { libGamesVals } from './libgamesvals.js';
import { gamesPage } from './libgames.js';
import { gamePage } from './libgamepage.js';
import { libGamePageVals } from './libgamepagevals.js';
import { launchVals, switchVals } from './liblaunchvals.js';
import { libRecentVals, recentPage } from './librecent.js';
import { libFavVals, favPage } from './libfav.js';
import { libUpdVals, updPage, updatingGames } from './libupd.js';
const CONTENT = {
  games: app => gamesPage(libGamesVals(app).lsGames),
  recent: app => recentPage(libRecentVals(app)),
  fav: app => favPage(libFavVals(app)),
  upd: app => updPage(libUpdVals(app)),
};
const PAGES = [['games', 'My games', "Here's your game library"], ['recent', 'Recently played', "Here's your last progress"], ['fav', 'Favourites', 'Your favourite games'], ['upd', 'Updates', "Here's what Steam is updating"]];

export function isLibLayout(app) {
  const st = app.state.settings || {};
  return st.layout === 'library';
}

function gameSub(app, id) {
  const g = app.gfind(id), a = g && g.steam && g.acct && app.find(g.acct);
  return !g ? '' : !g.steam ? 'No Steam account needed' : a ? 'Plays as ' + a.name : 'Plays on whoever is signed in';
}

export function libShellVals(app, gv) {
  if (!isLibLayout(app)) return { libLayout: false };
  const S = app.state, page = S.libPage || 'games', me = app.accts.find(a => a.current) || app.accts[0];
  const meta = PAGES.find(p => p[0] === page) || PAGES[0];
  const go = k => app.setState({ libPage: k, gd: null, lgTab: 'ov', gdTab: 'ov' });
  const updCount = updatingGames(app).length;
  return {
    libLayout: true,
    ls: {
      page, go, updCount: updCount || null,
      hiName: me ? 'Hi, ' + me.name + '!' : 'Hi there!', hiSub: S.gd && gv && gv.gdOn ? gameSub(app, S.gd) : meta[2], pageTitle: meta[1],
      pills: PAGES.map(([k, label]) => ({ label, on: page === k, go: () => go(k) })),
      meIni: me ? (me.avatar ? '' : me.ini) : '+', meBg: me ? (me.avatar ? 'url("' + me.avatar + '") center/cover no-repeat,#111' : me.grad) : 'rgba(var(--fg-rgb),.1)',
      meOnline: !!(me && me.current),
      onSettings: () => app.openSettings(), onMe: () => me && app.openDetails && app.openDetails(me.id),
      onSearch: () => {}, onBell: () => {},
      ...launchVals(app), sw: switchVals(app),
      contentRef: app.lsContentRef, content: S.gd && gv && gv.gdOn ? gamePage(libGamePageVals(app, gv)) : (CONTENT[page] || CONTENT.games)(app),
    },
  };
}

// Settings > Appearance: the Classic / Library layout picker (shown in both layouts).
export function layoutVals(app) {
  const cur = isLibLayout(app) ? 'library' : 'classic';
  const tile = (k, label, sub) => ({ label, sub, on: cur === k, bd: cur === k ? 'var(--accent)' : 'rgba(var(--fg-rgb),.12)', ring: cur === k ? '0 0 0 3px rgba(var(--accent-rgb),.18)' : 'none', isLib: k === 'library', pick: () => app.setCfg({ layout: k }) });
  return { layoutTiles: [tile('classic', 'Classic', 'Accounts and Library pages, as before'), tile('library', 'Library', 'Rail, cover grid and full game pages')] };
}

// Props for the Library layout shell, built from the App component's state.
import { libGamesVals } from './libgamesvals.js';
import { gamesPage } from './libgames.js';
import { gamePage } from './libgamepage.js';
import { libGamePageVals } from './libgamepagevals.js';
import { launchVals, switchVals } from './liblaunchvals.js';
import { libRecentVals, recentPage } from './librecent.js';
import { libFavVals, favPage } from './libfav.js';
import { libUpdVals, updPage, updatingGames } from './libupd.js';
import { acctMenuVals, acctPageVals } from './libacctvals.js';
import { acctMenu, acctPage } from './libacct.js';
import { libSpotVals, spotOverlay, openSpot } from './libspot.js';
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

export function libShellVals(app, gv, dw) {
  if (!isLibLayout(app)) return { libLayout: false };
  const S = app.state, page = S.libPage || 'games', me = app.accts.find(a => a.current) || app.accts[0];
  const meta = PAGES.find(p => p[0] === page) || PAGES[0];
  const go = k => app.setState({ libPage: k, gd: null, drawerId: null, lsMenu: false, lgTab: 'ov', gdTab: 'ov' });
  const onGame = !!(S.gd && gv && gv.gdOn), ap = !onGame && dw ? acctPageVals(app, dw) : null;
  const updCount = updatingGames(app).length;
  return {
    libLayout: true,
    ls: {
      page, go, updCount: updCount || null,
      hiName: me ? 'Hi, ' + me.name + '!' : 'Hi there!', hiSub: onGame ? gameSub(app, S.gd) : ap ? 'Account details' : meta[2], pageTitle: meta[1],
      pills: PAGES.map(([k, label]) => ({ label, on: page === k && !ap, go: () => go(k) })),
      meIni: me ? (me.avatar ? '' : me.ini) : '+', meBg: me ? (me.avatar ? 'url("' + me.avatar + '") center/cover no-repeat,#111' : me.grad) : 'rgba(var(--fg-rgb),.1)',
      meOnline: !!(me && me.current),
      onSettings: () => app.openSettings(), onMe: () => app.setState(s => ({ lsMenu: !s.lsMenu })), menu: S.lsMenu ? acctMenu(acctMenuVals(app)) : null,
      onSearch: () => openSpot(app), onBell: () => {}, spot: S.lsSpot ? spotOverlay(libSpotVals(app)) : null,
      ...launchVals(app), sw: switchVals(app),
      contentRef: app.lsContentRef, content: onGame ? gamePage(libGamePageVals(app, gv)) : ap ? acctPage(ap) : (CONTENT[page] || CONTENT.games)(app),
    },
  };
}

// Settings > Appearance: the Classic / Library layout picker (shown in both layouts).
export function layoutVals(app) {
  const cur = isLibLayout(app) ? 'library' : 'classic';
  const tile = (k, label, sub) => ({ label, sub, on: cur === k, bd: cur === k ? 'var(--accent)' : 'rgba(var(--fg-rgb),.12)', ring: cur === k ? '0 0 0 3px rgba(var(--accent-rgb),.18)' : 'none', isLib: k === 'library', pick: () => app.setCfg({ layout: k }) });
  return { layoutTiles: [tile('classic', 'Classic', 'Accounts and Library pages, as before'), tile('library', 'Library', 'Rail, cover grid and full game pages')] };
}

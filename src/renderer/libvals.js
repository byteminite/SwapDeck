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
import { settingsPage } from './libset.js';
import { libTagsVals, tagsOverlay } from './libtags.js';
import { libMenuVals, gameMenu } from './libmenu.js';
import { libArtVals, artOverlay } from './libart.js';
import { libNotesVals, notesPanel, unreadCount } from './libnotes.js';
import { stopVals, stopOverlay } from './libstop.js';
import { chooseVals, chooseOverlay } from './libchoose.js';
import { libWnVals, wnOverlay } from './libwn.js';
import { padHints } from './libpad.js';
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
  return !g ? '' : !g.steam ? (g.pack ? 'Plays in ' + g.pack.label : 'No Steam account needed') : a ? 'Plays as ' + a.name : 'Plays on whoever is signed in';
}

export function libShellVals(app, gv, dw) {
  if (!isLibLayout(app)) return { libLayout: false };
  const S = app.state, page = S.libPage || S.settings.libStart || 'games', me = app.accts.find(a => a.current) || app.accts[0];
  const meta = PAGES.find(p => p[0] === page) || PAGES[0];
  const go = k => app.setState({ libPage: k, gd: null, drawerId: null, setOpen: false, rp: null, hkRec: false, lsMenu: false, lgTab: 'ov', gdTab: 'ov' });
  const onSet = !!S.setOpen, onGame = !onSet && !!(S.gd && gv && gv.gdOn), ap = !onSet && !onGame && dw ? acctPageVals(app, dw) : null;
  const updCount = updatingGames(app).length;
  return {
    libLayout: true,
    ls: {
      page, go, updCount: updCount || null, ver: 'v' + (S.version || ''),
      hiName: me ? 'Hi, ' + me.name + '!' : 'Hi there!', hiSub: onSet ? 'Settings' : onGame ? gameSub(app, S.gd) : ap ? 'Account details' : meta[2], pageTitle: meta[1],
      pills: PAGES.map(([k, label]) => ({ label, on: page === k && !ap && !onSet, go: () => go(k) })),
      meIni: me ? (me.avatar ? '' : me.ini) : '+', meBg: me ? (me.avatar ? 'url("' + me.avatar + '") center/cover no-repeat,#111' : me.grad) : 'rgba(var(--fg-rgb),.1)',
      meOnline: !!(me && me.current),
      onSettings: () => app.openSettings('general'), light: (S.settings.base || 'dark') === 'light', onFlip: e => app.flipBase(e.currentTarget), onMe: () => app.setState(s => ({ lsMenu: !s.lsMenu, lsNotes: false })), menu: S.lsMenu ? acctMenu(acctMenuVals(app)) : null,
      onSearch: () => openSpot(app), onBell: () => app.setState(s => ({ lsNotes: !s.lsNotes, lsMenu: false })), bellN: unreadCount(app), bellOn: !!S.lsNotes,
      notes: S.lsNotes ? notesPanel(libNotesVals(app)) : null, stop: S.scAsk && chooseVals(app) ? chooseOverlay(chooseVals(app)) : (S.stopAsk || S.stopping) && stopVals(app) ? stopOverlay(stopVals(app)) : null, spot: S.lsSpot ? spotOverlay(libSpotVals(app)) : null, tags: S.tm ? tagsOverlay(libTagsVals(app)) : null,
      gm: S.gm && libMenuVals(app) ? gameMenu(libMenuVals(app)) : null, art: S.art && libArtVals(app) ? artOverlay(libArtVals(app)) : null,
      ...launchVals(app), sw: switchVals(app),
      banner: app.steamState === 'not-found' ? { tone: 'warn', ic: 'search', text: "SwapDeck can't find Steam. Switching and Steam games need it.", act: 'Find Steam', go: () => app.browse() }
        : !navigator.onLine ? { tone: 'warn', ic: 'alert', text: "You're offline. Switching and playing still work; news and stats come back when you reconnect." } : null,
      wn: libWnVals(app) ? wnOverlay(libWnVals(app)) : null, pad: padHints(!!S.padOn), rm: !!S.settings.reduceMotion,
      setOn: onSet, settings: onSet ? b => settingsPage(app, b) : null,
      contentRef: app.lsContentRef, viewKey: onSet ? 'set' : onGame ? 'g:' + S.gd : ap ? 'a:' + S.drawerId : 'p:' + page, content: onSet ? null : onGame ? gamePage(libGamePageVals(app, gv)) : ap ? acctPage(ap) : (CONTENT[page] || CONTENT.games)(app),
    },
  };
}

// Settings > Appearance: the Classic / Library layout picker (shown in both layouts).
export function layoutVals(app) {
  const cur = isLibLayout(app) ? 'library' : 'classic';
  const tile = (k, label, sub) => ({ label, sub, on: cur === k, bd: cur === k ? 'var(--accent)' : 'rgba(var(--fg-rgb),.12)', ring: cur === k ? '0 0 0 3px rgba(var(--accent-rgb),.18)' : 'none', isLib: k === 'library', pick: () => { if (k === 'classic') app.setState({ lsMenu: false, lsDd: null, gm: null, lsNotes: false, lsSpot: false, tm: null, art: null, stopAsk: null, wnFull: null, stopping: null, drawerId: null, gd: null }); app.setCfg({ layout: k }); } });
  return { layoutTiles: [tile('classic', 'Classic', 'Accounts and Library pages, as before'), tile('library', 'Library', 'Rail, cover grid and full game pages')] };
}

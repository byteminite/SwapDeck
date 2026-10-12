// Props for the Library layout's account menu (top-right avatar) and account page. The page reuses the 1.4.0
// profile data (App.drawerVals), so every action (switch, connect, refresh, note, forget) behaves as before.
const ST = { ingame: '#4ade80', online: '#38bdf8', away: '#fbbf24' };
const stText = p => !p ? 'Status unknown' : p.st === 'ingame' ? 'In-Game: ' + p.game : p.st === 'online' ? 'Online' : p.st === 'away' ? 'Away' : 'Offline';
const avBg = a => a.avatar ? 'url("' + a.avatar + '") center/cover no-repeat,#111' : a.grad;
const DAY = 86400000;

// Switching restarts Steam, so it waits until the running game is stopped.
export function libSwitch(app, id) {
  const L = app.state.launch, g = L && app.gfind(L.gid);
  if (L) { app.toast('warning', 'Stop ' + (g ? g.name : 'the game') + ' first', 'Switching accounts restarts Steam, so it waits until you stop the game.'); return; }
  app.setState({ lsMenu: false });
  app.switchTo(id);
}

export function acctMenuVals(app) {
  const S = app.state, close = () => app.setState({ lsMenu: false });
  const unlinked = app.accts.filter(a => !a.linked);
  return {
    count: app.accts.length + ' saved', close, adding: !!S.addOpen,
    rows: app.accts.map(a => ({ name: a.name, ini: a.avatar ? '' : a.ini, bg: avBg(a), dot: (a.pub && ST[a.pub.st]) || 'var(--text-subtle)', cur: a.current,
      sub: stText(a.pub) + (a.linked ? '' : ' · not connected'), linked: a.linked,
      onSwitch: () => a.current ? close() : libSwitch(app, a.id),
      onConnect: e => { e.stopPropagation(); close(); app.openLink(a.id); },
      onInfo: e => { e.stopPropagation(); app.setState({ lsMenu: false, gd: null, apAll: false }); app.openDetails(a.id); } })),
    unlinkedN: unlinked.length,
    hiddenN: (S.settings.hiddenAccts || []).filter(sid => S.accounts.some(a => a.sid === sid && !app.find(sid))).length,
    onShowHidden: () => app.setCfg({ hiddenAccts: [] }),
    onConnectAll: () => { close(); app.connectAll(); },
    onAdd: () => { close(); app.addAcc(); },
  };
}

function bandVals(app, d) {
  const S = app.state, L = S.launch, live = L && L.running && L.acct === d.id && app.gfind(L.gid);
  const hero = g => g.steam && g.hero ? 'url("' + g.hero + '") center 30%/cover no-repeat,' + app.gradOf(g) : app.cardBg(g);
  if (live) return { live: true, k: 'PLAYING NOW', name: live.name, sub: 'Started through SwapDeck', bg: hero(live), label: 'Show game', act: () => app.setState(s => ({ launch: s.launch && { ...s.launch, hidden: false } })) };
  const s = (S.sessions || []).find(x => x.sid === d.sid && app.gfind(x.gid)), g = s && app.gfind(s.gid);
  if (!g) return null;
  const days = Math.floor((Date.now() - s.start) / DAY);
  return { live: false, k: 'LAST PLAYED', name: g.name, sub: (days < 1 ? 'Today' : days === 1 ? 'Yesterday' : days + ' days ago') + ' through SwapDeck', bg: hero(g), label: 'Details', act: () => app.openGame(g.id) };
}

// Remove from SwapDeck: hides the account here only. Steam keeps its saved login, and Undo or the menu brings it back.
function removeVals(app, d) {
  const hidden = app.state.settings.hiddenAccts || [];
  const setHidden = list => app.setCfg({ hiddenAccts: list });
  return {
    rmAsk: app.state.apRmAsk === d.id,
    onRemove: () => d.current ? app.toast('warning', 'Switch to another account first', d.name + " is signed in to Steam, so it stays in SwapDeck.") : (app.setState({ apRmAsk: d.id }), requestAnimationFrame(() => { const el = document.querySelector('.ap-danger'); if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); })),
    onRemoveNo: () => app.setState({ apRmAsk: null }),
    onRemoveYes: () => {
      setHidden([...hidden.filter(x => x !== d.sid), d.sid]);
      app.setState({ apRmAsk: null, drawerId: null });
      app.toast('info', d.name + ' removed from SwapDeck', "It's still saved in Steam.", { label: 'Undo', fn: () => setHidden((app.state.settings.hiddenAccts || []).filter(x => x !== d.sid)) });
    },
  };
}

export function acctPageVals(app, dw) {
  const S = app.state, d = app.find(S.drawerId);
  if (!d || !dw.drawerOn) return null;
  const tags = dw.dTagEd, sort = S.gSort || 'hours', all = !!S.apAll, linkedGames = dw.gmReady ? dw.gameRows : [];
  const pv = i => (dw.pubRows[i] || {}).val || '—';
  const copy = (v, what) => { try { navigator.clipboard.writeText(v); app.toast('success', what + ' copied', v); } catch (e) { app.toast('error', "Couldn't copy", 'Select it and press Ctrl C instead.'); } };
  return {
    name: d.name, ini: dw.dHasAv ? '' : d.ini, av: dw.dHasAv ? dw.dAvBg : d.grad, dot: dw.dStDot, status: dw.dStText,
    cur: d.current, linked: d.linked, pinned: !!d.pinned, onPin: dw.onDPin, onBack: () => app.setState({ drawerId: null }),
    tags: (d.tags || []).map(t => ({ label: t, dot: 'rgb(' + app.tagRgb(t) + ')', remove: () => tags.opts.find(o => o.label === t)?.on() })),
    tagDraft: tags.draft, onTagDraft: tags.onDraft, onTagKey: tags.onKey,
    onProfile: () => window.api.open(dw.dUrl),
    signedIn: dw.dSignedIn, swLabel: d.current ? 'Start Steam' : 'Switch to ' + d.name, onSwitch: () => libSwitch(app, d.id),
    band: bandVals(app, d), onConnect: dw.onDLink,
    stats: [['Steam level', dw.dSideLevel], ['Games owned', d.linked ? dw.dSideOwned : null], ['Friends', dw.dSideFriends], ['Bans', dw.dSideBans]]
      .map(([label, v]) => ({ label, v: d.linked ? v : null, bad: label === 'Bans' && v === 'Yes', good: label === 'Bans' && v === 'None' })),
    games: {
      linked: d.linked, loading: !!dw.gmLoading, empty: !!dw.gmEmpty, summary: dw.gmReady ? dw.gSummary : '',
      sort, sorts: [['hours', 'Hours'], ['name', 'Name']].map(([k, label]) => ({ label, on: sort === k, pick: () => app.setState({ gSort: k }) })),
      rows: (all ? linkedGames : linkedGames.slice(0, 6)), more: linkedGames.length > 6 ? (all ? 'Show fewer' : 'See all ' + linkedGames.length + ' games') : null,
      toggleMore: () => app.setState({ apAll: !all }),
      here: dw.dGames,
    },
    sessions: dw.dSess || [],
    glance: [['Hours through SwapDeck', dw.dGlanceHours], ['Steam wallet', d.linked ? dw.dGlanceWallet : null], ['Member since', dw.dGlanceSince], ['Profile', pv(1)], ['VAC ban', pv(2)], ['Trade ban', pv(3)]]
      .map(([label, v]) => ({ label, v, good: v === 'No' || v === 'None', bad: v === 'Yes' || v === 'Banned' })),
    launchDd: { label: dw.dLaunchLbl, set: false, open: !!S.dLaunchMenu, right: true, toggle: dw.onDLaunchMenu, clear: () => {},
      opts: dw.launchOpts.map(o => ({ label: o.label, on: o.act, pick: o.on })) },
    launchNow: dw.dLaunchNow, closeLaunch: () => app.setState({ dLaunchMenu: false }),
    note: dw.dNote, noteCount: dw.dNoteCount, onNote: dw.onDNote,
    login: d.login, sid: d.sid, copyLogin: () => copy(d.login, 'Login name'), copySid: () => copy(d.sid, 'SteamID64'),
    pwSaved: dw.dPwSaved, onForgetPw: dw.onDForgetPw,
    updLabel: dw.dUpd, fetching: dw.dFetching, onRefresh: dw.onDRefresh, onUnlink: dw.onDUnlink,
    onForget: dw.onDForget, ...removeVals(app, d),
  };
}

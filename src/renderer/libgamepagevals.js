// Props for the Library layout's game page. Uses the same helpers as Classic's game details.
import { libAchVals, achPage } from './libach.js';
import { setupTab } from './libsetup.js';
import { accountsOf } from './libgrid.js';

const avBg = a => a.avatar ? 'url("' + a.avatar + '") center/cover no-repeat,#111' : a.grad;

function whoLine(app, g) {
  if (!g.steam) return { faces: [], text: g.pack ? 'Plays in ' + g.pack.label : 'No Steam account needed' };
  const a = g.acct && app.find(g.acct);
  if (a) return { faces: [avBg(a)], text: 'Plays as ' + a.name };
  const owners = accountsOf(g).map(id => app.find(id)).filter(Boolean);
  return owners.length ? { faces: owners.slice(0, 4).map(avBg), text: 'Owned by ' + owners.map(o => o.name).join(', ') } : { faces: [], text: 'Plays on whoever is signed in' };
}

function playButton(g, L) {
  const run = !!(L && L.gid === g.id);
  if (!g.installed) return ['Install via Steam', 'download', false];
  if (run) return [L.running ? 'Running' : 'Starting', 'play', true];
  return ['Play', 'play', false];
}

export function libGamePageVals(app, b) {
  const S = app.state, g = S.gd && app.gfind(S.gd);
  if (!g) return null;
  const ach = g.steam ? app.achVals(g) : null, A = ach && ach.cell, tab = S.lgTab === 'ach' && !ach ? 'ov' : S.lgTab || 'ov';
  const setTab = k => () => {
    app.setState({ lgTab: k, gdTab: k === 'setup' ? 'setup' : 'ov', colorFor: null });
    if (k === 'setup' && g.steam && String(g.appid) === '730') app.loadCs2(app.cs2Sid(g));
  };
  const [playLabel, playIc, playDisabled] = playButton(g, S.launch);
  const tabs = [['ov', 'Overview'], ...(ach ? [['ach', 'Achievements']] : []), ['setup', 'Setup']];
  const pct = A && A.pct != null ? A.pct : null, parts = A && /(\d+) of (\d+)/.exec(A.value || '');
  return {
    name: g.name, isPack: !!(g.pack && g.img), noArt: b.gNoArt, ini: b.gIni, heroBg: g.pack && g.img ? 'url("' + g.img + '") 92% 50%/auto 70% no-repeat,radial-gradient(70% 140% at 85% 50%,rgba(255,255,255,.14),transparent 70%),' + app.gradOf(g) : g.steam && g.hero ? 'url("' + g.hero + '") center ' + (g.heroPos ?? 30) + '%/cover no-repeat,' + app.gradOf(g) : b.gHeroBg, who: whoLine(app, g), fav: !!g.fav,
    onFav: () => app.toggleFav(g.id), onPlay: () => app.play(g.id), playLabel, playIc, playDisabled,
    onBack: () => { clearInterval(app._gTimer); app.setState({ gd: null, lgTab: 'ov', gdTab: 'ov', gShot: null, gNews: null }); },
    ach: parts ? { got: parts[1], total: parts[2], pct: pct || 0, open: setTab('ach') } : null,
    tab: tabs.some(t => t[0] === tab) ? tab : 'ov', tabs: tabs.map(([k, label]) => ({ label, on: tab === k, pick: setTab(k) })),
    ov: tab === 'ov' ? b.gOv : null, achEl: tab === 'ach' && ach ? achPage(libAchVals(app, g)) : null, setupEl: tab === 'setup' ? setupTab(b) : null,
    noOvText: g.steam ? '' : g.pack ? 'Modpacks have their setup on the Setup tab. Mods and updates stay in ' + g.pack.label + '.' : 'Non-Steam games have their setup on the Setup tab.',
  };
}

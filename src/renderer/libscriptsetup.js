// Library layout: a script's own setup (Setup > Scripts > Custom options, F-007). The screen reuses the game's
// Setup cards on a stand-in game with the id "<game id>#sc:<script id>": ui.js gfind/gmut and main's lib:set
// read and write that id as the script's own setup, so every card works unchanged.
import { html } from './vendor/htm-preact.js';
import { icon } from './libicons.js';
import { setupTab } from './libsetup.js';

const SETUP_KEYS = ['acct', 'display', 'audio', 'apps', 'opts', 'launcher'];
const MARK = '#sc:';
export const scriptGameId = (gid, sid) => gid + MARK + sid;
export const isScriptGameId = id => typeof id === 'string' && id.includes(MARK);
const parse = id => { const i = id.lastIndexOf(MARK); return { gid: id.slice(0, i), sid: id.slice(i + MARK.length) }; };

// The game as it plays with this script: the game's setup with the script's own changes on top (as main's withSetup).
function applyOwn(g, custom) {
  const out = { ...g };
  for (const k of SETUP_KEYS) if (custom && k in custom) out[k] = k === 'display' ? { ...g.display, ...custom.display } : custom[k];
  if (custom && 'acct' in custom) out.acctAuto = false;
  return out;
}

export function scriptGame(lib, id) {
  const { gid, sid } = parse(id), g = lib.find(x => x.id === gid), sc = g && (g.scripts || []).find(s => s.id === sid);
  return sc ? { ...applyOwn(g, sc.custom), id, baseId: gid, scriptName: sc.name } : undefined;
}

// A card changed on the script's setup screen: keep the change on the script (main saves it the same way).
export function mutScriptGame(lib, id, p) {
  const { gid, sid } = parse(id), cur = scriptGame(lib, id);
  if (!cur) return lib;
  const next = typeof p === 'function' ? p(cur) : p;
  return lib.map(g => g.id !== gid ? g : { ...g, scripts: g.scripts.map(s => {
    if (s.id !== sid) return s;
    const custom = { ...(s.custom || {}) };
    for (const k of SETUP_KEYS) if (k in next) custom[k] = next[k];
    return { ...s, custom };
  }) });
}

// One line on the script's card: what its own setup changes, in the words the cards use.
export function ownSummary(app, sc) {
  const c = sc.custom || {}, S = app.state, out = [];
  if ('acct' in c) { const a = c.acct && app.find(c.acct); out.push(a ? 'As ' + a.name : "Doesn't switch account"); }
  if ('display' in c) {
    const m = c.display.mon && app.mons().find(x => x.id === c.display.mon), r = c.display.res && S.resProfiles.find(x => x.id === c.display.res);
    out.push(m ? m.label + (c.display.mode === 'only' ? ' only' : '') : 'Default display');
    if (r) out.push(r.name);
  }
  if ('audio' in c) { const d = c.audio && S.audioDevs.find(x => x.id === c.audio); out.push(d ? d.name : c.audio ? 'Another sound device' : "Sound unchanged"); }
  if ('apps' in c) out.push(c.apps.length ? c.apps.map(a => a.path.split('\\').pop().replace(/\.exe$/i, '')).join(', ') : 'No apps');
  if ('opts' in c) out.push(c.opts ? 'Options: ' + c.opts : 'No launch options');
  if ('launcher' in c) out.push(c.launcher ? 'Via ' + c.launcher.split('\\').pop().replace(/\.exe$/i, '') : 'Starts through Steam');
  return out.length ? out.join(' · ') : "Same as the game's setup so far";
}

export function scriptSetupEl(app, g) {
  const E = app.state.scEdit, sc = (g.scripts || []).find(s => s.id === E.sid);
  if (!sc) return null;
  const id = scriptGameId(g.id, sc.id), custom = sc.custom || {};
  const back = () => app.setState({ scEdit: null, acctMenu: false, menu: null });
  const saveScripts = scripts => { app.gmut(g.id, { scripts }); app.gset(g.id, { scripts }); };
  const reset = k => saveScripts(g.scripts.map(s => { if (s.id !== sc.id) return s; const c = { ...(s.custom || {}) }; delete c[k]; return { ...s, custom: c }; }));
  const useGame = () => { saveScripts(g.scripts.map(s => s.id === sc.id ? { ...s, own: false } : s)); back(); };
  const ovr = Object.fromEntries(SETUP_KEYS.map(k => [k, k in custom]));
  const b = { ...app.gameVals(id), scOwn: true, ovr, onReset: reset };
  return html`<div class="ss">
<div class="ss-crumb"><button class="su-link" onClick=${back}>${icon('back', 13)}Setup</button><span>/</span><b>${sc.name}</b></div>
<div class="ss-banner"><span class="sx-ic on">${icon('script', 15)}</span><span class="su-sv"><b>Own setup for ${sc.name}</b><span>${sc.path.split('\\').pop()}${sc.args ? ' ' + sc.args : ''}</span></span><button class="su-btn" onClick=${useGame}>Use the game's setup instead</button></div>
<div class="su-hint ss-hint">Anything you change here only applies when you play with ${sc.name}. Cards marked SAME AS GAME follow the game's own setup.</div>
${setupTab(b)}</div>`;
}

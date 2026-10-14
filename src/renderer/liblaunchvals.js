// Props for the Library layout's start screen, switch screen and Now playing bar, from the launch session
// (src/main/play.js steps) and the account switch progress.
import { libStop } from './libstop.js';

const STEP_IC = { acct: 'user', disp: 'monitor', audio: 'headphones', apps: 'app', script: 'script', launch: 'rocket', run: 'gamepad' };
const avBg = a => a.avatar ? 'url("' + a.avatar + '") center/cover no-repeat,#111' : a.grad;

// A skipped step is usually good news (already signed in, already the main display): show it as READY.
function stepRow(s, i, L) {
  const k = s.k || (/Switching|account/.test(s.label) ? 'acct' : /display/i.test(s.label) ? 'disp' : /sound/i.test(s.label) ? 'audio' : /apps/i.test(s.label) ? 'apps' : /Launching/.test(s.label) ? 'launch' : 'run');
  const sub = (s.sub || '').replace(/ · skipped$/, '');
  const missing = s.skip && /isn't connected/.test(s.sub || '');
  const st = i < L.step || (L.running && i === L.step) ? (s.skip ? 'skip' : 'done') : i === L.step ? (L.failed ? 'fail' : 'active') : 'wait';
  const row = { ic: STEP_IC[k] || 'check', label: s.label, sub: st === 'wait' && s.skip ? '' : sub, st };
  if (st === 'skip') Object.assign(row, missing ? { tag: 'NOT CONNECTED', tagCls: 'warn' } : { tag: 'READY', tagCls: 'ok' });
  return row;
}

// A start that failed: the same screen, with the step that broke and what to do next.
function errorScreen(app, E) {
  const g = app.gfind(E.gid); if (!g) return null;
  const shown = E.steps.filter(s => s.k !== 'run' && s.label !== 'Game running'), a = E.acct && app.find(E.acct);
  const clear = () => app.setState({ lnErr: null });
  return { failed: true, name: g.name, bg: g.steam && g.hero ? 'url("' + g.hero + '") center/cover no-repeat,' + app.gradOf(g) : app.cardBg(g), cover: app.cardBg(g),
    error: E.error, steps: shown.map((s, i) => stepRow(s, i, { step: E.step, running: false, failed: true })), pct: 0, running: false,
    asPill: a ? [{ bg: avBg(a), ini: a.avatar ? '' : a.ini }] : [], asArrow: false, asText: a ? 'As ' + a.name : g.steam ? 'Steam game' : g.pack ? 'Starts in ' + g.pack.label : 'No Steam account needed', note: '',
    onRetry: () => { clear(); app.play(g.id, undefined, E.script || undefined); }, onPage: () => { clear(); app.openGame(g.id); }, onHide: clear };
}

// A script that failed or passed its time limit (F-007): the game waits for Launch anyway or Cancel.
function askVals(ask) {
  if (!ask) return null;
  const decide = choice => window.api.scriptDecide(choice);
  const time = ask.kind === 'time';
  return {
    title: time ? 'The script is taking long' : "The script didn't finish",
    error: time ? ask.name + ' is still running after ' + ask.secs + " seconds. It may be waiting for input. If it finishes fine, the game starts by itself."
      : ask.code != null ? ask.name + ' stopped with an error (code ' + ask.code + "). The game hasn't started." : ask.name + " couldn't run. The game hasn't started.",
    line: time ? '' : ask.line || '',
    onAnyway: () => decide('anyway'), onCancel: () => decide('cancel'),
  };
}

export function launchVals(app) {
  const S = app.state, L = S.launch, g = L && app.gfind(L.gid);
  if ((!L || !g) && S.lnErr) return { lnScreen: errorScreen(app, S.lnErr), lnBar: null };
  if (!L || !g) return { lnScreen: null, lnBar: null };
  const shown = L.steps.filter(s => s.k !== 'run' && s.label !== 'Game running');
  const a = L.acct && app.find(L.acct), from = app.accts.find(x => x.current);
  const switching = !!(a && from && a.id !== from.id && !L.running);
  const pct = Math.round(Math.min(L.step, shown.length) / Math.max(1, shown.length) * 100);
  const hide = () => app.setState(s => ({ launch: s.launch && { ...s.launch, hidden: true } }));
  const show = () => app.setState(s => ({ launch: s.launch && { ...s.launch, hidden: false } }));
  const hint = L.changed ? (L.restore ? 'Back to library keeps the game running. Quitting the game puts your display back. Stop never closes the game.' : 'Restore is off, so the display stays as it is after you quit.') : 'Back to library keeps the game running. Stop never closes the game.';
  const screen = L.hidden ? null : {
    name: g.name, bg: g.steam && g.hero ? 'url("' + g.hero + '") center/cover no-repeat,' + app.gradOf(g) : app.cardBg(g), cover: app.cardBg(g),
    running: !!L.running, pct, steps: shown.map((s, i) => stepRow(s, i, { ...L, failed: !!L.ask && L.ask.kind === 'fail' })), hint, ask: askVals(L.ask),
    asPill: !g.steam ? [] : switching ? [{ bg: avBg(from), ini: from.avatar ? '' : from.ini }, { bg: avBg(a), ini: a.avatar ? '' : a.ini }] : a ? [{ bg: avBg(a), ini: a.avatar ? '' : a.ini }] : [],
    asArrow: switching, asText: !g.steam ? (g.pack ? 'Minecraft through ' + g.pack.label : 'No Steam account needed') : switching ? 'Switching to ' + a.name : a ? 'Playing as ' + a.name : 'Playing on the signed-in account',
    note: (g.note || '').trim(), noteCopied: !!S.lNoteCopied, onCopy: () => app.copyNote(g.note),
    cfTip: !!(g.pack && g.pack.launcher === 'curseforge'),
    onStop: () => libStop(app), onHide: hide, onCancel: () => app.stopGame(),
  };
  const bar = L.hidden ? { name: g.name, cover: app.cardBg(g), running: !!L.running, sub: (a ? 'As ' + a.name + ' · ' : '') + (L.script ? L.script + ' · ' : '') + (L.running ? 'running' : 'starting'), onShow: show, onStop: () => libStop(app) } : null;
  return { lnScreen: screen, lnBar: bar };
}

export function switchVals(app) {
  const sw = app.state.sw;
  if (!sw) return null;
  const from = app.accts.find(x => x.current && x.id !== sw.sid);
  const n = sw.steps.length, rows = sw.steps.map((label, i) => ({ ic: i === 0 ? 'power' : i === n - 1 ? 'gamepad' : 'key', label, sub: '', st: i < sw.step ? 'done' : i === sw.step ? 'active' : 'wait' }));
  return {
    name: sw.name, ini: sw.avatar ? '' : sw.ini, bg: sw.avatar ? 'url("' + sw.avatar + '") center/cover' : sw.grad,
    from: from ? { bg: avBg(from), ini: from.avatar ? '' : from.ini } : null,
    pct: Math.round((sw.step + 1) / Math.max(1, n) * 100), steps: rows,
  };
}

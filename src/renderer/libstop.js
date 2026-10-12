// Library layout: Stop. Asks "Stop tracking only" (default) or "Close the game too" unless a choice is remembered
// (Settings, General, When I press Stop), then shows the tidy-up screen. Closing only ever asks the game's
// windows to close, like Alt+F4; it never kills a process.
import { html } from './vendor/htm-preact.js';
import { icon } from './libicons.js';

export function libStop(app) {
  const L = app.state.launch;
  if (!L) return;
  if (!L.running) { app.stopGame(); return; } // still starting: cancel as before
  const pref = app.state.settings.stopPref || 'ask';
  if (pref === 'ask') app.setState({ stopAsk: { pick: 'track', remember: false } });
  else runStop(app, pref);
}

async function runStop(app, mode) {
  const L = app.state.launch, g = L && app.gfind(L.gid);
  if (!g) return app.stopGame();
  const step = k => (L.steps || []).find(s => s.k === k);
  const did = k => { const s = step(k); return s && !s.skip; };
  const items = [
    ...(mode === 'close' ? [['power', 'Closing ' + g.name, 'Asked to close, like Alt+F4']] : []),
    ['monitor', 'Display', did('disp') && L.restore !== false ? 'Back to your normal setup' : 'Was already how you left it'],
    ...(step('audio') ? [['headphones', 'Sound', did('audio') ? 'Back to your usual output' : 'Was already on your usual output']] : []),
    ...(step('apps') ? [['app', 'Companion apps', did('apps') ? 'Closed if you asked for it' : 'Left as they were']] : []),
    ['history', 'Session', 'Saved to Recently played'],
  ];
  app.setState({ stopAsk: null, stopping: { gid: g.id, name: g.name, mode, phase: 'work', items } });
  const r = await window.api.stopGame(mode).catch(e => ({ ok: false, error: e.message }));
  app.setState(s => ({ stopping: s.stopping && { ...s.stopping, phase: 'done', result: r || { ok: true } } }));
}

export function stopVals(app) {
  const S = app.state, A = S.stopAsk, T = S.stopping;
  if (A) {
    const L = S.launch, g = L && app.gfind(L.gid);
    if (!g) return null;
    const set = p => app.setState(s => ({ stopAsk: s.stopAsk && { ...s.stopAsk, ...p } }));
    return { ask: true, name: g.name, cap: app.cardBg(g), pick: A.pick, remember: A.remember,
      onPick: k => set({ pick: k }), onRemember: () => set({ remember: !A.remember }), close: () => app.setState({ stopAsk: null }),
      go: () => { if (A.remember) { app.setCfg({ stopPref: A.pick }); app.toast('info', A.pick === 'close' ? 'Stop closes the game too from now on' : 'Stop only stops tracking from now on', 'Change it in Settings, General, When I press Stop.'); } runStop(app, A.pick); } };
  }
  if (!T) return null;
  const g = app.gfind(T.gid), r = T.result, closeFailed = T.mode === 'close' && r && !r.ok;
  const done = () => app.setState({ stopping: null });
  return { ask: false, name: T.name, hero: g ? (g.steam && g.hero ? 'url("' + g.hero + '") center ' + (g.heroPos ?? 30) + '%/cover no-repeat,' + app.gradOf(g) : app.cardBg(g)) : '#111',
    phase: T.phase, mode: T.mode, items: T.items, closeFailed, error: r && r.error,
    title: T.phase === 'work' ? (T.mode === 'close' ? 'Closing ' + T.name : 'Putting things back') : closeFailed ? T.name + " didn't close" : 'All back to normal',
    sub: T.phase === 'work' ? (T.mode === 'close' ? 'Then SwapDeck puts everything back.' : T.name + ' keeps running. SwapDeck is just tidying up.')
      : closeFailed ? (r.error || '') + ' Your display and sound are back anyway.' : T.mode === 'close' ? T.name + ' is closed, and your display and sound are how you left them.' : 'Your display and sound are how you left them. ' + T.name + ' is still running.',
    done, openPage: () => { done(); if (g) app.openGame(g.id); } };
}

function ask(P) {
  const opt = (k, ic, title, sub, warn, rec) => html`<button class=${'sa-o' + (warn ? ' warn' : '') + (P.pick === k ? ' on' : '')} role="radio" aria-checked=${P.pick === k} onClick=${() => P.onPick(k)}><span class="sa-ic">${icon(ic, 18)}</span><div class="sa-m"><b>${title}${rec ? html`<em>RECOMMENDED</em>` : null}</b><span>${sub}</span></div><span class="sa-rd"></span></button>`;
  return html`<div class="tm-ov" onClick=${e => { if (e.target === e.currentTarget) P.close(); }}><div class="sa" role="dialog" aria-modal="true" aria-label=${'Stop ' + P.name}>
<div class="sa-h"><span class="sa-cap" style=${'background:' + P.cap}></span><div><h3>Stop ${P.name}?</h3><span>Pick what Stop should do.</span></div></div>
<div role="radiogroup">${opt('track', 'x', 'Stop tracking only', P.name + ' keeps running. Your display and sound go back.', false, true)}${opt('close', 'power', 'Close the game too', 'SwapDeck asks ' + P.name + " to close, like pressing Alt+F4. Anything you haven't saved in the game may be lost.", true)}</div>
<div class="sa-f"><button class=${'st-tg' + (P.remember ? ' on' : '')} role="switch" aria-checked=${P.remember} aria-label="Remember my choice" onClick=${P.onRemember}></button><span class="sa-rem" onClick=${P.onRemember}>Remember my choice</span><span class="tm-sp"></span>
<button class="st-btn" onClick=${P.close}>Cancel</button><button class=${'st-btn ' + (P.pick === 'close' ? 'tm-go' : 'p')} onClick=${P.go}>${P.pick === 'close' ? 'Close game' : 'Stop tracking'}</button></div></div></div>`;
}

function tidy(P) {
  const fin = P.phase === 'done';
  return html`<div class="ln so"><div class="ln-bg" style=${'background:' + P.hero}></div><div class="ln-shade"></div><div class="so-in"><div class="so-card">
<div class=${'so-ring' + (fin ? (P.closeFailed ? ' warn' : ' done') : '')}>${fin ? icon(P.closeFailed ? 'alert' : 'check', 30) : html`<span class="ln-spin big"></span>`}</div>
<h1>${P.title}</h1><div class="so-sub">${P.sub}</div>
<div class="so-list">${P.items.map(([ic, b, s], i) => html`<div class=${'so-it' + (fin ? (P.closeFailed && i === 0 ? ' bad' : ' ok') : '')}><span class="so-ic">${icon(ic, 16)}</span><div class="ln-m"><b>${b}</b><span>${fin && P.closeFailed && i === 0 ? "Didn't close" : s}</span></div><span class="so-st">${fin ? icon(P.closeFailed && i === 0 ? 'x' : 'check', 15) : null}</span></div>`)}</div>
${fin ? html`<div class="ln-acts"><button class="ln-btn" onClick=${P.openPage}>${icon('info', 16)}Game page</button><button class="ln-cta" onClick=${P.done}>${icon('grid', 16)}Back to library</button></div>` : null}</div></div></div>`;
}

export const stopOverlay = P => P.ask ? ask(P) : tidy(P);

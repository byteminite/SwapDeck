// Library layout, a game's Setup tab: scripts that run before the game (F-007). Play asks which one, runs it,
// waits until it finishes and then starts the game. Values in scriptVals, markup in scriptsCard.
import { html } from './vendor/htm-preact.js';
import { icon } from './libicons.js';

const newId = () => Math.random().toString(36).slice(2, 10);
const fileName = p => String(p || '').split('\\').pop();
const SAVE_DELAY_MS = 400;

function testChip(t) {
  if (!t) return null;
  if (t.running) return html`<span class="sx-chip run"><span class="sx-spin"></span>RUNNING</span>`;
  if (t.ok) return html`<span class="sx-chip ok">${icon('check', 11)}RAN OK · ${Math.max(1, Math.round(t.ms / 1000))} S</span>`;
  return html`<span class="sx-chip bad" title=${t.line || t.error || ''}>${icon('alert', 11)}${t.timedOut ? 'TOOK TOO LONG' : t.code != null ? 'FAILED · CODE ' + t.code : "DIDN'T RUN"}</span>`;
}

// One script's values for the card. `app` is the main App component (ui.js).
function oneScript(app, g, sc, i) {
  const list = () => (app.gfind(g.id) || g).scripts || [];
  const upd = p => { const scripts = list().map((x, j) => j === i ? { ...x, ...p } : x); app.gmut(g.id, { scripts }); return scripts; };
  const later = p => { const scripts = upd(p); clearTimeout(app._scrT); app._scrT = setTimeout(() => app.gset(g.id, { scripts }), SAVE_DELAY_MS); };
  const test = (app.state.scriptTests || {})[sc.id];
  const setTest = v => app.setState(s => ({ scriptTests: { ...(s.scriptTests || {}), [sc.id]: v } }));
  return {
    id: sc.id, name: sc.name, path: sc.path, args: sc.args || '', secs: sc.timeoutS || 30, test,
    // Name and time limit save when you leave the box: main fills in a blank name and clamps the limit to 5-300 s.
    onName: e => app.gset(g.id, { scripts: upd({ name: e.target.value }) }),
    onArgs: e => later({ args: e.target.value }),
    onSecs: e => app.gset(g.id, { scripts: upd({ timeoutS: e.target.value }) }),
    onChange: async () => {
      const p = await window.api.libPickScript(); if (!p) return;
      app.gset(g.id, { scripts: upd({ path: p }) });
      setTest(null);
    },
    onRemove: () => { const scripts = list().filter((_, j) => j !== i); app.gmut(g.id, { scripts }); app.gset(g.id, { scripts }); },
    onTest: async () => {
      clearTimeout(app._scrT);
      await app.gset(g.id, { scripts: list() });
      setTest({ running: true });
      const r = await window.api.testScript(g.id, sc.id).catch(e => ({ ok: false, error: e.message }));
      setTest(r);
    },
  };
}

export function scriptVals(app, g) {
  const scripts = g.scripts || [];
  return {
    gScripts: scripts.map((sc, i) => oneScript(app, g, sc, i)),
    onGAddScript: async () => {
      const p = await window.api.libPickScript(); if (!p) return;
      const cur = (app.gfind(g.id) || g).scripts || [];
      const name = fileName(p).replace(/\.[^.]+$/, '');
      app.gset(g.id, { scripts: [...cur, { id: newId(), name, path: p, args: '', timeoutS: 30 }] });
    },
  };
}

function row(s) {
  const t = s.test;
  const failLine = t && !t.running && !t.ok ? (t.timedOut ? 'Still running after ' + s.secs + ' seconds. It may be waiting for input.' : t.line || t.error || '') : '';
  return html`<div class="sx">
<div class="sx-top"><span class="sx-ic">${icon('script', 15)}</span>
<span class="su-sv"><input class="sx-name" value=${s.name} onChange=${s.onName} aria-label="Script name" maxlength="40" /><span title=${s.path}>${s.path}</span></span>
<button class="su-btn" onClick=${s.onChange}>Change</button>
<button class="su-x" aria-label=${'Remove ' + s.name} title="Remove" onClick=${s.onRemove}>${icon('x', 13)}</button></div>
<div class="su-approw"><input class="su-in mono sm" placeholder="Arguments (optional)" value=${s.args} onInput=${s.onArgs} aria-label=${'Arguments for ' + s.name} />
<input class="su-in mono sm sx-secs" value=${s.secs} onChange=${s.onSecs} inputmode="numeric" aria-label=${'Time limit in seconds for ' + s.name} /><span class="sx-unit">s limit</span></div>
<div class="sx-foot"><span class="sx-sum">Uses the game's setup</span>
${t ? testChip(t) : null}${t && t.running ? null : html`<button class="su-btn sx-test" onClick=${s.onTest}>${icon('terminal', 13)}Test</button>`}</div>
${failLine ? html`<div class="sx-err">${failLine}</div>` : null}</div>`;
}

export function scriptsCard(b) {
  const list = b.gScripts || [];
  const empty = list.length ? null : html`<div class="sx-empty">No scripts yet. Add one if you run something before this game, like a script that swaps your wheel or controller profile. Play will then ask which one to run.</div>`;
  return html`<div class="su-box"><div class="su-l"><span>Scripts</span></div>${empty}${list.map(row)}
<button class="su-add" onClick=${b.onGAddScript}>${icon('plus', 14)}Add script</button>
<div class="su-hint">${list.length ? 'Runs after your apps start. SwapDeck waits until it finishes, then starts the game. Works with .ps1, .bat, .cmd and .exe.' : 'Works with .ps1, .bat, .cmd and .exe. Nothing needs to change in your script.'}</div></div>`;
}

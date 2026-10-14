// Library layout, a game's Setup tab: scripts that run before the game (F-007). Play asks which one, runs it,
// waits until it finishes and then starts the game. Values in scriptVals, markup in scriptsCard.
import { html } from './vendor/htm-preact.js';
import { icon } from './libicons.js';
import { ownSummary } from './libscriptsetup.js';

const newId = () => Math.random().toString(36).slice(2, 10);
const fileName = p => String(p || '').split('\\').pop();
const SAVE_DELAY_MS = 400;
// Classic has no screen for a script's own setup: the tick and summary show there, editing happens in the Library layout.
const isClassic = app => (app.state.settings || {}).layout !== 'library';

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
  const classic = isClassic(app);
  return {
    id: sc.id, name: sc.name, path: sc.path, args: sc.args || '', secs: sc.timeoutS || 30, test, classic,
    own: !!sc.own, summary: sc.own ? ownSummary(app, sc) : "Uses the game's setup",
    onOwn: () => { const own = !sc.own; app.gset(g.id, { scripts: upd({ own }) }); if (own && !classic) app.setState({ scEdit: { gid: g.id, sid: sc.id } }); },
    onEdit: () => app.setState({ scEdit: { gid: g.id, sid: sc.id } }),
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
  const vals = {
    gScripts: scripts.map((sc, i) => oneScript(app, g, sc, i)),
    // Create desktop shortcut on a game with scripts: one that asks, or one per script.
    gScutMenu: app.state.scutMenu === g.id,
    onScutMenu: () => app.setState(s => ({ scutMenu: s.scutMenu === g.id ? null : g.id })),
    gScutOpts: scripts.length ? [{ label: 'Ask which script every time', id: null }, ...scripts.map(s => ({ label: 'Always ' + s.name, id: s.id }))]
      .map(o => ({ label: o.label, on: () => { app.setState({ scutMenu: null }); app.shortcut(g, null, null, o.id); } })) : null,
    onGAddScript: async () => {
      const p = await window.api.libPickScript(); if (!p) return;
      const cur = (app.gfind(g.id) || g).scripts || [];
      const name = fileName(p).replace(/\.[^.]+$/, '');
      app.gset(g.id, { scripts: [...cur, { id: newId(), name, path: p, args: '', timeoutS: 30 }] });
    },
  };
  // Classic's game setup shows the same card, in Classic's own section style.
  vals.gScriptsEl = isClassic(app) ? html`<div class="sc-cl sc-clset">${scriptsCard(vals)}</div>` : null;
  return vals;
}

function row(s) {
  const t = s.test;
  const failLine = t && !t.running && !t.ok ? (t.timedOut ? 'Still running after ' + s.secs + ' seconds. It may be waiting for input.' : t.line || t.error || '') : '';
  return html`<div class=${'sx' + (s.own ? ' own' : '')}>
<div class="sx-top"><span class="sx-ic">${icon('script', 15)}</span>
<span class="su-sv"><input class="sx-name" value=${s.name} onChange=${s.onName} aria-label="Script name" maxlength="40" /><span title=${s.path}>${s.path}</span></span>
<button class="su-btn" onClick=${s.onChange}>Change</button>
<button class="su-x" aria-label=${'Remove ' + s.name} title="Remove" onClick=${s.onRemove}>${icon('x', 13)}</button></div>
<div class="su-approw"><input class="su-in mono sm" placeholder="Arguments (optional)" value=${s.args} onInput=${s.onArgs} aria-label=${'Arguments for ' + s.name} />
<input class="su-in mono sm sx-secs" value=${s.secs} onChange=${s.onSecs} inputmode="numeric" aria-label=${'Time limit in seconds for ' + s.name} /><span class="sx-unit">s limit</span></div>
<div class="sx-foot"><button class=${'sx-cb' + (s.own ? ' on' : '')} role="checkbox" aria-checked=${s.own} onClick=${s.onOwn}><span>${s.own ? icon('check', 11) : null}</span>Custom options</button>
<span class=${'sx-sum' + (s.own ? ' on' : '')} title=${s.summary}>${s.summary}</span>${s.own && !s.classic ? html`<button class="su-btn sx-edit" onClick=${s.onEdit}>Edit setup</button>` : null}
${t ? testChip(t) : null}${t && t.running ? null : html`<button class="su-btn sx-test" onClick=${s.onTest}>${icon('terminal', 13)}Test</button>`}</div>
${failLine ? html`<div class="sx-err">${failLine}</div>` : null}${s.own && s.classic ? html`<div class="su-hint">Its own setup is changed in the Library layout (Settings, Appearance).</div>` : null}</div>`;
}

export function scriptsCard(b) {
  const list = b.gScripts || [];
  const empty = list.length ? null : html`<div class="sx-empty">No scripts yet. Add one if you run something before this game, like a script that swaps your wheel or controller profile. Play will then ask which one to run.</div>`;
  // Beta: new in 1.7.0 and not fully tested yet, so the card says so and links to the bug report page.
  const report = () => window.api.openProfile('https://github.com/byteminite/SwapDeck/issues/new');
  return html`<div class="su-box"><div class="su-l"><span>Scripts</span><em class="sx-beta" title="New and not fully tested yet">BETA</em><button class="su-link" onClick=${report}>Report a bug</button></div>
${list.length ? null : html`<div class="su-hint sx-betanote">Scripts are new and not fully tested yet. If something doesn't work, please report it on GitHub.</div>`}${empty}${list.map(row)}
<button class="su-add" onClick=${b.onGAddScript}>${icon('plus', 14)}Add script</button>
<div class="su-hint">${list.length ? 'Runs after your apps start. SwapDeck waits until it finishes, then starts the game. Works with .ps1, .bat, .cmd and .exe.' : 'Works with .ps1, .bat, .cmd and .exe. Nothing needs to change in your script.'}</div></div>`;
}

// Minecraft modpacks: SwapDeck finds them but only adds the ones you pick. New packs are offered under the bell
// (Library layout) or in a toast (Classic); "Choose packs" in Settings > General adds or removes them any time.
import { html } from './vendor/htm-preact.js';
import { icon } from './libicons.js';

// What the launchers have right now, refreshed at most every 15 seconds (the scan itself is cached in main too).
export function loadPacks(app, force) {
  if (app.state.settings.showPacks === false || !window.api.packsFound) return;
  if (!force && app._packsAt && Date.now() - app._packsAt < 15000) return;
  app._packsAt = Date.now();
  window.api.packsFound().then(list => {
    if (!Array.isArray(list)) return;
    app.setState({ packsFound: list });
    offerInClassic(app, list);
  }).catch(() => { app._packsAt = 0; });
}

// Found, not added, and never offered before.
export function newPacks(app) {
  const S = app.state, seen = new Set(S.settings.packsSeen || []);
  const added = new Set(S.settings.packsAdded || []);
  return S.settings.showPacks === false ? [] : (S.packsFound || []).filter(p => !added.has(p.id) && !seen.has(p.id));
}

const count = n => n + ' Minecraft modpack' + (n === 1 ? '' : 's');

export function packsNote(app) {
  loadPacks(app);
  const fresh = newPacks(app);
  if (!fresh.length) return null;
  const from = [...new Set(fresh.map(p => p.label))].join(' and ');
  return { id: 'packs-' + fresh.map(p => p.id).sort().join(','), kind: 'system', ic: 'box', tone: 'acc', title: 'Found ' + count(fresh.length), body: 'In ' + from + '. Pick the ones you want in your Library.', act: 'Review', go: () => openPacks(app) };
}

// Classic has no bell: offer new packs once in a toast.
function offerInClassic(app, list) {
  if (app.state.settings.layout === 'library') return;
  const fresh = newPacks({ state: { ...app.state, packsFound: list } });
  const key = fresh.map(p => p.id).sort().join(',');
  if (!fresh.length || app._packsToast === key) return;
  app._packsToast = key;
  app.toast('info', 'Found ' + count(fresh.length), 'Pick the ones you want in your Library.', { label: 'Review', fn: () => openPacks(app), stay: true });
}

export const openPacks = app => {
  const found = app.state.packsFound || [];
  // Ticked: what's in the Library now, plus packs never offered before (you opened this to add them).
  const cfg = app.state.settings, added = cfg.packsAdded || [], seen = cfg.packsSeen || [];
  app.setState({ packsPick: Object.fromEntries(found.map(p => [p.id, added.includes(p.id) || !seen.includes(p.id)])) });
  loadPacks(app, true);
};

export function packsVals(app) {
  const S = app.state, pick = S.packsPick;
  if (!pick) return null;
  const found = S.packsFound || [];
  const on = id => pick[id] ?? false, nOn = found.filter(p => on(p.id)).length;
  const close = () => app.setState({ packsPick: null });
  return {
    rows: found.map(p => ({ ...p, added: (S.settings.packsAdded || []).includes(p.id), on: on(p.id), isNew: !(S.settings.packsAdded || []).includes(p.id) && !(S.settings.packsSeen || []).includes(p.id), toggle: () => app.setState(s => ({ packsPick: { ...s.packsPick, [p.id]: !on(p.id) } })) })),
    none: !found.length, nOn, close,
    all: () => app.setState({ packsPick: Object.fromEntries(found.map(p => [p.id, nOn < found.length])) }),
    allLabel: nOn < found.length ? 'Select all' : 'Select none',
    save: async () => {
      const added = found.filter(p => on(p.id)).map(p => p.id), before = new Set(S.settings.packsAdded || []);
      const gone = (S.settings.packsAdded || []).filter(id => !added.includes(id) && found.some(p => p.id === id)).length;
      const kept = (S.settings.packsAdded || []).filter(id => !found.some(p => p.id === id));
      close();
      await app.setCfg({ packsAdded: [...kept, ...added], packsSeen: [...new Set([...(S.settings.packsSeen || []), ...found.map(p => p.id)])] });
      loadPacks(app, true);
      const n = added.filter(id => !before.has(id)).length;
      app.toast('success', n ? (n === 1 ? '1 modpack added' : n + ' modpacks added') : gone ? 'Modpacks updated' : 'Modpacks saved',
        n ? 'They\'re in your Library. Play starts them in their launcher.' : gone ? 'Removed packs stay in their launcher.' : 'Nothing changed in your Library.');
    },
  };
}

export function packsOverlay(P) {
  if (!P) return null;
  return html`<div class="tm-ov pk-rev" onClick=${e => { if (e.target === e.currentTarget) P.close(); }}><div class="tm" role="dialog" aria-modal="true" aria-label="Minecraft modpacks">
<div class="tm-h"><h3>Minecraft modpacks</h3><p>Packs from Modrinth, CurseForge and Prism Launcher on this PC. Ticked ones are in your Library.</p></div>
<div class="tm-b">${P.none ? html`<div class="tm-mut">No modpacks found. Install one in Modrinth, CurseForge or Prism Launcher and it shows up here.</div>`
  : html`<div class="pk-list">${P.rows.map(r => html`<label class=${'pk-row' + (r.on ? ' on' : '')}><input type="checkbox" checked=${r.on} onChange=${r.toggle} />
<span class="pk-av" style=${r.icon ? 'background-image:url("' + r.icon + '")' : ''}>${r.icon ? null : icon('box', 18)}</span>
<span class="pk-m"><b>${r.name}</b><span>${r.label}${r.added ? ' · in your Library' : ''}</span></span>${r.isNew ? html`<em>NEW</em>` : null}<span class="pk-chk">${r.on ? icon('check', 13) : null}</span></label>`)}</div>`}</div>
<div class="tm-f">${P.none ? null : html`<button class="st-btn" onClick=${P.all}>${P.allLabel}</button>`}<span class="tm-sp"></span><button class="st-btn" onClick=${P.close}>Cancel</button><button class="st-btn p" disabled=${P.none} onClick=${P.save}>${P.nOn ? 'Save · ' + P.nOn + ' in Library' : 'Save'}</button></div></div></div>`;
}

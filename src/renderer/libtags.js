// Library layout: the Tags manager (rename, recolour, delete, new tag). Renames and deletes run in the main
// process across every game and account, then the app reloads its lists.
import { html } from './vendor/htm-preact.js';
import { icon } from './libicons.js';

const PAL = ['155,213,255', '127,227,242', '126,232,166', '255,210,122', '251,146,60', '255,154,139', '255,143,163', '196,181,253', '229,231,235'];

export const openTags = app => app.setState({ tm: { mode: 'manage', pal: null, del: null }, lsDd: null });
const setTm = (app, patch) => app.setState(s => ({ tm: s.tm && { ...s.tm, ...patch } }));

function allTags(app) {
  const S = app.state, list = [...new Set([...app.tagOrder(), ...(S.settings.tagMade || [])])];
  return list.map(t => {
    const games = S.lib.filter(g => (g.tags || []).includes(t)).length, accts = app.accts.filter(a => (a.tags || []).includes(t)).length;
    const parts = [games && games + (games === 1 ? ' game' : ' games'), accts && accts + (accts === 1 ? ' account' : ' accounts')].filter(Boolean);
    return { t, rgb: app.tagRgb(t), games, accts, used: parts.join(', ') || 'Not used', made: (S.settings.tagMade || []).includes(t) };
  }).filter(x => x.games || x.accts || x.made); // built-in tags nothing uses stay out of the list
}

async function done(app, r, msg) {
  if (!r || !r.ok) { app.toast('error', "Couldn't change the tag", (r && r.error) || 'Something went wrong.'); return false; }
  await app.reload();
  if (msg) app.toast('success', msg, '');
  return true;
}

export function libTagsVals(app) {
  const M = app.state.tm; if (!M) return null;
  const tags = allTags(app), exists = n => tags.some(x => x.t === n.trim().toLowerCase().replace(/\s+/g, '-'));
  const close = () => app.setState({ tm: null });
  return {
    mode: M.mode, close, tags, pal: PAL, palFor: M.pal, delFor: M.del, name: M.name || '', color: M.color || PAL[0], err: M.err || '',
    onPal: t => setTm(app, { pal: M.pal === t ? null : t, del: null }),
    onColor: (t, rgb) => { app.setCfg({ tagColor: { tag: t, rgb } }); setTm(app, { pal: null }); },
    onRename: (t, el) => { const v = el.value.trim(); if (!v || v.toLowerCase() === t) { el.value = t; return; } if (exists(v)) { el.value = t; app.toast('warning', "There's already a tag called " + v, ''); return; } window.api.tagRename(t, v).catch(() => null).then(r => done(app, r, r && 'Renamed ' + t + ' to ' + r.tag)); },
    onAskDel: t => setTm(app, { del: t, pal: null }),
    onDel: t => window.api.tagDelete(t).catch(() => null).then(r => { setTm(app, { del: null }); return done(app, r, t + ' deleted'); }),
    onNew: () => { const used = tags.map(x => x.rgb); setTm(app, { mode: 'new', name: '', color: PAL.find(p => !used.includes(p)) || PAL[0], err: '' }); },
    onName: e => setTm(app, { name: e.target.value, err: exists(e.target.value) ? "There's already a tag called " + e.target.value.trim() : '' }),
    onPick: rgb => setTm(app, { color: rgb }),
    onBack: () => setTm(app, { mode: 'manage' }),
    onCreate: e => {
      e.preventDefault();
      const n = (M.name || '').trim();
      if (!n) return setTm(app, { err: 'Give the tag a name' });
      if (exists(n)) return setTm(app, { err: "There's already a tag called " + n });
      window.api.tagCreate(n, M.color).catch(() => null).then(async r => { if (await done(app, r, r && 'Tag ' + r.tag + ' created')) setTm(app, { mode: 'manage' }); });
    },
  };
}

function manage(T) {
  const rows = T.tags.map(x => html`<div class="tm-row"><button class="tm-dot" style=${'background:rgb(' + x.rgb + ')'} aria-label=${'Colour for ' + x.t} title="Change colour" onClick=${() => T.onPal(x.t)}></button>
<input class="tm-name" key=${x.t} defaultValue=${x.t} aria-label=${'Rename ' + x.t} maxlength="16" onKeyDown=${e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') { e.stopPropagation(); e.target.value = x.t; e.target.blur(); } }} onChange=${e => T.onRename(x.t, e.target)} />
<span class="tm-n">${x.used}</span><button class="tm-x" aria-label=${'Delete ' + x.t} title="Delete" onClick=${() => T.onAskDel(x.t)}>${icon('x', 15)}</button></div>
${T.palFor === x.t ? html`<div class="tm-pal">${T.pal.map(p => html`<button class=${p === x.rgb ? 'on' : ''} style=${'background:rgb(' + p + ');color:rgb(' + p + ')'} aria-label=${'Colour ' + p} onClick=${() => T.onColor(x.t, p)}></button>`)}</div>` : null}
${T.delFor === x.t ? html`<div class="tm-del"><span>${x.games || x.accts ? html`Remove <b>${x.t}</b> from ${x.used}? They stay in SwapDeck.` : html`Delete <b>${x.t}</b>?`}</span><button class="st-btn sm" onClick=${() => T.onAskDel(null)}>Keep</button><button class="st-btn sm tm-go" onClick=${() => T.onDel(x.t)}>Delete</button></div>` : null}`);
  return html`<div class="tm" role="dialog" aria-modal="true" aria-label="Tags"><div class="tm-h"><h3>Tags</h3><p>Group your games and accounts, then filter by tag. Click a name to rename it, or a dot to change its colour.</p></div>
<div class="tm-b">${rows.length ? rows : html`<div class="tm-empty">No tags yet. Make one to start grouping your games.</div>`}</div>
<div class="tm-f"><button class="st-btn" onClick=${T.onNew}>${icon('plus', 15)}New tag</button><span class="tm-sp"></span><button class="st-btn p" onClick=${T.close}>Done</button></div></div>`;
}

function create(T) {
  const preview = (T.name.trim() || 'new tag').toLowerCase().replace(/\s+/g, '-').slice(0, 16);
  return html`<form class="tm sm" role="dialog" aria-modal="true" aria-label="New tag" onSubmit=${T.onCreate}><div class="tm-h"><h3>New tag</h3><p>Add it to games and accounts from their pages.</p></div>
<div class="tm-b"><label class="tm-lab" for="tmName">Name</label><input id="tmName" class="st-in" style="width:100%" maxlength="16" value=${T.name} placeholder="For example co-op" onInput=${T.onName} ref=${el => { if (el && !el.dataset.f) { el.dataset.f = '1'; setTimeout(() => el.focus(), 0); } }} /><div class="tm-err">${T.err}</div>
<label class="tm-lab">Colour</label><div class="tm-pal flat">${T.pal.map(p => html`<button type="button" class=${p === T.color ? 'on' : ''} style=${'background:rgb(' + p + ');color:rgb(' + p + ')'} aria-label=${'Colour ' + p} aria-pressed=${p === T.color} onClick=${() => T.onPick(p)}></button>`)}</div>
<div class="tm-prev">Looks like <span class="tm-chip" style=${'background:rgba(' + T.color + ',.14);color:rgb(' + T.color + ');border-color:rgba(' + T.color + ',.5)'}><i style=${'background:rgb(' + T.color + ')'}></i>${preview}</span></div></div>
<div class="tm-f"><button type="button" class="st-btn" onClick=${T.onBack}>Back</button><span class="tm-sp"></span><button type="submit" class="st-btn p">Create tag</button></div></form>`;
}

export function tagsOverlay(T) {
  return html`<div class="tm-ov" onClick=${e => { if (e.target === e.currentTarget) T.close(); }}>${T.mode === 'new' ? create(T) : manage(T)}</div>`;
}

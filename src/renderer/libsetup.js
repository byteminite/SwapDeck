// Library layout: a game's Setup tab. Same settings and values as Classic's game setup (ui.js gameVals),
// laid out in two columns: left = account, sound, launcher, launch options, CS2 settings; right = scripts, display, companion apps.
import { html } from './vendor/htm-preact.js';
import { icon } from './libicons.js';
import { cs2Card } from './cs2card.js';
import { notesCard } from './gamepage.js';
import { scriptsCard } from './libscripts.js';

// On a script's own setup (b.ovr), each card says whether it has its own value or follows the game.
const tag = (b, k) => !b.ovr ? null : b.ovr[k]
  ? html`<button class="su-ovr on" title="Go back to the game's setting" onClick=${() => b.onReset(k)}>CHANGED · USE GAME'S</button>`
  : html`<span class="su-ovr">SAME AS GAME</span>`;
const box = (label, body, aside, k, b) => html`<div class=${'su-box' + (b && b.ovr && b.ovr[k] ? ' own' : '')}><div class="su-l"><span>${label}</span>${aside || null}${b ? tag(b, k) : null}</div>${body}</div>`;
const check = html`<span class="su-ck">${icon('check', 14)}</span>`;

function account(b) {
  const sel = html`<button class="su-sel" aria-haspopup="listbox" aria-expanded=${!!b.acctMenu} onClick=${b.onAcctMenu}>
${b.gAcctSet ? html`<span class="su-av" style=${'background:' + b.gAcctBg}>${b.gAcctIni}</span>` : html`<span class="su-av none"></span>`}
<span class="su-sv"><b>${b.gAcctLabel}</b><span>${b.gAcctSub}</span></span>${icon('chevron', 15)}</button>`;
  const menu = b.acctMenu ? html`<div class="su-menu" role="listbox">${(b.acctOpts || []).map(o => html`<button class="su-opt" role="option" aria-selected=${o.sel} onClick=${o.on}>
${o.isNone ? html`<span class="su-av sm none"></span>` : html`<span class="su-av sm" style=${'background:' + o.grad}>${o.ini}</span>`}
<span class="su-sv"><b>${o.label}</b><span>${o.sub}</span></span>${o.cur ? html`<em>SIGNED IN</em>` : null}${o.sel ? check : null}</button>`)}</div>` : null;
  return box(b.scOwn ? 'Steam account' : 'Steam account for this game', html`<div class="su-dw">${sel}${menu}</div><div class="su-hint">${b.gAcctHint}</div>`, null, 'acct', b);
}

function sound(b) {
  const menu = b.gAudioMenu ? html`<div class=${'su-menu' + (b.gAudioUp ? ' up' : '')} role="listbox">${(b.gAudioOpts || []).map(o => html`<button class="su-opt" role="option" aria-selected=${o.sel} onClick=${o.on}><span class="su-sv"><b>${o.label}</b></span>${o.sub ? html`<em class="mut">${o.sub}</em>` : null}${o.sel ? check : null}</button>`)}</div>` : null;
  return box('Sound', html`<div class="su-dw"><button class="su-sel" aria-haspopup="listbox" aria-expanded=${!!b.gAudioMenu} onClick=${b.onGAudioMenu}><span class="su-sv"><b>${b.gAudioLabel}</b></span>${icon('chevron', 15)}</button>${menu}</div><div class="su-hint">${b.gAudioHint}</div>`, null, 'audio', b);
}

function launcher(b) {
  if (!b.gSteam) return null;
  return box('Launch with', html`<div class="su-file"><span class="su-sv"><b>${b.gLaunchName}</b><span title=${b.gLaunchPath}>${b.gLaunchPath}</span></span>
<button class="su-btn" onClick=${b.onGLaunchPick}>${b.gLaunchPickLbl}</button>${b.gLaunchCustom ? html`<button class="su-btn" onClick=${b.onGLaunchReset}>Use Steam</button>` : null}</div><div class="su-hint">${b.gLaunchHint}</div>`, null, 'launcher', b);
}

function options(b) {
  const imp = b.gSteam ? html`<button class="su-link" onClick=${b.onGImportOpts} title="Copy this game's launch options from Steam">Import from Steam</button>` : null;
  return box('Launch options', html`<input class="su-in mono" placeholder="e.g. -fullscreen -novid" value=${b.gOpts} onInput=${b.onGOpts} aria-label="Launch options" /><div class="su-hint">${b.gOptsHint}</div>`, imp, 'opts', b);
}

function display(b) {
  const seg = html`<div class="su-seg" role="group">${(b.segDisp || []).map(o => html`<button class=${o.fg === 'var(--text)' ? 'on' : ''} onClick=${o.on}>${o.label}</button>`)}</div>`;
  const mons = html`<div class=${'su-map' + (b.gHasMon ? '' : ' dim')}>${(b.gMons || []).map(m => html`<button class=${'su-mon' + (m.sel ? ' sel' : '') + (m.off ? ' off' : '')} aria-pressed=${m.sel} onClick=${m.on}>
<span class="su-scr" style=${'width:' + m.w + ';height:' + m.h}>${m.num}${m.isPrimary ? html`<i class="t">PRIMARY</i>` : null}${m.off ? html`<i class="o">OFF</i>` : null}${m.sel ? html`<i class="k">${icon('check', 10)}</i>` : null}</span>
<b>${m.name}</b><span>${m.spec}</span></button>`)}</div>`;
  const modes = b.gHasMon ? html`<div class="su-modes">${(b.gModes || []).map(o => html`<button class=${'su-mode' + (o.sel ? ' on' : '')} aria-pressed=${o.sel} onClick=${o.on}><span class="su-rd"></span><span><b>${o.label}</b><span>${o.sub}</span></span></button>`)}</div>`
    : html`<div class="su-hint">Default leaves your displays alone. Pick a monitor to make the game open there.</div>`;
  const res = html`<div class="su-k">RESOLUTION<button class="su-link" onClick=${b.onGResManage}>${b.gResManageLbl}</button></div>
<div class="su-res">${(b.gResOpts || []).map(o => html`<button class=${'su-r' + (o.bd.includes('accent') ? ' on' : '')} onClick=${o.on}><b>${o.label}</b>${o.sub ? html`<span>${o.sub}</span>` : null}</button>`)}</div>
${b.gResHint ? html`<div class="su-hint">${b.gResHint}</div>` : null}`;
  const restore = b.gShowRestore ? html`<div class="su-rst" onClick=${b.onRestoreT}><span class="su-sv"><b>Restore display when the game exits</b><span>${b.rsSub}</span></span><span class="su-tg" style=${'background:' + b.rsBg}><i style=${'transform:' + b.rsX}></i></span></div>` : null;
  return box('Display', html`${mons}${modes}${res}${restore}`, seg, 'display', b);
}

function apps(b) {
  const list = (b.gApps || []).map(a => html`<div class="su-app"><div class="su-file"><span class="su-sv"><b>${a.name}</b><span title=${a.path}>${a.path}</span></span><button class="su-x" aria-label=${'Remove ' + a.name} title="Remove" onClick=${a.onRemove}>${icon('x', 13)}</button></div>
<div class="su-approw"><input class="su-in mono sm" placeholder="Arguments (optional)" value=${a.args} onInput=${a.onArgs} aria-label=${'Arguments for ' + a.name} /><label class="su-cb" onClick=${a.onClose}><span style=${'border-color:' + a.cbBd + ';background:' + a.cbBg}>${a.closeOn ? icon('check', 11) : null}</span>Close with the game</label></div></div>`);
  return box('Also start', html`${list}<button class="su-add" onClick=${b.onGAddApp}>${icon('plus', 14)}Add app</button><div class="su-hint">${b.gAppsHint}</div>`, null, 'apps', b);
}

function extras(b) {
  return html`<div class="su-extra"><button class="su-btn" onClick=${b.onShortcut}>Create desktop shortcut</button>
${b.gNonSteam ? html`<button class="su-btn" onClick=${b.onGEdit}>Edit game</button><button class="su-btn d" onClick=${b.onGRemove}>Remove</button>` : null}</div>`;
}

export function setupTab(b) {
  return html`<div class="su">
<div class="su-col">${b.gSteam ? account(b) : null}${sound(b)}${launcher(b)}${b.gPack ? null : options(b)}${b.gCs2 && !b.scOwn ? html`<div class="su-cs2">${cs2Card(b.gCs2)}</div>` : null}${b.gNoteSetup && !b.scOwn ? notesCard(b.gNoteSetup) : null}</div>
<div class="su-col">${b.scOwn ? null : scriptsCard(b)}${display(b)}${apps(b)}${b.scOwn ? null : extras(b)}</div>
</div>`;
}

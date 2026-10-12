// Library layout Settings: Displays (normal setup map, monitors, resolution profiles, test and restore).
// Same handlers as the Classic window; picking monitors only saves the normal setup until Apply now is pressed.
import { html } from './vendor/htm-preact.js';
import { tg, btn, row } from './libsetui.js';

function monMap(b) {
  const map = html`<div class="st-map">${(b.dLayout || []).map(m => html`<button class=${'st-mbox' + (m.primary ? ' main' : '') + (m.off ? ' off' : '')} style=${'left:' + m.l + ';top:' + m.t + ';width:' + m.w + ';height:' + m.h} title=${m.tip} onClick=${m.on}><b style=${'font-size:' + m.fs}>${m.num}</b><span>${m.name}</span>${m.primary ? html`<em>MAIN</em>` : m.off ? html`<em class="off">OFF</em>` : null}</button>`)}${b.dNoMons ? html`<div class="st-mnone">${b.dNoMons}</div>` : null}</div>`;
  const list = html`<div class="st-mlist">${(b.dMons || []).map(m => html`<div class=${'st-mrow' + (m.mainBg !== 'transparent' ? ' main' : '')}><span class="st-mnum">${m.num}</span><div class="st-m"><b>${m.name}</b><span>${m.spec} · ${m.now}</span></div>
<button class=${'st-pill' + (m.useLabel === 'In use' ? ' on' : '')} aria-pressed=${m.useLabel === 'In use'} onClick=${m.onUse}>${m.useLabel}</button><button class=${'st-pill main' + (m.mainBg !== 'transparent' ? ' on' : '')} aria-pressed=${m.mainBg !== 'transparent'} onClick=${m.onMain}>MAIN</button></div>`)}</div>`;
  const dirty = b.dDirty ? html`<div class="st-warnbar"><span>Your monitors aren't set up like this right now.</span>${btn(b.dApplying ? 'Applying' : 'Apply now', b.onDApply, { p: true, off: b.dApplying })}</div>` : null;
  return html`${map}${list}${dirty}${b.dErr ? html`<div class="st-err">${b.dErr}</div>` : null}`;
}

function profForm(b) {
  return html`<div class="st-form"><b class="st-ft">${b.rpTitle}</b>
<label class="st-fl"><span>Name</span><input class="st-in" placeholder="For example CS2 stretched" maxlength="40" value=${b.rpName} onInput=${b.onRpName} /></label>
<div class="st-res"><label class="st-fl"><span>Width</span><input class="st-in" inputmode="numeric" placeholder="1280" value=${b.rpW} onInput=${b.onRpW} /></label><span class="st-x">×</span><label class="st-fl"><span>Height</span><input class="st-in" inputmode="numeric" placeholder="960" value=${b.rpH} onInput=${b.onRpH} /></label><label class="st-fl"><span>Hz (blank keeps it)</span><input class="st-in" inputmode="numeric" placeholder="Hz" value=${b.rpHz} onInput=${b.onRpHz} /></label></div>
<div class="st-fl row"><span>Stretch to fill the screen<small>For stretched 4:3. If you still get black bars, turn on GPU scaling (AMD: Display, GPU Scaling, Full panel. NVIDIA: Adjust desktop size, Full-screen, on the GPU).</small></span>${tg(b.rpStretchX !== 'translateX(0px)', b.onRpStretch, 'Stretch to fill the screen')}</div>
${b.rpErr ? html`<div class="st-err">${b.rpErr}</div>` : null}<div class="st-ctl">${btn('Cancel', b.onRpCancel)}${btn('Save profile', b.onRpSave, { p: true })}</div></div>`;
}

function profiles(b) {
  const list = (b.rpList || []).length ? b.rpList.map(p => html`<div class="st-prof"><div class="st-m"><b>${p.name}</b><span>${p.spec}</span></div><div class="st-ctl">${p.testing ? html`<span class="st-btn sm busy"><span class="st-spin"></span>Testing</span>` : btn('Test', p.onTest, { off: p.busy })}${btn('Edit', p.onEdit)}${btn('Delete', p.onDel, { d: true })}</div></div>`)
    : html`<div class="st-mut">No profiles yet. Add one to give a game its own resolution.</div>`;
  return html`<div class="st-row col"><div class="st-head"><div class="st-m"><b>Resolution profiles</b><span>Pick one on a game's Setup tab. SwapDeck sets it before the game starts and changes it back afterwards.</span></div>${b.rpNewOn ? btn('Add profile', b.onRpNew, { ic: 'plus' }) : null}</div>${list}${b.rpFormOn ? profForm(b) : null}</div>`;
}

export function displaysSec(app, b) {
  return { k: 'displays', title: 'Displays', sub: 'Your normal monitor setup, and resolution profiles for games.', rows: [
    { raw: html`<div class="st-row col"><div class="st-m"><b>Normal setup</b><span>Every monitor that's plugged in, including ones switched off in Windows. Pick the ones you use day to day and your main one. SwapDeck goes back to this after a game.</span></div>${monMap(b)}</div>`, q: 'normal setup monitors main display primary' },
    { raw: profiles(b), q: 'resolution profiles stretched hz' },
    row('Test the main monitor', 'Makes ' + b.dTestName + ' primary for 10 seconds, then switches back.', b.dTesting ? html`<span class="st-btn sm busy"><span class="st-spin"></span>Testing</span>` : btn('Test', b.onDTest, { off: !b.dTestIdle }), '', 'test display monitor primary'),
    row('Restore display now', 'Use this if a game crashed and left the wrong monitor as the main one.', btn('Restore', b.onRestoreNow, { ic: 'history' })),
  ] };
}

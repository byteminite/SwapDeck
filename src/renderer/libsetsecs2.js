// Library layout Settings: Security, Updates and About.
import { html } from './vendor/htm-preact.js';
import { icon } from './libicons.js';
import { tg, btn, badge, row } from './libsetui.js';

function masterForm(b) {
  const pw = (label, value, on) => html`<label class="st-fl"><span>${label}</span><input class="st-in" type="password" autocomplete="off" value=${value} onInput=${on} onKeyDown=${b.onMpKey} /></label>`;
  return html`<div class="st-form">${b.mpOldOn ? pw('Current password', b.mpOld, b.onMpOld) : null}${b.mpNewOn ? html`${pw('New password', b.mpA, b.onMpA)}${pw('Type it again', b.mpB, b.onMpB)}` : null}
${b.mpSaveLbl === 'Set password' ? html`<div class="st-fl row"><span>Unlock by itself on this PC</span>${tg(b.mpAutoCb !== 'transparent', b.onMpAuto, 'Unlock by itself on this PC')}</div>` : null}
<div class="st-err">${b.mpMismatch ? "The passwords don't match." : b.mpErr || (b.mpNewOn ? "There's no way to recover it, so pick one you remember." : '')}</div>
<div class="st-ctl">${btn('Cancel', b.onMpCancel)}${btn(b.mpSaveLbl, b.onMpSave, { p: b.mpSaveLbl !== 'Remove password', d: b.mpSaveLbl === 'Remove password' })}</div></div>`;
}

export function securitySec(app, b) {
  const cfg = app.state.settings, v = app.state.vault || {}, on = !!b.mpIsOn;
  const master = b.mpIsForm ? { raw: html`<div class="st-row col"><div class="st-m"><b>Master password</b><span>SwapDeck asks for it before it shows your accounts.</span></div>${masterForm(b)}</div>`, q: 'master password lock' }
    : row('Master password', on ? 'Set. Sign-ins are encrypted with it, and SwapDeck asks for it when it starts.' : 'Saved sign-ins are encrypted with Windows. Add a master password for a lock screen on top.',
      on ? html`<div class="st-ctl">${badge('ON')}${btn('Change', b.onMpChange)}${btn('Remove', b.onMpRemove, { d: true })}</div>` : btn('Set a master password', b.onMpSet, { p: true, ic: 'lock' }), '', 'master password lock encrypt');
  return { k: 'security', title: 'Security', sub: 'How saved sign-ins are protected on this PC.', rows: [
    master,
    row('Auto-unlock', 'Skip the lock screen on this PC. Your Windows sign-in unlocks it.', tg(!!v.autoUnlock, b.onMpAuto, 'Auto-unlock'), on && !b.mpIsForm ? 'sub' : 'sub off'),
    row('Lock now', 'Locks SwapDeck until you type the master password.', btn('Lock', () => app.lockNow(), { ic: 'lock' }), on && !b.mpIsForm ? 'sub' : 'sub off'),
    row('Hide account names', 'Shows initials instead of names everywhere, for streaming or screen sharing.', tg(!!cfg.hideNames, () => app.setCfg({ hideNames: !cfg.hideNames }), 'Hide account names'), '', 'hide account names streaming privacy initials'),
    row('Privacy', "Connected accounts store only Steam's sign-in token, encrypted on this PC. Passwords are saved only if you choose to. Tags, notes and stats stay on this PC.", null),
  ] };
}

export function updatesSec(app, b) {
  const ctrl = b.updChecking ? html`<span class="st-btn sm busy"><span class="st-spin"></span>Checking</span>`
    : b.updDl ? html`<span class="st-btn sm busy"><span class="st-spin"></span>Downloading ${b.updPct}</span>`
      : b.updReady ? html`<div class="st-ctl">${badge(b.updVer.toUpperCase() + ' READY')}${btn('Restart to update', b.onUpdRestart, { p: true })}</div>`
        : btn('Check for updates', b.onUpdCheck, { ic: 'refresh', off: !b.updCanCheck });
  return { k: 'updates', title: 'Updates', sub: 'SwapDeck updates itself in the background.', rows: [
    row('SwapDeck ' + b.verShort, b.updReady ? b.updVer + ' is downloaded. It installs when you restart.' : html`<span style=${'color:' + b.updIdleFg}>${b.updIdleText}</span>`, ctrl, '', 'updates version check restart'),
    row("What's new", 'See what changed in every version.', btn('Open', () => app.setState({ wn: true }), { ic: 'info' })),
  ] };
}

export function aboutSec(app, b) {
  return { k: 'about', title: 'About', sub: 'Free and open source, MIT licence.', rows: [
    { raw: html`<div class="st-about"><span class="st-logo"><i></i></span><div><b>SwapDeck</b><span>${b.verShort} · Steam account switcher for Windows · Made with Claude Code</span></div></div>`, q: 'about swapdeck version' },
    row('Releases on GitHub', 'Release notes, downloads and older versions.', btn('Open', b.onAbout, { ic: 'external' })),
    row('Report a problem', 'Opens a new issue on GitHub.', btn('Report', () => window.api.openProfile('https://github.com/byteminite/SwapDeck/issues/new'), { ic: 'external' })),
  ] };
}

export const SET_NAV = [['general', 'General', 'settings'], ['steam', 'Steam', 'gamepad'], ['displays', 'Displays', 'monitor'], ['appearance', 'Appearance', 'layers'], ['security', 'Security', 'lock'], ['updates', 'Updates', 'refresh'], ['about', 'About', 'info']];
export const navIcon = ic => icon(ic, 17);

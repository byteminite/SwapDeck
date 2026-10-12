// Library layout Settings: General, Steam and Appearance. Every control calls the same handler as the Classic
// settings window (b = the App's render values), so behaviour stays identical.
import { html } from './vendor/htm-preact.js';
import { icon } from './libicons.js';
import { dropdown } from './libgames.js';
import { tg, seg, btn, row } from './libsetui.js';
import { openTags } from './libtags.js';
import { startFirst } from './libfirst.js';

const START = [['games', 'My games'], ['recent', 'Recently played'], ['fav', 'Favourites'], ['upd', 'Updates']];

function shortcutCtrl(app, b) {
  const keys = html`<span class=${'st-key' + (b.hkRec ? ' rec' : '')}>${(b.hkRec ? ['...'] : b.hkKeys).map(k => html`<kbd>${k}</kbd>`)}</span>`;
  const rec = () => { app.setState({ setSec: 'general' }); b.onHkRec(); };
  return html`<div class="st-ctl">${b.hkOn ? keys : null}${b.hkOn ? (b.hkRec ? btn('Cancel', b.onHkCancel) : btn('Change', rec)) : null}${b.hkOn && b.hkCanReset && !b.hkRec ? btn('Reset', b.onHkReset) : null}${tg(b.hkOn, b.onHk, 'Open the panel with a shortcut')}</div>`;
}

function hiddenAccts(app) {
  const S = app.state, ids = (S.settings.hiddenAccts || []).filter(sid => S.accounts.some(a => a.sid === sid));
  if (!ids.length) return null;
  const show = sid => app.setCfg({ hiddenAccts: (S.settings.hiddenAccts || []).filter(x => x !== sid) });
  const list = html`<div class="st-list">${ids.map(sid => { const a = S.accounts.find(x => x.sid === sid); return html`<div class="st-li"><b>${S.settings.hideNames ? a.name.slice(0, 2).toUpperCase() : a.name}</b><span>${S.settings.hideNames ? '' : a.login}</span>${btn('Show again', () => show(sid))}</div>`; })}</div>`;
  return row('Hidden accounts', 'Removed from SwapDeck, still saved in Steam.', list, 'col', 'hidden accounts removed show again');
}

function hiddenGames(app) {
  const S = app.state, ids = (S.settings.hiddenGames || []).filter(id => S.lib.some(g => g.id === id));
  if (!ids.length) return null;
  const show = id => app.setCfg({ hiddenGames: (S.settings.hiddenGames || []).filter(x => x !== id) });
  const list = html`<div class="st-list">${ids.map(id => { const g = S.lib.find(x => x.id === id); return html`<div class="st-li"><b>${g.name}</b><span>${g.installed ? 'Installed' : 'Not installed'}</span>${btn('Show again', () => show(id))}</div>`; })}</div>`;
  return row('Hidden games', 'Hidden from the Library with right-click. Steam still has them.', list, 'col', 'hidden games show again');
}

export function generalSec(app, b) {
  const cfg = app.state.settings, start = app.state.settings.libStart || 'games';
  const defDd = { label: b.defName, set: false, open: !!b.defMenu, right: true, toggle: b.onDefMenu, clear: () => {}, opts: (b.defOpts || []).map(o => ({ label: o.name, on: o.sel, pick: o.on })) };
  return { k: 'general', title: 'General', sub: 'What happens around a switch, and how SwapDeck starts.', rows: [
    row('Launch a game after switching', 'Default for every account. Each account can pick its own game on its page.', tg(cfg.launchAfter, b.onLg, 'Launch a game after switching')),
    row('Default game', 'Installed games from your Library.', html`<div class="st-dd">${b.defMenu ? html`<div class="lg-catch" onClick=${b.onDefMenu}></div>` : null}${dropdown(defDd)}</div>`, 'sub' + (cfg.launchAfter ? '' : ' off')),
    row('When I press Stop', 'Stop always puts your display and sound back. Closing the game asks it to close, like Alt+F4.', seg([['ask', 'Ask every time'], ['track', 'Stop tracking only'], ['close', 'Close the game too']].map(([k, label]) => ({ label, on: (cfg.stopPref || 'ask') === k, pick: () => app.setCfg({ stopPref: k }) }))), '', 'when i press stop close game tracking ask'),
    row('Close SwapDeck after switching', 'Quits SwapDeck when the switch finishes.', tg(cfg.closeAfter, b.onCl, 'Close SwapDeck after switching')),
    row('Open SwapDeck on', 'The page you see first in the Library layout.', seg(START.map(([k, label]) => ({ label, on: start === k, pick: () => app.setCfg({ libStart: k }) })))),
    row('Show Minecraft modpacks', 'Packs from Modrinth, CurseForge and Prism Launcher show up in the Library. Play starts them in their launcher.', tg(cfg.showPacks !== false, () => app.setCfg({ showPacks: cfg.showPacks === false }), 'Show Minecraft modpacks'), '', 'minecraft modpacks modrinth curseforge prism launcher'),
    row("Show games that aren't installed", "Owned games that aren't on this PC show up in the Library.", tg(app.showNotInst(), () => app.setCfg({ showNotInstalled: !app.showNotInst() }), "Show games that aren't installed")),
    row('Keep running in the tray', cfg.tray ? 'Closing the window hides SwapDeck in the tray.' : 'Closing the window quits SwapDeck.', tg(cfg.tray, b.onTr, 'Keep running in the tray')),
    row('Open the panel with a shortcut', b.hkRec ? 'Press the new keys now. Esc cancels.' : b.hkErr || b.hkOk || 'Press the keys in any app to open or close the tray panel. Ctrl + Alt works like AltGr on many keyboards; add Shift if a character stops typing.', shortcutCtrl(app, b), cfg.tray ? '' : 'off'),
    row('Start with Windows', b.swSub, tg(cfg.startup, b.onSw, 'Start with Windows')),
    row('Tags', (() => { const t = app.tagOrder(); return t.length ? t.length + (t.length === 1 ? ' tag: ' : ' tags: ') + t.join(', ') : 'No tags yet.'; })(), btn('Manage tags', () => openTags(app), { ic: 'tags' }), '', 'tags group colour color rename delete manage'),
    hiddenAccts(app),
    hiddenGames(app),
    row('Replay first start', 'Walk through the welcome screens again: Steam, accounts, layout and accent.', btn('Replay', () => startFirst(app), { ic: 'play' })),
    row('Backup', 'Tags, notes, games, display and resolution profiles. Sign-ins and passwords are never included.', html`<div class="st-ctl">${btn('Export', b.onExport, { ic: 'download' })}${btn('Import', b.onImport, { ic: 'refresh' })}</div>`),
  ].filter(Boolean) };
}

export function steamSec(app, b) {
  return { k: 'steam', title: 'Steam', sub: 'How SwapDeck starts and finds Steam.', rows: [
    row('Extra Steam launch options', 'Passed to steam.exe every time it starts, for example -silent to keep the Steam window closed.', html`<input class="st-in mono" style="width:240px" value=${b.cfgOpts} placeholder="-silent" aria-label="Extra Steam launch options" onInput=${b.onOpts} />`),
    row('Steam location', html`<span class="st-path" style=${'color:' + b.pathFg}>${b.pathText}</span>`, btn('Browse', b.onBrowse, { ic: 'external' }), '', 'steam location folder path exe browse'),
  ] };
}

function layoutTiles(b) {
  const bar = 'border-radius:5px;background:rgba(var(--fg-rgb),.12)';
  const mini = t => t.isLib ? html`<i style=${'width:12px;' + bar}></i><div class="st-mg">${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => html`<i style=${'border-radius:4px;background:' + (i === 1 ? 'var(--accent)' : 'rgba(var(--fg-rgb),.12)')}></i>`)}</div>`
    : html`<i style=${'flex:1;' + bar}></i><i style=${'flex:1;' + bar}></i><i style=${'flex:1;' + bar}></i>`;
  return html`<div class="st-lays">${b.layoutTiles.map(t => html`<button class=${'st-lay' + (t.on ? ' on' : '')} aria-pressed=${t.on} onClick=${t.pick}><div class="st-mini">${mini(t)}</div><b>${t.label}${t.on ? html`<span class="st-chk">${icon('check', 13)}</span>` : null}</b><span>${t.sub}</span></button>`)}</div>`;
}

export function appearanceSec(app, b) {
  const cfg = app.state.settings, scale = cfg.uiScale ?? 'auto';
  const scaleVal = l => l === 'Auto' ? 'auto' : parseInt(l, 10) / 100;
  const sw = html`<div class="st-sw">${b.accSw.map(s => html`<button style=${'background:' + s.bg + ';box-shadow:' + s.ring} title=${s.name} aria-label=${'Accent ' + s.name} onClick=${s.on}>${s.isWin ? icon('app', 13) : null}</button>`)}<input type="color" class="st-color" ref=${b.colorRef} value=${b.customHex} onInput=${b.onCustomColor} tabindex="-1" aria-hidden="true" /></div>`;
  return { k: 'appearance', title: 'Appearance', sub: 'Layout, theme, accent, motion and size. Changes apply instantly.', rows: [
    { raw: html`<div class="st-row col"><div class="st-m"><b>Layout</b><span>You can switch back any time.</span></div>${layoutTiles(b)}</div>`, q: 'layout classic library' },
    row('Base', 'The background colours.', seg(b.baseTiles.map(t => ({ label: t.name, on: t.sel, pick: t.on }))), '', 'base theme dark oled black light midnight background'),
    row('Accent', b.accLabel, sw, '', 'accent colour color windows custom'),
    row("Accent follows the running game's tag", "Uses the running game's first tag colour.", tg(cfg.followTag, b.onFt, "Accent follows the running game's tag")),
    row('Reduce motion', 'Stops spinning borders, hover lifts and large animations.', tg(cfg.reduceMotion, b.onRd, 'Reduce motion')),
    row('UI scale', 'Now ' + b.scaleNow + '. Also Ctrl +, Ctrl - and Ctrl 0 anywhere in SwapDeck.', seg(b.scaleOpts.map(o => ({ label: o.label, on: scale === scaleVal(o.label), pick: o.on }))), '', 'ui scale size zoom'),
    row('Classic accounts layout', 'Only used by the Classic layout: Grid is the "Who\'s playing?" picker, Gallery the sideways panels.', seg(b.styleOpts.map(o => ({ label: o.label, on: (cfg.accountStyle || 'grid') === o.label.toLowerCase(), pick: o.on })))),
  ] };
}

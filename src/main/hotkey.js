// Opt-in global shortcut that opens the tray panel (Settings > General). It only exists while the tray
// is on: without the tray, closing the window quits SwapDeck, so there would be nothing to open.
const { globalShortcut } = require('electron');

const DEFAULT_KEY = 'Ctrl+Alt+S';
// Ctrl or Alt is required so the shortcut can't fire while typing or playing; the Windows key is left to Windows.
const KEY_RE = /^(?=Ctrl\+|Alt\+)(Ctrl\+)?(Alt\+)?(Shift\+)?([A-Z0-9]|F[1-9]|F1[0-2])$/;

let onPress = () => {};
let active = null;   // the accelerator currently registered
let lastError = null;

const isValidKey = key => typeof key === 'string' && KEY_RE.test(key);
const label = key => key.split('+').join(' + ');

function init(callback) { onPress = callback; }

// Registers the new key before releasing the old one, so a key Windows refuses leaves the old one working.
function apply(settings) {
  const key = isValidKey(settings.hotkey) ? settings.hotkey : DEFAULT_KEY;
  const wanted = settings.tray && settings.hotkeyOn ? key : null;
  if (wanted === active) { lastError = null; return { ok: true }; }
  if (wanted) {
    let ok = false;
    try { ok = globalShortcut.register(wanted, () => onPress()); } catch { ok = false; }
    if (!ok) {
      lastError = label(wanted) + ' is already used by another program. ' + (active ? 'Your shortcut is still ' + label(active) + '.' : 'Pick another key.');
      return { ok: false, error: lastError };
    }
  }
  if (active) globalShortcut.unregister(active);
  active = wanted;
  lastError = null;
  return { ok: true };
}

const error = () => lastError;
function stop() { globalShortcut.unregisterAll(); active = null; }

module.exports = { DEFAULT_KEY, isValidKey, init, apply, error, stop };

// Opt-in global shortcut that opens the tray panel (Settings > General). It only exists while the tray
// is on: without the tray, closing the window quits SwapDeck, so there would be nothing to open.
const { globalShortcut } = require('electron');

const DEFAULT_KEY = 'Ctrl+Alt+S';
// Two of Ctrl/Alt/Shift, in this fixed order, then one key. A single modifier would take over keys every
// program relies on (Ctrl+C, Alt+F4) system-wide; the Windows key is left to Windows.
const KEY_RE = /^(Ctrl\+)?(Alt\+)?(Shift\+)?([A-Z0-9]|F[1-9]|F1[0-2])$/;

let onPress = () => {};
let active = null;   // the accelerator currently registered
let lastError = null; // only set while the shortcut is on but nothing could be registered

const label = key => key.split('+').join(' + ');

function keyProblem(key) {
  const m = typeof key === 'string' && key.match(KEY_RE);
  if (!m) return 'Use a letter, a number or F1 to F12, together with two of Ctrl, Alt and Shift.';
  if (m.slice(1, 4).filter(Boolean).length < 2) return 'Use two of Ctrl, Alt and Shift, so the shortcut can\'t take over keys like Ctrl + C.';
  return null;
}
const isValidKey = key => !keyProblem(key);

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
      const error = label(wanted) + ' is already used by another program. ' + (active ? 'Your shortcut is still ' + label(active) + '.' : 'Pick another key.');
      // With an old key still working, the message belongs to this one attempt only.
      lastError = active ? null : error;
      return { ok: false, error };
    }
  }
  if (active) globalShortcut.unregister(active);
  active = wanted;
  lastError = null;
  return { ok: true };
}

const error = () => lastError;
function stop() { globalShortcut.unregisterAll(); active = null; }

module.exports = { DEFAULT_KEY, keyProblem, isValidKey, init, apply, error, stop };

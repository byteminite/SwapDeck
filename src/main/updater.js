// Auto-update from GitHub Releases (electron-updater). Only the NSIS-installed build can update itself;
// the portable exe and `npm start` report "unsupported".

const { app, Notification } = require('electron');

let autoUpdater = null;
let state = { state: 'idle' };
let emit = () => {};
let manual = false;
let lastCheck = 0, notified = null, onNotifyClick = () => {}, isVisible = () => true;

function supported() {
  return app.isPackaged && !process.env.PORTABLE_EXECUTABLE_DIR;
}

// A line or two from the GitHub release notes (HTML from the release feed) for the update notice.
function summary(notes) {
  const text = (Array.isArray(notes) ? notes.map(n => n.note || '').join(' ') : String(notes || ''))
    .replace(/<h\d[^>]*>.*?<\/h\d>/gis, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&[a-z]+;|&#\d+;/g, ' ')
    .replace(/\s+/g, ' ').trim();
  const first = (text.match(/^.*?[.!](\s|$)/) || [text])[0].trim();
  return first.length > 180 ? first.slice(0, 177) + '…' : first;
}

function set(patch) {
  state = { ...patch, current: app.getVersion() };
  emit(state);
}

// onState: every state change. opts.onNotifyClick opens the window; opts.isVisible says whether it's on screen.
function init(onState, opts = {}) {
  emit = onState;
  if (opts.onNotifyClick) onNotifyClick = opts.onNotifyClick;
  if (opts.isVisible) isVisible = opts.isVisible;
  if (!supported()) {
    state = { state: 'unsupported', portable: !!process.env.PORTABLE_EXECUTABLE_DIR, current: app.getVersion() };
    return;
  }
  ({ autoUpdater } = require('electron-updater'));
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = null;

  autoUpdater.on('checking-for-update', () => set({ state: 'checking' }));
  autoUpdater.on('update-available', i => set({ state: 'downloading', version: i.version, percent: 0, notes: summary(i.releaseNotes) }));
  autoUpdater.on('update-not-available', () => { set({ state: 'none', checkedAt: Date.now(), announce: manual }); manual = false; });
  autoUpdater.on('download-progress', p => set({ state: 'downloading', version: state.version, notes: state.notes, percent: Math.round(p.percent) }));
  autoUpdater.on('update-downloaded', i => { set({ state: 'ready', version: i.version, notes: summary(i.releaseNotes) || state.notes, announce: true }); notifyReady(i.version); });
  autoUpdater.on('error', err => {
    // Before the first release exists GitHub answers 404; only bother the user if they asked.
    const msg = /404|Cannot find latest|No published versions/i.test(String(err && err.message))
      ? 'No releases published on GitHub yet.'
      : 'Couldn\'t reach GitHub to check for updates.';
    set({ state: 'error', error: msg, announce: manual });
    manual = false;
  });

  setTimeout(check, 10000);
  // Every 30 minutes: one small file (latest.yml) from GitHub, so new versions reach people soon after release.
  setInterval(check, 30 * 60 * 1000);
}

function check(isManual) {
  if (!autoUpdater) return state;
  if (state.state === 'downloading' || state.state === 'ready' || state.state === 'installing') return state;
  manual = !!isManual;
  lastCheck = Date.now();
  autoUpdater.checkForUpdates().catch(() => {});
  return state;
}

// The window or the tray panel opened: check again if the last check was over 5 minutes ago.
function checkSoon() { if (Date.now() - lastCheck > 5 * 60 * 1000) check(); }

// A Windows notification when an update is ready and SwapDeck isn't on screen (in the tray, or behind other windows).
function notifyReady(version) {
  if (notified === version || isVisible() || !Notification.isSupported()) return;
  notified = version;
  const n = new Notification({ title: 'SwapDeck ' + version + ' is ready', body: 'Restart SwapDeck to update. Click to see what\'s new.', silent: false });
  n.on('click', () => onNotifyClick());
  n.show();
}

const NOTICE_MS = 1500;
function install() {
  if (!autoUpdater || state.state !== 'ready') return;
  // The silent install closes the window at once, which looks like a crash: show "Installing update" first.
  set({ state: 'installing', version: state.version, notes: state.notes });
  // Silent install (no installer window), then SwapDeck reopens on the new version.
  setTimeout(() => {
    try { autoUpdater.quitAndInstall(true, true); } catch (e) { set({ state: 'error', error: 'Couldn\'t start the update: ' + e.message, announce: true }); }
  }, NOTICE_MS);
}

const current = () => state;

module.exports = { init, check, checkSoon, install, current };

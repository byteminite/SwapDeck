// Auto-update from GitHub Releases (electron-updater). Only the NSIS-installed build can update itself;
// the portable exe and `npm start` report "unsupported".

const { app } = require('electron');

let autoUpdater = null;
let state = { state: 'idle' };
let emit = () => {};
let manual = false;

function supported() {
  return app.isPackaged && !process.env.PORTABLE_EXECUTABLE_DIR;
}

function set(patch) {
  state = { ...patch, current: app.getVersion() };
  emit(state);
}

function init(onState) {
  emit = onState;
  if (!supported()) {
    state = { state: 'unsupported', portable: !!process.env.PORTABLE_EXECUTABLE_DIR, current: app.getVersion() };
    return;
  }
  ({ autoUpdater } = require('electron-updater'));
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = null;

  autoUpdater.on('checking-for-update', () => set({ state: 'checking' }));
  autoUpdater.on('update-available', i => set({ state: 'downloading', version: i.version, percent: 0 }));
  autoUpdater.on('update-not-available', () => { set({ state: 'none', checkedAt: Date.now(), announce: manual }); manual = false; });
  autoUpdater.on('download-progress', p => set({ state: 'downloading', version: state.version, percent: Math.round(p.percent) }));
  autoUpdater.on('update-downloaded', i => set({ state: 'ready', version: i.version, announce: true }));
  autoUpdater.on('error', err => {
    // Before the first release exists GitHub answers 404; only bother the user if they asked.
    const msg = /404|Cannot find latest|No published versions/i.test(String(err && err.message))
      ? 'No releases published on GitHub yet.'
      : 'Couldn\'t reach GitHub to check for updates.';
    set({ state: 'error', error: msg, announce: manual });
    manual = false;
  });

  setTimeout(check, 10000);
  setInterval(check, 6 * 60 * 60 * 1000);
}

function check(isManual) {
  if (!autoUpdater) return state;
  if (state.state === 'downloading' || state.state === 'ready') return state;
  manual = !!isManual;
  autoUpdater.checkForUpdates().catch(() => {});
  return state;
}

function install() {
  if (autoUpdater && state.state === 'ready') autoUpdater.quitAndInstall(false, true);
}

const current = () => state;

module.exports = { init, check, install, current };

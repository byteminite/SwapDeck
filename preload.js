const { contextBridge, ipcRenderer } = require('electron');

const invoke = (ch, ...a) => ipcRenderer.invoke(ch, ...a);
const EVENTS = ['steam', 'accounts', 'account', 'switch', 'stats', 'link', 'zoom', 'update'];

contextBridge.exposeInMainWorld('api', {
  state: () => invoke('state'),
  switchTo: sid => invoke('switch', sid),
  closeSteam: () => invoke('steam:close'),
  startSteam: () => invoke('steam:start'),
  addAccount: () => invoke('add'),
  cancelAdd: () => invoke('add:cancel'),
  forget: sid => invoke('forget', sid),
  setMeta: (sid, patch) => invoke('meta', sid, patch),
  setSettings: patch => invoke('settings', patch),
  browseSteam: () => invoke('steam:browse'),
  refreshStats: sid => invoke('stats:refresh', sid),
  linkQR: sid => invoke('link:qr', sid),
  linkPassword: (sid, login, pw) => invoke('link:pw', sid, login, pw),
  linkCode: code => invoke('link:code', code),
  linkCancel: () => invoke('link:cancel'),
  unlink: sid => invoke('unlink', sid),
  openProfile: url => invoke('open', url),
  checkUpdates: () => invoke('update:check'),
  installUpdate: () => invoke('update:install'),
  win: action => ipcRenderer.send('win', action),
  on: (ch, fn) => {
    if (!EVENTS.includes(ch)) throw new Error('Unknown channel ' + ch);
    const h = (_, ...a) => fn(...a);
    ipcRenderer.on(ch, h);
    return () => ipcRenderer.removeListener(ch, h);
  },
});

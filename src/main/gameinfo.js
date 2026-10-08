// What Steam keeps on this PC about a game, for the Overview tab of its details: update state (from the app
// manifest), installed workshop items and screenshots per account. Read only; nothing here writes to Steam.

const fs = require('fs');
const path = require('path');
const steam = require('./steam');
const vdf = require('./vdf');

// AppState StateFlags bits Steam writes to appmanifest_<appid>.acf.
const F = { updateRequired: 2, installed: 4, filesMissing: 32, filesCorrupt: 128, updateRunning: 256, updatePaused: 512,
  updateStarted: 1024, validating: 131072, preallocating: 524288, downloading: 1048576, staging: 2097152, committing: 4194304 };
const ACTIVE = F.updateRunning | F.downloading | F.staging | F.committing | F.preallocating;

const readVdf = file => { try { return vdf.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } };
const num = v => Number(v) || 0;
const pct = (done, total) => total > 0 ? Math.max(0, Math.min(100, Math.floor(done / total * 100))) : 0;

function manifest(dir, appid) {
  for (const lib of steam.libraryDirs(dir)) {
    const st = readVdf(path.join(lib, `appmanifest_${appid}.acf`));
    if (st) return { lib, st: vdf.get(st, 'AppState') || {} };
  }
  return null;
}

// Turns the manifest into one of: ok, queued, downloading, paused, verifying, failed, missing.
function stateOf(st) {
  const flags = num(vdf.get(st, 'StateFlags'));
  const toDl = num(vdf.get(st, 'BytesToDownload')), dl = num(vdf.get(st, 'BytesDownloaded'));
  const toStage = num(vdf.get(st, 'BytesToStage')), staged = num(vdf.get(st, 'BytesStaged'));
  const staging = flags & (F.staging | F.committing);
  const progress = staging ? pct(staged, toStage) : pct(dl, toDl), size = staging ? toStage : toDl;
  if (flags & F.validating) return { state: 'verifying', pct: progress, bytes: size };
  if (flags & ACTIVE) return { state: 'downloading', pct: progress, bytes: size, staging: !!staging };
  if (flags & F.updatePaused) return { state: 'paused', pct: progress, bytes: size };
  if (flags & (F.filesMissing | F.filesCorrupt)) return { state: 'failed', reason: 'files' };
  if (flags & (F.updateRequired | F.updateStarted)) {
    return num(vdf.get(st, 'UpdateResult')) ? { state: 'failed', reason: 'update', code: num(vdf.get(st, 'UpdateResult')) } : { state: 'queued', bytes: size };
  }
  return flags & F.installed ? { state: 'ok', lastUpdated: num(vdf.get(st, 'LastUpdated')) * 1000 } : { state: 'missing' };
}

function updateStatus(dir, appid) {
  const m = dir && manifest(dir, appid);
  return m ? stateOf(m.st) : { state: 'missing' };
}

function workshop(dir, appid) {
  let items = 0, bytes = 0;
  for (const lib of steam.libraryDirs(dir || '')) {
    const w = readVdf(path.join(lib, 'workshop', `appworkshop_${appid}.acf`));
    const installed = w && vdf.get(vdf.get(w, 'AppWorkshop') || {}, 'WorkshopItemsInstalled');
    if (!installed || typeof installed !== 'object') continue;
    for (const it of Object.values(installed)) { items++; bytes += num(vdf.get(it, 'size')); }
  }
  return { items, bytes };
}

// Screenshots one account took of a game, newest first, from userdata/<accountid>/760/screenshots.vdf.
const SHOT = /^\d+\/screenshots\/(thumbnails\/)?[\w.-]+\.(jpe?g|png)$/i;
function screenshots(dir, accountId, appid) {
  const base = path.join(dir, 'userdata', String(accountId), '760');
  const data = readVdf(path.join(base, 'screenshots.vdf'));
  const list = data && vdf.get(vdf.get(data, 'screenshots') || {}, String(appid));
  if (!list || typeof list !== 'object') return [];
  return Object.values(list)
    .map(s => ({ file: vdf.get(s, 'filename'), thumb: vdf.get(s, 'thumbnail'), at: num(vdf.get(s, 'creation')) * 1000, w: num(vdf.get(s, 'width')), h: num(vdf.get(s, 'height')) }))
    .filter(s => typeof s.file === 'string' && SHOT.test(s.file) && fs.existsSync(path.join(base, 'remote', s.file)))
    .map(s => ({ ...s, thumb: typeof s.thumb === 'string' && SHOT.test(s.thumb) && fs.existsSync(path.join(base, 'remote', s.thumb)) ? s.thumb : s.file }))
    .sort((a, b) => b.at - a.at);
}

// For the sdimg:// protocol: the file of a screenshot, only if the path is exactly one Steam wrote.
function screenshotFile(dir, accountId, rel) {
  if (!dir || !/^\d{1,12}$/.test(String(accountId)) || !SHOT.test(rel)) return null;
  const base = path.join(dir, 'userdata', String(accountId), '760', 'remote');
  const file = path.join(base, rel);
  return file.startsWith(base + path.sep) ? file : null;
}
const screenshotFolder = (dir, accountId, appid) => path.join(dir, 'userdata', String(accountId), '760', 'remote', String(appid), 'screenshots');

module.exports = { updateStatus, workshop, screenshots, screenshotFile, screenshotFolder };

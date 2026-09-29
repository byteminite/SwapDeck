// "Link account": a one-time Steam sign-in that gives SwapDeck a refresh token for reading stats.
// Sign-in options: QR code, password + Steam Guard, or pasting an existing refresh token.
// Passwords are stored only if you explicitly opt in ("remember"), encrypted with Windows DPAPI.

const os = require('os');
const QRCode = require('qrcode');
const { LoginSession, EAuthTokenPlatformType, EAuthSessionGuardType } = require('steam-session');
const store = require('./store');

// A Steam refresh token is a JWT: iss=steam, sub=<steamid64>, with an exp. Validate shape/owner/expiry
// before trusting a pasted one, so we reject the wrong account or an expired paste with a clear message.
function inspectToken(token) {
  const parts = String(token || '').trim().split('.');
  if (parts.length !== 3) return { ok: false, reason: "That doesn't look like a Steam token." };
  let c;
  try { c = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')); }
  catch { return { ok: false, reason: "That token couldn't be read." }; }
  if (c.iss !== 'steam' || !/^\d{17}$/.test(String(c.sub || ''))) return { ok: false, reason: 'That is not a Steam sign-in token (need a refresh token, not an access token).' };
  if (c.exp && c.exp * 1000 < Date.now()) return { ok: false, reason: 'That token has already expired.' };
  return { ok: true, sid: String(c.sub) };
}

let cur = null; // { sid, session, emit, onLinked, qr }

function qrData(url) {
  const q = QRCode.create(url, { errorCorrectionLevel: 'M' });
  const size = q.modules.size;
  let d = '';
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) if (q.modules.data[y * size + x]) d += `M${x + 2} ${y + 2}h1v1h-1z`;
  }
  return { path: d, size: size + 4 };
}

function errText(err) {
  switch (err && err.eresult) {
    case 5: return 'Wrong login name or password.';
    case 65: case 88: return "Steam didn't accept the code. It may have expired, since codes only last about 30 seconds.";
    case 84: case 87: return 'Too many sign-in attempts. Wait a few minutes, then try again.';
    case 15: return 'Steam denied the sign-in.';
    case 27: return 'The sign-in request expired. Try again.';
    default: return (err && err.message) ? `Steam said: ${err.message}` : 'Steam rejected the sign-in.';
  }
}

function cancel() {
  if (!cur) return;
  try { cur.session.cancelLoginAttempt(); } catch {}
  cur = null;
}

function begin(sid, emit, onLinked) {
  cancel();
  const session = new LoginSession(EAuthTokenPlatformType.SteamClient, {
    machineId: true,
    machineFriendlyName: `SwapDeck (${os.hostname()})`,
  });
  session.loginTimeout = 180000;
  const me = { sid, session, emit, onLinked, qr: false };
  cur = me;
  const live = () => cur === me;
  const fail = err => { if (!live()) return; cur = null; emit({ step: 'fail', err: typeof err === 'string' ? err : errText(err) }); };

  session.on('remoteInteraction', () => { if (live() && me.qr) emit({ step: 'scanned' }); });
  session.on('debug', (msg, obj) => {
    // steam-session doesn't emit an event when the QR challenge rotates, but the poll response carries it.
    if (live() && me.qr && msg === 'poll response' && obj && obj.newChallengeUrl) emit({ step: 'qr', qr: qrData(obj.newChallengeUrl) });
  });
  session.on('timeout', () => fail('The sign-in timed out. Start again when you are ready.'));
  session.on('error', fail);
  session.on('authenticated', () => {
    if (!live()) return;
    const got = session.steamID && session.steamID.getSteamID64();
    if (got !== sid) {
      fail(`That sign-in was for "${session.accountName}", not this account. Pick the right account in the Steam app and try again.`);
      return;
    }
    try {
      store.setToken(sid, session.refreshToken, session.steamGuardMachineToken);
      if (me.remember && me.creds) store.setCredentials(sid, me.creds.login, me.creds.password);
    } catch (e) {
      fail(e.message);
      return;
    }
    cur = null;
    emit({ step: 'ok', remembered: !!(me.remember && me.creds) });
    onLinked(sid);
  });
  return me;
}

async function startQR(sid, emit, onLinked) {
  const me = begin(sid, emit, onLinked);
  me.qr = true;
  try {
    const r = await me.session.startWithQR();
    if (cur === me) emit({ step: 'qr', qr: qrData(r.qrChallengeUrl) });
  } catch (e) {
    if (cur === me) { cur = null; emit({ step: 'fail', err: errText(e) }); }
  }
}

function guardStep(validActions) {
  const types = (validActions || []).map(a => a.type);
  const email = (validActions || []).find(a => a.type === EAuthSessionGuardType.EmailCode);
  const hasCode = types.includes(EAuthSessionGuardType.DeviceCode) || !!email;
  const confirm = types.includes(EAuthSessionGuardType.DeviceConfirmation) || types.includes(EAuthSessionGuardType.EmailConfirmation);
  if (hasCode) {
    return {
      step: 'guard',
      guard: email && !types.includes(EAuthSessionGuardType.DeviceCode) ? 'email' : 'mobile',
      detail: email && email.detail ? email.detail : null,
      canConfirm: confirm,
    };
  }
  return { step: 'confirm' };
}

async function startPassword(sid, accountName, password, emit, onLinked, remember) {
  const me = begin(sid, emit, onLinked);
  me.remember = !!remember;
  if (remember) me.creds = { login: accountName, password };
  emit({ step: 'working', work: 'Signing in to Steam…' });
  try {
    const details = { accountName, password };
    const mt = store.getMachineToken(sid);
    if (mt) details.steamGuardMachineToken = mt;
    const r = await me.session.startWithCredentials(details);
    if (cur !== me) return;
    if (!r.actionRequired) emit({ step: 'working', work: 'Finishing sign-in…' });
    else emit(guardStep(r.validActions));
  } catch (e) {
    if (cur === me) { cur = null; emit({ step: 'fail', err: errText(e) }); }
  }
}

async function submitCode(code, emit) {
  const me = cur;
  if (!me) return;
  emit({ step: 'working', work: 'Checking Steam Guard code…' });
  try {
    await me.session.submitSteamGuardCode(code);
    if (cur === me) emit({ step: 'working', work: 'Finishing sign-in…' });
  } catch (e) {
    if (cur === me) emit({ step: 'guard', error: errText(e), keep: true });
  }
}

// Store a refresh token the user pasted (e.g. exported from another tool). No Steam round-trip here;
// the stats fetch that follows verifies it against Steam and reports back if it's rejected.
function pasteToken(sid, token, emit, onLinked) {
  cancel();
  const chk = inspectToken(token);
  if (!chk.ok) { emit({ step: 'fail', err: chk.reason }); return; }
  if (chk.sid !== sid) { emit({ step: 'fail', err: 'That token is for a different Steam account than this one.' }); return; }
  try {
    store.setToken(sid, String(token).trim(), null);
  } catch (e) {
    emit({ step: 'fail', err: e.message });
    return;
  }
  emit({ step: 'ok' });
  onLinked(sid);
}

// Best-effort silent relink: when a stored token has expired and the user opted to remember the
// password, mint a fresh token in the background. Only works for accounts whose sign-in needs no
// interactive Steam Guard code (e.g. email guard covered by a stored machine token). Self-contained:
// it never touches the interactive `cur` session.
function silentRelink(sid) {
  const creds = store.getCredentials(sid);
  if (!creds) return Promise.resolve({ ok: false, reason: 'no-credentials' });
  return new Promise(resolve => {
    const session = new LoginSession(EAuthTokenPlatformType.SteamClient, {
      machineId: true,
      machineFriendlyName: `SwapDeck (${os.hostname()})`,
    });
    session.loginTimeout = 30000;
    let done = false;
    const finish = r => { if (done) return; done = true; try { session.cancelLoginAttempt(); } catch {} resolve(r); };
    session.on('error', () => finish({ ok: false, reason: 'error' }));
    session.on('timeout', () => finish({ ok: false, reason: 'timeout' }));
    session.on('authenticated', () => {
      if (session.steamID && session.steamID.getSteamID64() !== sid) return finish({ ok: false, reason: 'mismatch' });
      try { store.setToken(sid, session.refreshToken, session.steamGuardMachineToken); } catch { return finish({ ok: false, reason: 'store' }); }
      finish({ ok: true });
    });
    const details = { accountName: creds.login, password: creds.password };
    const mt = store.getMachineToken(sid);
    if (mt) details.steamGuardMachineToken = mt;
    session.startWithCredentials(details).then(r => {
      // A guard prompt means we can't finish silently (mobile 2FA needs a code the user must type).
      if (r.actionRequired) finish({ ok: false, reason: 'guard' });
    }).catch(() => finish({ ok: false, reason: 'error' }));
  });
}

module.exports = { startQR, startPassword, submitCode, pasteToken, silentRelink, cancel, inspectToken };

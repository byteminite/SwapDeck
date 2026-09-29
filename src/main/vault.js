// Optional master-password vault over the secret store (tokens + saved credentials).
//
// Two modes:
//   - 'dpapi'  (default): each secret encrypted with Windows DPAPI via Electron safeStorage.
//               No prompt, tied to this Windows user. Unchanged from before vaults existed.
//   - 'master': secrets encrypted with a key derived from a master password (scrypt) using
//               AES-256-GCM. The app must be unlocked (password entered) before secrets are
//               readable. Optionally the derived key is also wrapped with DPAPI so it
//               auto-unlocks on this PC without typing, while staying portable via the password.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app, safeStorage } = require('electron');

const CHECK = 'swapdeck-vault-check-v1';
const SCRYPT = { N: 1 << 15, r: 8, p: 1, maxmem: 96 * 1024 * 1024 };

let file = null;
let vault = null;          // parsed vault.json, or null in dpapi mode
let key = null;            // Buffer(32) when master mode is unlocked
let unlocked = true;       // dpapi mode is always "unlocked"

function load() {
  file = path.join(app.getPath('userData'), 'vault.json');
  try { vault = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { vault = null; }
  key = null;
  unlocked = !vault;
  if (vault && vault.autoKey && safeStorage.isEncryptionAvailable()) {
    // DPAPI auto-unlock: recover the derived key without a password prompt.
    try {
      const k = Buffer.from(safeStorage.decryptString(Buffer.from(vault.autoKey, 'base64')), 'base64');
      if (k.length === 32 && verify(k)) { key = k; unlocked = true; }
    } catch {}
  }
}

function derive(password, saltB64) {
  return crypto.scryptSync(Buffer.from(password, 'utf8'), Buffer.from(saltB64, 'base64'), 32, SCRYPT);
}

function aesEncrypt(k, plaintext) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', k, iv);
  const ct = Buffer.concat([c.update(Buffer.from(plaintext, 'utf8')), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), ct]).toString('base64');
}
function aesDecrypt(k, b64) {
  const raw = Buffer.from(b64, 'base64');
  const iv = raw.subarray(0, 12), tag = raw.subarray(12, 28), ct = raw.subarray(28);
  const d = crypto.createDecipheriv('aes-256-gcm', k, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]).toString('utf8');
}

function verify(k) {
  try { return aesDecrypt(k, vault.check) === CHECK; } catch { return false; }
}

// ---- secret cipher used by the store ----

function encrypt(s) {
  if (mode() === 'master') {
    if (!unlocked || !key) throw new Error('Vault is locked.');
    return 'v1:' + aesEncrypt(key, s);
  }
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Windows encryption is unavailable, so SwapDeck can\'t store secrets safely.');
  return safeStorage.encryptString(s).toString('base64');
}
function decrypt(b) {
  if (typeof b === 'string' && b.startsWith('v1:')) {
    if (!unlocked || !key) return null;
    try { return aesDecrypt(key, b.slice(3)); } catch { return null; }
  }
  try { return safeStorage.decryptString(Buffer.from(b, 'base64')); } catch { return null; }
}

// ---- state ----

const mode = () => (vault ? 'master' : 'dpapi');
const isLocked = () => mode() === 'master' && !unlocked;
function status() {
  return { mode: mode(), locked: isLocked(), autoUnlock: !!(vault && vault.autoKey), canEncrypt: safeStorage.isEncryptionAvailable() };
}

function unlock(password) {
  if (!vault) return { ok: true };
  const k = derive(password, vault.salt);
  if (!verify(k)) return { ok: false, error: 'Wrong master password.' };
  key = k;
  unlocked = true;
  return { ok: true };
}

function writeVault() { fs.writeFileSync(file, JSON.stringify(vault)); }

// Build a fresh master vault. Caller must re-encrypt existing secrets around this
// (read plaintext first with the old cipher, write it back after).
function enable(password, autoUnlock) {
  const salt = crypto.randomBytes(16).toString('base64');
  const k = derive(password, salt);
  vault = { v: 1, salt, check: aesEncrypt(k, CHECK) };
  key = k;
  unlocked = true;
  setAutoUnlock(autoUnlock);
  writeVault();
}

function setAutoUnlock(on) {
  if (!vault || !key) return;
  if (on && safeStorage.isEncryptionAvailable()) vault.autoKey = safeStorage.encryptString(key.toString('base64')).toString('base64');
  else delete vault.autoKey;
  writeVault();
}

function change(oldPassword, newPassword) {
  if (!vault) return { ok: false, error: 'No master password is set.' };
  if (!verify(derive(oldPassword, vault.salt))) return { ok: false, error: 'Current password is wrong.' };
  const hadAuto = !!vault.autoKey;
  const salt = crypto.randomBytes(16).toString('base64');
  const k = derive(newPassword, salt);
  vault = { v: 1, salt, check: aesEncrypt(k, CHECK) };
  key = k;
  unlocked = true;
  setAutoUnlock(hadAuto);
  writeVault();
  return { ok: true };
}

// Turn master mode off (back to DPAPI). Caller re-encrypts secrets around this.
function disable() {
  vault = null;
  key = null;
  unlocked = true;
  try { fs.unlinkSync(file); } catch {}
}

module.exports = { load, encrypt, decrypt, status, isLocked, unlock, enable, change, disable, setAutoUnlock, mode };

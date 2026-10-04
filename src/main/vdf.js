// Minimal parser/serializer for Valve's text KeyValues (.vdf / .acf) format.
// Objects keep key insertion order, which is what Steam expects on write-back.

function parse(text) {
  let i = 0;
  const n = text.length;

  function skip() {
    while (i < n) {
      const c = text[i];
      if (c === ' ' || c === '\t' || c === '\r' || c === '\n' || c === '﻿') { i++; continue; }
      if (c === '/' && text[i + 1] === '/') { while (i < n && text[i] !== '\n') i++; continue; }
      break;
    }
  }

  function token() {
    skip();
    if (i >= n) return null;
    const c = text[i];
    if (c === '{' || c === '}') { i++; return { t: c }; }
    if (c === '"') {
      i++;
      let s = '';
      while (i < n && text[i] !== '"') {
        if (text[i] === '\\' && i + 1 < n) {
          const e = text[i + 1];
          s += e === 'n' ? '\n' : e === 't' ? '\t' : e;
          i += 2;
        } else {
          s += text[i++];
        }
      }
      i++;
      return { t: 's', v: s };
    }
    let s = '';
    while (i < n && !/[\s{}"]/.test(text[i])) s += text[i++];
    return { t: 's', v: s };
  }

  function readObject(root) {
    const obj = {};
    for (;;) {
      const k = token();
      if (!k) { if (root) return obj; throw new Error('Unexpected end of VDF'); }
      if (k.t === '}') { if (root) throw new Error('Unexpected } in VDF'); return obj; }
      if (k.t !== 's') throw new Error('Expected key in VDF');
      let v = token();
      // Skip platform conditionals like [$WIN32]
      if (v && v.t === 's' && /^\[.*\]$/.test(v.v)) v = token();
      if (!v) { obj[k.v] = ''; if (root) return obj; throw new Error('Unexpected end of VDF'); }
      // A dangling key right before "}" (seen in localconfig.vdf): keep it as empty and close the object.
      if (v.t === '}') { obj[k.v] = ''; if (root) throw new Error('Unexpected } in VDF'); return obj; }
      if (v.t === '{') obj[k.v] = readObject(false);
      else if (v.t === 's') {
        obj[k.v] = v.v;
        const save = i;
        const cond = token();
        if (!(cond && cond.t === 's' && /^\[.*\]$/.test(cond.v))) i = save;
      } else throw new Error('Unexpected } in VDF');
    }
  }

  return readObject(true);
}

function esc(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function stringify(obj, depth = 0) {
  const pad = '\t'.repeat(depth);
  let out = '';
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object') {
      out += `${pad}"${esc(k)}"\n${pad}{\n${stringify(v, depth + 1)}${pad}}\n`;
    } else {
      out += `${pad}"${esc(k)}"\t\t"${esc(v)}"\n`;
    }
  }
  return out;
}

// VDF keys are case-insensitive; Steam isn't always consistent about casing.
function get(obj, key) {
  if (!obj || typeof obj !== 'object') return undefined;
  if (key in obj) return obj[key];
  const lk = key.toLowerCase();
  for (const k of Object.keys(obj)) if (k.toLowerCase() === lk) return obj[k];
  return undefined;
}

function set(obj, key, value) {
  const lk = key.toLowerCase();
  for (const k of Object.keys(obj)) if (k.toLowerCase() === lk) { obj[k] = value; return; }
  obj[key] = value;
}

module.exports = { parse, stringify, get, set };

// Reader for Valve's binary KeyValues, the format of Steam's appcache/stats files. Read only.
// Each entry is a type byte, a NUL-terminated UTF-8 name, then the value; 0x08 closes an object.

const T = { OBJECT: 0, STRING: 1, INT32: 2, FLOAT32: 3, POINTER: 4, WSTRING: 5, COLOR: 6, UINT64: 7, END: 8, INT64: 10, END_ALT: 11 };
const MAX_DEPTH = 32;

function parse(buf) {
  let i = 0;
  const cstr = () => {
    const end = buf.indexOf(0, i);
    if (end < 0) throw new Error('unterminated string');
    const s = buf.toString('utf8', i, end);
    i = end + 1;
    return s;
  };
  const need = n => { if (i + n > buf.length) throw new Error('truncated'); };
  function obj(depth) {
    if (depth > MAX_DEPTH) throw new Error('too deep');
    const out = Object.create(null);
    while (i < buf.length) {
      const t = buf[i++];
      if (t === T.END || t === T.END_ALT) return out;
      const name = cstr();
      switch (t) {
        case T.OBJECT: out[name] = obj(depth + 1); break;
        case T.STRING: out[name] = cstr(); break;
        case T.INT32: case T.POINTER: case T.COLOR: need(4); out[name] = buf.readInt32LE(i); i += 4; break;
        case T.FLOAT32: need(4); out[name] = buf.readFloatLE(i); i += 4; break;
        case T.UINT64: need(8); out[name] = buf.readBigUInt64LE(i).toString(); i += 8; break;
        case T.INT64: need(8); out[name] = buf.readBigInt64LE(i).toString(); i += 8; break;
        case T.WSTRING: { let end = i; while (end + 1 < buf.length && (buf[end] || buf[end + 1])) end += 2; out[name] = buf.toString('utf16le', i, end); i = end + 2; break; }
        default: throw new Error('unknown type ' + t + ' at ' + (i - 1));
      }
    }
    return out;
  }
  return obj(0);
}

module.exports = { parse };

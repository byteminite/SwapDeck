// Tag rules shared by the IPC handlers (main.js) and backup import (store.js), so a tag from either
// path has the same shape the tag inputs produce.

// Lowercase, dashes for spaces, at most 16 characters. Leading underscores are dropped so a tag can never
// look like the renderer's own "__fav" key.
const tagName = t => String(t).trim().toLowerCase().replace(/\s+/g, '-').replace(/^_+/, '').slice(0, 16);
// Names such as "constructor" collide with built-ins wherever tags are used as object keys.
const isUsable = t => !!t && !(t in Object.prototype);

function cleanTags(list, max = 12) {
  if (!Array.isArray(list)) return [];
  return [...new Set(list.slice(0, Math.max(50, max)).map(tagName).filter(isUsable))].slice(0, max);
}

// A colour as "r,g,b" with each part 0-255.
function validRgb(v) {
  const m = typeof v === 'string' && v.match(/^(\d{1,3}),(\d{1,3}),(\d{1,3})$/);
  return !!m && m.slice(1).every(n => +n <= 255);
}

module.exports = { cleanTags, validRgb };

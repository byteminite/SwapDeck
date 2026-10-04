// Theme tokens shared by the main window (ui.js) and the tray panel (tray.js): base palettes, accents,
// and the CSS custom properties derived from them.

const BASES = {
  dark: { label: 'Dark', light: false, background: '#0a0a0c', surface: '#0f0f13', 'surface-raised': '#141419', border: 'rgba(255,255,255,.1)', 'border-strong': 'rgba(255,255,255,.22)', text: '#f4f4f5', 'text-soft': '#d4d4d8', 'text-muted': '#b1b1bb', 'text-subtle': '#9b9ba7', 'fg-rgb': '255,255,255', overlay: 'rgba(4,4,7,.74)', 'ok-fg': '#86efac', 'bad-fg': '#fca5a5', 'warn-fg': '#fcd34d', 'art-fade': '#0f0f13', 'btn-bg': '#ffffff', 'btn-fg': '#0a0a0c', 'btn-sub': '#52525b', 'btn-dis': 'rgba(255,255,255,.25)', 'shadow-c': 'rgba(0,0,0,.6)' },
  oled: { label: 'OLED Black', light: false, background: '#000000', surface: '#08080a', 'surface-raised': '#111114', border: 'rgba(255,255,255,.09)', 'border-strong': 'rgba(255,255,255,.2)', text: '#f4f4f5', 'text-soft': '#d4d4d8', 'text-muted': '#b1b1bb', 'text-subtle': '#9b9ba7', 'fg-rgb': '255,255,255', overlay: 'rgba(0,0,0,.8)', 'ok-fg': '#86efac', 'bad-fg': '#fca5a5', 'warn-fg': '#fcd34d', 'art-fade': '#08080a', 'btn-bg': '#ffffff', 'btn-fg': '#000000', 'btn-sub': '#52525b', 'btn-dis': 'rgba(255,255,255,.25)', 'shadow-c': 'rgba(0,0,0,.8)' },
  light: { label: 'Light', light: true, background: '#f3f3f6', surface: '#ffffff', 'surface-raised': '#ffffff', border: 'rgba(0,0,0,.09)', 'border-strong': 'rgba(0,0,0,.2)', text: '#18181b', 'text-soft': '#3f3f46', 'text-muted': '#45454e', 'text-subtle': '#5c5c67', 'fg-rgb': '0,0,0', overlay: 'rgba(232,232,238,.72)', 'ok-fg': '#15803d', 'bad-fg': '#b91c1c', 'warn-fg': '#a16207', 'art-fade': '#1b1b22', 'btn-bg': '#18181b', 'btn-fg': '#ffffff', 'btn-sub': '#a1a1aa', 'btn-dis': 'rgba(0,0,0,.2)', 'shadow-c': 'rgba(24,24,40,.16)' },
};
const ACCENTS = [['cyan', 'Cyan', '#22d3ee'], ['violet', 'Violet', '#a78bfa'], ['amber', 'Amber', '#f59e0b'], ['red', 'Red', '#f43f5e'], ['green', 'Green', '#22c55e'], ['pink', 'Pink', '#ec4899']];
const WIN_ACCENT = '#4cc2ff';
const hx = s => { s = s.replace('#', ''); if (s.length === 3) s = s.split('').map(c => c + c).join(''); const n = parseInt(s, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const toHex = a => '#' + a.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const mixc = (a, b, t) => { const A = hx(a), B = hx(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
const toHsl = s => { const [r, g, b] = hx(s).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b); let H = 0, S = 0; const L = (mx + mn) / 2; if (mx !== mn) { const d = mx - mn; S = L > .5 ? d / (2 - mx - mn) : d / (mx + mn); H = (mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60; } return [H, S, L]; };
const fromHsl = (H, S, L) => { H = ((H % 360) + 360) % 360; const C = (1 - Math.abs(2 * L - 1)) * S, X = C * (1 - Math.abs((H / 60) % 2 - 1)), m = L - C / 2; const [r, g, b] = H < 60 ? [C, X, 0] : H < 120 ? [X, C, 0] : H < 180 ? [0, C, X] : H < 240 ? [0, X, C] : H < 300 ? [X, 0, C] : [C, 0, X]; return toHex([(r + m) * 255, (g + m) * 255, (b + m) * 255]); };
const lum = s => { const [r, g, b] = hx(s).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * r + .7152 * g + .0722 * b; };
function themeTokens(baseKey, acc, still) {
  const B = BASES[baseKey] || BASES.dark, [H, S, L] = toHsl(acc), out = {};
  const a2 = fromHsl(H >= 60 && H < 300 ? H + 45 : H - 30, Math.min(1, S * .9), Math.max(.5, Math.min(.66, L)));
  for (const k in B) if (k !== 'label' && k !== 'light') out[k] = B[k];
  Object.assign(out, {
    accent: acc, 'accent-rgb': hx(acc).join(','), 'accent-2': a2, 'accent2-rgb': hx(a2).join(','),
    'accent-strong': B.light ? mixc(acc, '#000000', .4) : mixc(acc, '#ffffff', .38), 'accent-light': mixc(acc, '#ffffff', .5),
    'accent-soft': 'rgba(' + hx(acc).join(',') + (B.light ? ',.14)' : ',.12)'), 'accent-contrast': lum(acc) > .4 ? '#0a0a0c' : '#ffffff',
    'accent-chip': 'rgba(' + hx(mixc(acc, '#050507', .8)).join(',') + ',.82)', 'btn-hover': B.light ? mixc(acc, '#000000', .35) : mixc(acc, '#ffffff', .55),
    'm-spin-slow': still ? 'none' : 'bspin 3.4s linear infinite', 'm-spin': still ? 'none' : 'bspin 1.6s linear infinite', 'm-pop': still ? 'none' : 'dfade .25s cubic-bezier(.22,1,.36,1)',
  });
  return out;
}

export { BASES, ACCENTS, WIN_ACCENT, hx, toHex, mixc, themeTokens };

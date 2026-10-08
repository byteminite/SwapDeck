// UI scale: how big SwapDeck draws its interface. Sizes are in Windows' scaled pixels (DIP), so Windows display
// scaling is already applied: a 4K screen at 150% is 2560×1440 here and looks like a 1440p screen.
// "Auto" follows the screen, not the window: a bigger window shows more, it doesn't blow everything up.

const BASE_ZOOM = 0.9;          // 100% UI scale = the page drawn at 90% zoom
const MIN_W = 900, MIN_H = 640; // the CSS layout needs at least this much room
const AUTO_FROM = 1080, AUTO_TO = 2160, AUTO_MAX = 1.2; // 1080p → 100%, growing to 120% on a 4K-at-100% screen

// Auto's scale from the screen's shorter side (so a portrait 1080p monitor counts as 1080p): 1.0 up to 1080,
// then a gentle rise to AUTO_MAX at 2160.
function autoScale(screenSide) {
  const t = Math.max(0, Math.min(1, (screenSide - AUTO_FROM) / (AUTO_TO - AUTO_FROM)));
  return Math.round((1 + t * (AUTO_MAX - 1)) * 100) / 100;
}

// The zoom factor for the page. Never so large that the layout's minimum size stops fitting the window.
function zoomFor({ pref, w, h, screenSide }) {
  const rel = pref === 'auto' ? autoScale(screenSide) : Number(pref) || 1;
  const z = Math.max(0.5, Math.min(rel * BASE_ZOOM, w / MIN_W, h / MIN_H, 2));
  return Math.round(z * 1000) / 1000;
}

// First-run window size: a comfortable share of the screen's work area, within sensible limits.
function defaultSize(workArea) {
  const clamp = (v, lo, hi) => Math.round(Math.max(lo, Math.min(hi, v)));
  return { width: clamp(workArea.width * 0.62, MIN_W, 1400), height: clamp(workArea.height * 0.72, MIN_H, 940) };
}

module.exports = { BASE_ZOOM, MIN_W, MIN_H, autoScale, zoomFor, defaultSize };

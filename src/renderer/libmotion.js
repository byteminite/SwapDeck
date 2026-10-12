// Library layout motion: the sliding underline under tab rows (Library tabs, a game's Overview / Achievements / Setup).
// The first time a row shows, the underline is placed without sliding; after that it glides to the picked tab.
export function syncTabInk(doc) {
  doc.querySelectorAll('.ls .tab-ink').forEach(ink => {
    const row = ink.parentElement, on = row && row.querySelector(':scope > .on');
    if (!on) { ink.style.opacity = '0'; return; }
    const x = on.offsetLeft, w = on.offsetWidth;
    if (ink.dataset.x === String(x) && ink.dataset.w === String(w)) return;
    if (!ink.dataset.x) ink.classList.add('still');
    ink.style.opacity = '1';
    ink.style.width = w + 'px';
    ink.style.transform = 'translateX(' + x + 'px)';
    ink.dataset.x = x; ink.dataset.w = w;
    if (ink.classList.contains('still')) requestAnimationFrame(() => requestAnimationFrame(() => ink.classList.remove('still')));
  });
}

// Fonts and window size change tab widths, so re-measure then too.
if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => syncTabInk(document));
  if (document.fonts) document.fonts.ready.then(() => syncTabInk(document));
}

// Favourite burst: the heart pops in while a ring flashes out and seven pairs of rainbow dots scatter.
// Drawn in a layer over everything (not inside the button) so a cover's rounded corner can't clip it.
const BURST = ['#7ee8a6', '#c4e35f', '#f2a65a', '#e8d25f', '#f472b6', '#a78bfa', '#818cf8'];
const DOTS = BURST.flatMap((c, i) => [0, 1].map(k => '<i class="' + (k ? 'sm' : '') + '" style="--a:' + (i * 360 / 7 + k * 14) + 'deg;--c:' + c + '"></i>')).join('');
export function heartBurst(btn) {
  if (!btn || btn.closest('.ls.rm') || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  // Centred on the heart itself (a button can hold text too), sized to the button's height.
  const box = btn.getBoundingClientRect(), r = (btn.querySelector('svg') || btn).getBoundingClientRect(), el = document.createElement('span');
  el.className = 'hb';
  el.setAttribute('aria-hidden', 'true');
  el.style.cssText = 'left:' + (r.left + r.width / 2) + 'px;top:' + (r.top + r.height / 2) + 'px;--s:' + Math.max(0.6, Math.min(1, box.height / 48));
  el.innerHTML = '<b></b>' + DOTS;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1100);
  // After the re-render, so Preact's class update doesn't wipe it.
  requestAnimationFrame(() => { btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop'); });
}

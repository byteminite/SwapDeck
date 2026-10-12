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

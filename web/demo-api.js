// Browser demo: the renderer's window.api comes from the demo page around it (web/demo-backend.js).
// Opened on its own (not inside the demo page), go to the demo page.
if (window.parent !== window && window.parent.SDDemo) {
  const id = (window.frameElement && window.frameElement.id) || 'app';
  window.api = window.parent.SDDemo.api(id);
  // A reloaded frame registers new listeners; drop the old page's ones.
  addEventListener('pagehide', () => window.parent.SDDemo.drop(id));

  // Phones: the app is drawn scaled down inside the demo page, and touch swipes don't reach its scroll
  // areas there. Scroll whatever is under the finger ourselves (up/down or sideways, whichever the swipe is).
  const canScroll = (el, axis) => {
    const cs = getComputedStyle(el);
    return axis === 'y' ? /auto|scroll/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1
      : /auto|scroll/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1;
  };
  const scrollerFor = (el, axis) => { for (; el && el !== document.documentElement; el = el.parentElement) if (canScroll(el, axis)) return el; return null; };
  let touch = null;
  addEventListener('touchstart', e => {
    if (e.touches.length !== 1) { touch = null; return; }
    const t = e.touches[0];
    touch = { x: t.clientX, y: t.clientY, sx: t.clientX, sy: t.clientY, target: e.target, el: null, axis: null };
  }, { passive: true });
  addEventListener('touchmove', e => {
    if (!touch || e.touches.length !== 1) return;
    const t = e.touches[0];
    if (!touch.axis) {
      const ax = Math.abs(t.clientX - touch.sx), ay = Math.abs(t.clientY - touch.sy);
      if (Math.max(ax, ay) < 4) return;
      touch.axis = ay >= ax ? 'y' : 'x';
      touch.el = scrollerFor(touch.target, touch.axis);
    }
    if (!touch.el) return;
    e.preventDefault();
    if (touch.axis === 'y') touch.el.scrollTop += touch.y - t.clientY; else touch.el.scrollLeft += touch.x - t.clientX;
    touch.x = t.clientX; touch.y = t.clientY;
  }, { passive: false });
  addEventListener('touchend', () => { touch = null; }, { passive: true });
} else location.replace('../index.html');

// Browser demo: the renderer's window.api comes from the demo page around it (web/demo-backend.js).
// Opened on its own (not inside the demo page), go to the demo page.
if (window.parent !== window && window.parent.SDDemo) {
  const id = (window.frameElement && window.frameElement.id) || 'app';
  window.api = window.parent.SDDemo.api(id);
  // A reloaded frame registers new listeners; drop the old page's ones.
  addEventListener('pagehide', () => window.parent.SDDemo.drop(id));
} else location.replace('../index.html');

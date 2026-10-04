// Converts a Claude Design export (the "x-dc" template inside the bundled HTML) into
//   src/renderer/view.js   – an htm/Preact render function: view(b) where b holds the bindings
//   src/renderer/view.css  – keyframes, scrollbar styles and the :hover/:focus/::before rules
// Usage: node tools/build-view.js "<path to design export .html>"
//
// The design file itself stays out of the repo; only the generated view is committed.

const fs = require('fs');
const path = require('path');

const src = process.argv[2];
if (!src) { console.error('Usage: node tools/build-view.js <design.html>'); process.exit(1); }

// ---- pull the template out of the bundle ----
const lines = fs.readFileSync(src, 'utf8').split('\n');
const tplIdx = lines.findIndex(l => l.trim() === '<script type="__bundler/template">');
if (tplIdx < 0) throw new Error('No __bundler/template block found');
const template = JSON.parse(lines[tplIdx + 1]);
const xStart = template.indexOf('<x-dc>'), xEnd = template.indexOf('</x-dc>');
let markup = template.slice(xStart + 6, xEnd);

// ---- helmet: keep only non-font CSS ----
const helmet = (markup.match(/<helmet>([\s\S]*?)<\/helmet>/) || [, ''])[1];
markup = markup.replace(/<helmet>[\s\S]*?<\/helmet>/, '');
const css = [];
for (const m of helmet.matchAll(/<style>([\s\S]*?)<\/style>/g)) {
  const block = m[1].replace(/\/\*[^*]*\*\/\s*@font-face\s*\{[^}]*\}/g, '').replace(/@font-face\s*\{[^}]*\}/g, '').trim();
  if (block) css.push(block);
}

// ---- tokenizer (the export is well-formed generated HTML) ----
const VOID = new Set(['input', 'br', 'img', 'hr', 'meta', 'link', 'area', 'source']);
function tokenize(s) {
  const out = [];
  const re = /<!--[\s\S]*?-->|<\/([a-zA-Z][\w-]*)\s*>|<([a-zA-Z][\w-]*)((?:\s+[^\s=>/"']+(?:\s*=\s*"[^"]*")?)*)\s*(\/?)>/g;
  let last = 0, m;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push({ t: 'text', v: s.slice(last, m.index) });
    if (m[0].startsWith('<!--')) { /* skip */ }
    else if (m[1]) out.push({ t: 'close', name: m[1] });
    else {
      const attrs = [];
      const are = /([^\s=>/"']+)(?:\s*=\s*"([^"]*)")?/g;
      let a;
      while ((a = are.exec(m[3] || ''))) attrs.push([a[1], a[2] === undefined ? null : a[2]]);
      out.push({ t: 'open', name: m[2], attrs, self: !!m[4] || VOID.has(m[2].toLowerCase()) });
    }
    last = re.lastIndex;
  }
  if (last < s.length) out.push({ t: 'text', v: s.slice(last) });
  return out;
}

function parse(tokens) {
  const root = { name: '#root', children: [] }, stack = [root];
  for (const tk of tokens) {
    const top = stack[stack.length - 1];
    if (tk.t === 'text') top.children.push({ text: tk.v });
    else if (tk.t === 'open') {
      const node = { name: tk.name, attrs: tk.attrs, children: [] };
      top.children.push(node);
      if (!tk.self) stack.push(node);
    } else {
      while (stack.length > 1 && stack[stack.length - 1].name !== tk.name) stack.pop();
      if (stack.length > 1) stack.pop();
    }
  }
  return root;
}

// ---- code generation ----
const esc = s => s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
const decode = s => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const camel = s => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

// Static text in the design that should come from the app instead.
const TEXT_SWAPS = [
  [/^v1\.0$/, 'b.verShort'],
];

let cls = 0;
function pseudoClass(kind, style) {
  const name = 'dc' + kind[0] + (++cls).toString(36);
  if (kind === 'hover') css.push(`.${name}:hover{${important(style)}}`);
  else if (kind === 'focus') css.push(`.${name}:focus{${important(style)}}`);
  else if (kind === 'before') css.push(`.${name}::before{${style}}`);
  else if (kind === 'after') css.push(`.${name}::after{${style}}`);
  else if (kind === 'active') css.push(`.${name}:active{${important(style)}}`);
  else throw new Error('unknown pseudo ' + kind);
  return name;
}
function important(style) {
  return style.split(';').map(d => d.trim()).filter(Boolean).map(d => /!important$/.test(d) ? d : d + ' !important').join(';');
}

function expr(name, scope) {
  const root = name.split('.')[0];
  return scope.includes(root) ? name : 'b.' + name;
}
// "{{ a.b }}" inside a string → template interpolation
function interp(str, scope) {
  return esc(decode(str)).replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, n) => '${' + expr(n, scope) + '}');
}
const single = (str) => { const m = /^\{\{\s*([\w.]+)\s*\}\}$/.exec(str); return m && m[1]; };

function genChildren(children, scope) { return children.map(c => gen(c, scope)).join(''); }

function gen(node, scope) {
  if (node.text !== undefined) {
    const t = node.text;
    const trimmed = t.trim();
    for (const [re, e] of TEXT_SWAPS) if (re.test(trimmed)) return '${' + e + '}';
    return interp(t, scope);
  }
  const n = node.name;
  if (n === 'sc-if') {
    const v = single(node.attrs.find(a => a[0] === 'value')[1]);
    return '${' + expr(v, scope) + ' ? html`' + genChildren(node.children, scope) + '` : null}';
  }
  if (n === 'sc-for') {
    const list = single(node.attrs.find(a => a[0] === 'list')[1]);
    const as = node.attrs.find(a => a[0] === 'as')[1];
    return '${(' + expr(list, scope) + ' || []).map(' + as + ' => html`' + genChildren(node.children, [...scope, as]) + '`)}';
  }
  const lower = n.toLowerCase();
  const isFormText = (lower === 'input' && !(node.attrs.find(a => a[0] === 'type' && a[1] === 'file'))) || lower === 'textarea';
  const classes = [];
  let attrOut = '';
  const ariaLabel = (node.attrs.find(a => a[0] === 'aria-label') || [])[1];
  for (const [k, v] of node.attrs) {
    if (k.startsWith('hint-') || k === 'data-screen-label') continue;
    const pm = /^style-(hover|focus|before|after|active)$/.exec(k);
    if (pm) { classes.push(pseudoClass(pm[1], decode(v))); continue; }
    if (v === null) { attrOut += ' ' + k; continue; }
    let name = k;
    if (k.startsWith('sc-camel-')) {
      name = camel(k.slice(9));
      if (name === 'onDoubleClick') name = 'onDblClick';
      if (name === 'onChange' && isFormText) name = 'onInput';
    }
    if (k === 'class') { classes.push(v); continue; }
    const s = single(v);
    if (s) attrOut += ` ${name}=\${${expr(s, scope)}}`;
    else {
      // htm doesn't decode entities, so values containing quotes go in as a JS template literal.
      const val = interp(v, scope);
      attrOut += val.includes('"') ? ` ${name}=\${\`${val}\`}` : ` ${name}="${val}"`;
    }
  }
  // The design leaves the window buttons unwired; hook them up to the app.
  const hasClick = node.attrs.some(a => a[0] === 'sc-camel-on-click');
  if (lower === 'button' && !hasClick && ['Minimize', 'Maximize', 'Close'].includes(ariaLabel)) {
    attrOut += ` onClick=\${() => b.onWin('${ariaLabel === 'Minimize' ? 'min' : ariaLabel === 'Maximize' ? 'max' : 'close'}')}`;
  }
  if (classes.length) attrOut += ` class="${classes.join(' ')}"`;
  if (VOID.has(lower)) return `<${n}${attrOut} />`;
  return `<${n}${attrOut}>${genChildren(node.children, scope)}</${n}>`;
}

const tree = parse(tokenize(markup));
const body = genChildren(tree.children, []).replace(/>\s*\n\s*</g, '><').trim();

const header = `// GENERATED by tools/build-view.js from the Claude Design export — do not edit by hand.\n// Re-run: node tools/build-view.js "<design export.html>"\n`;
fs.writeFileSync(path.join(__dirname, '..', 'src', 'renderer', 'view.js'),
  header + "import { html } from './vendor/htm-preact.js';\n\nexport function view(b) {\n  return html`" + body + "`;\n}\n");
fs.writeFileSync(path.join(__dirname, '..', 'src', 'renderer', 'view.css'), '/* GENERATED by tools/build-view.js — do not edit by hand. */\n' + css.join('\n') + '\n');
console.log('view.js and view.css written:', cls, 'pseudo-classes');

// The in-app reader for a game's Steam announcements. Steam sends posts as BBCode; this turns it into
// Preact elements (never HTML strings), so nothing in a post can run as code. Links go through
// api.openNewsLink (https only), images only from Steam's own image hosts (the window's CSP allows no others).

import { html } from './vendor/htm-preact.js';

const LABEL = "font:600 10.5px 'Geist Mono',monospace;letter-spacing:.09em;text-transform:uppercase;color:var(--text-subtle)";
const KNOWN = new Set(['b', 'i', 'u', 's', 'strike', 'spoiler', 'h1', 'h2', 'h3', 'h4', 'h5', 'p', 'url', 'img', 'list', 'olist', '*',
  'quote', 'code', 'hr', 'table', 'tr', 'th', 'td', 'previewyoutube', 'video', 'expand', 'noparse']);
const BLOCK = 'h[1-6]|list|olist|\\*|p|quote|hr|table|tr|td|th|previewyoutube|video|expand|code';
const TAG_RE = /\[(\/?)([a-z0-9*]+)((?:=[^\]]*)|(?:\s[^\]]*))?\]/gi;
// akamaihd.net is shared by many companies, so only Steam's own hosts there.
const IMG_HOSTS = /^https:\/\/(([a-z0-9-]+\.)*steamstatic\.com|steam(cdn|userimages)-a\.akamaihd\.net|media\.steampowered\.com)\//i;
const ESC = '\u0001';

// "[url=https://x]", "[img src="..."]", "[previewyoutube=id;full]" -> the one value that matters.
function attrOf(raw) {
  if (!raw) return '';
  if (raw[0] === '=') return raw.slice(1).trim().replace(/^["']|["']$/g, '');
  const m = raw.match(/\b(?:src|href|mp4|webm|poster)\s*=\s*"([^"]*)"/i);
  return m ? m[1] : '';
}

const clanUrl = s => s.replace(/\{STEAM_CLAN_(?:LOC_)?IMAGE\}/g, 'https://clan.akamai.steamstatic.com/images').trim();

// BBCode -> tree of { tag, arg, kids } and strings. Unknown tags stay as text; unclosed tags close at the end.
export function parseBBCode(src) {
  // Newline runs are collapsed first, so the block-tag pass never rescans a long run (a post of blank lines stays fast).
  const text = String(src || '').replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/\\\[/g, ESC)
    .replace(new RegExp('\\n{0,2}(\\[\\/?(?:' + BLOCK + ')(?:[ =][^\\]]*)?\\])\\n?', 'gi'), '$1');
  const root = { tag: 'root', kids: [] }, stack = [root];
  const top = () => stack[stack.length - 1];
  const pushText = s => { if (s) top().kids.push(s.split(ESC).join('[')); };
  let last = 0, m;
  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(text))) {
    const [whole, close, rawTag, rawArg] = m, tag = rawTag.toLowerCase();
    if (!KNOWN.has(tag) || (top().tag === 'noparse' && !(close && tag === 'noparse'))) continue;
    pushText(text.slice(last, m.index));
    last = m.index + whole.length;
    if (close) {
      const at = stack.map(n => n.tag).lastIndexOf(tag);
      if (at > 0) stack.length = at;
      continue;
    }
    if (tag === '*' && top().tag === '*') stack.pop();
    const node = { tag, arg: attrOf(rawArg), kids: [] };
    top().kids.push(node);
    if (tag !== 'hr') stack.push(node);
  }
  pushText(text.slice(last));
  return root.kids;
}

const textOf = n => typeof n === 'string' ? n : n.kids.map(textOf).join('');
const URL_RE = /https:\/\/[^\s[\]<>"]+[^\s[\]<>".,;:!?)]/g;
const linkStyle = 'color:var(--accent-strong);text-decoration:underline;text-underline-offset:2px;cursor:pointer;word-break:break-word';

function link(href, kids, open) {
  return html`<a href=${href} style=${linkStyle} onClick=${e => { e.preventDefault(); open(href); }}>${kids}</a>`;
}

// Plain text with bare https links made clickable (Steam shows those as link cards).
function textNodes(s, open) {
  const out = [];
  let last = 0;
  for (const m of s.matchAll(URL_RE)) {
    if (m.index > last) out.push(s.slice(last, m.index));
    out.push(link(m[0], m[0], open));
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

const HEAD = { h1: '700 21px/1.3', h2: '700 18px/1.3', h3: '650 16px/1.35', h4: '600 14.5px/1.4', h5: '600 13.5px/1.4' };
const MEDIA_BTN = "display:inline-flex;align-items:center;gap:8px;margin:8px 0;padding:9px 14px;border-radius:10px;border:1px solid rgba(var(--fg-rgb),.14);background:rgba(var(--fg-rgb),.04);color:var(--text-soft);font:500 13px 'Geist',sans-serif;cursor:pointer";

function render(n, open) {
  if (typeof n === 'string') return textNodes(n, open);
  const kids = () => n.kids.map(k => render(k, open));
  if (HEAD[n.tag]) return html`<div role="heading" aria-level=${n.tag[1]} style=${`font:${HEAD[n.tag]} 'Geist',sans-serif;color:var(--text);margin:18px 0 8px;letter-spacing:-.01em`}>${kids()}</div>`;
  switch (n.tag) {
    case 'b': return html`<strong style="font-weight:650;color:var(--text)">${kids()}</strong>`;
    case 'i': return html`<em>${kids()}</em>`;
    case 'u': return html`<u>${kids()}</u>`;
    case 's': case 'strike': return html`<s>${kids()}</s>`;
    case 'spoiler': return html`<span style="background:rgba(var(--fg-rgb),.12);border-radius:4px;padding:0 3px">${kids()}</span>`;
    case 'p': return n.kids.length ? html`<p style="margin:0 0 10px">${kids()}</p>` : html`<div style="height:6px"></div>`;
    case 'url': { const href = n.arg || textOf(n).trim(); return /^https:\/\//i.test(href) ? link(href, kids(), open) : html`<span>${kids()}</span>`; }
    case 'img': {
      const src = clanUrl(n.arg || textOf(n));
      return IMG_HOSTS.test(src) ? html`<img src=${src} alt="" loading="lazy" style="display:block;max-width:100%;height:auto;margin:12px 0;border-radius:10px" />` : null;
    }
    case 'list': return html`<ul style="margin:6px 0 12px;padding-left:22px">${kids()}</ul>`;
    case 'olist': return html`<ol style="margin:6px 0 12px;padding-left:22px">${kids()}</ol>`;
    case '*': return html`<li style="margin:3px 0">${kids()}</li>`;
    case 'quote': return html`<blockquote style="margin:10px 0;padding:8px 14px;border-left:3px solid rgba(var(--fg-rgb),.2);color:var(--text-muted)">${kids()}</blockquote>`;
    case 'code': return html`<pre style="margin:10px 0;padding:10px 12px;border-radius:8px;background:rgba(var(--fg-rgb),.06);font:12.5px/1.5 'Geist Mono',monospace;white-space:pre-wrap;overflow-x:auto">${textOf(n)}</pre>`;
    case 'hr': return html`<hr style="border:0;height:1px;background:rgba(var(--fg-rgb),.1);margin:16px 0" />`;
    case 'table': return html`<div style="overflow-x:auto;margin:10px 0"><table style="border-collapse:collapse;font-size:13px">${kids()}</table></div>`;
    case 'tr': return html`<tr>${kids()}</tr>`;
    case 'th': return html`<th style="text-align:left;padding:5px 10px;border-bottom:1px solid rgba(var(--fg-rgb),.15)">${kids()}</th>`;
    case 'td': return html`<td style="padding:5px 10px;border-bottom:1px solid rgba(var(--fg-rgb),.07)">${kids()}</td>`;
    case 'previewyoutube': {
      const id = (n.arg.split(';')[0] || '').trim();
      return /^[\w-]{6,20}$/.test(id) ? html`<div><button style=${MEDIA_BTN} onClick=${() => open('https://www.youtube.com/watch?v=' + id)} class="dcha"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l13-8z"></path></svg>Watch the video on YouTube</button></div>` : null;
    }
    case 'video': return html`<div style="margin:8px 0;font:400 12.5px 'Geist',sans-serif;color:var(--text-subtle)">This post has a video. Use Open in Steam to watch it.</div>`;
    default: return kids();
  }
}

// p: { state: 'loading' | 'error' | 'ok', patch, title, meta, body, onBack, onSteam, onLink }
export function newsReader(p) {
  const content = p.state === 'loading' ? html`<div style="font:400 13px 'Geist',sans-serif;color:var(--text-subtle)">Loading the post…</div>`
    : p.state === 'error' ? html`<div style="font:400 13px/1.5 'Geist',sans-serif;color:var(--text-subtle)">Couldn't load this post from Steam. Open it in Steam instead, or try again later.</div>`
    : parseBBCode(p.body).map(n => render(n, p.onLink));
  return html`<div role="dialog" aria-modal="true" aria-label=${p.title} style="position:fixed;inset:0;z-index:94;background:rgba(0,0,0,.55);display:flex;justify-content:center;padding:22px;animation:fade .15s ease" onClick=${e => { if (e.target === e.currentTarget) p.onBack(); }}>
<div style="width:min(760px,100%);display:flex;flex-direction:column;min-height:0;border-radius:16px;background:var(--surface-raised);border:1px solid rgba(var(--fg-rgb),.1);box-shadow:0 30px 80px rgba(0,0,0,.5);overflow:hidden">
<div style="flex:none;display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid rgba(var(--fg-rgb),.07)">
<button style="display:flex;align-items:center;gap:6px;padding:6px 10px;border-radius:9px;border:0;background:transparent;color:var(--text-soft);font:500 13px 'Geist',sans-serif;cursor:pointer" onClick=${p.onBack} class="dcha" aria-label="Back to the game"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"></path></svg>Back</button>
<div style="flex:1"></div>
<button style="padding:7px 12px;border-radius:9px;border:1px solid rgba(var(--fg-rgb),.14);background:transparent;color:var(--text-soft);font:500 12px 'Geist',sans-serif;cursor:pointer" onClick=${p.onSteam} class="dcha">Open in Steam</button></div>
<div style="flex:1;min-height:0;overflow-y:auto;padding:22px 30px 30px">
<div style=${LABEL}>${p.patch ? 'Patch notes' : 'News'}</div>
<div style="font:700 22px/1.3 'Geist',sans-serif;color:var(--text);margin-top:6px;letter-spacing:-.01em">${p.title}</div>
<div style="font:400 12.5px 'Geist',sans-serif;color:var(--text-subtle);margin-top:6px">${p.meta}</div>
<div style="margin-top:18px;font:400 14px/1.65 'Geist',sans-serif;color:var(--text-soft);white-space:pre-line;overflow-wrap:anywhere">${content}</div>
</div></div></div>`;
}

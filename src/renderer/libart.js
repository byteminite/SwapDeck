// Library layout: Change artwork for a Steam game (its cover, its banner and where the banner sits).
// Only SwapDeck's look changes; Steam's own library art is untouched. Pictures go through lib:pickImage,
// which copies them into SwapDeck's covers folder.
import { html } from './vendor/htm-preact.js';
import { icon } from './libicons.js';

export const openArt = (app, id) => { const g = app.gfind(id); if (g) app.setState({ art: { id, pos: g.heroPos ?? 30 } }); };
const setArt = (app, p) => app.setState(s => ({ art: s.art && { ...s.art, ...p } }));

export function libArtVals(app) {
  const A = app.state.art, g = A && app.gfind(A.id);
  if (!g) return null;
  const steamCover = 'https://cdn.akamai.steamstatic.com/steam/apps/' + g.appid + '/library_600x900.jpg';
  const steamHero = 'https://cdn.akamai.steamstatic.com/steam/apps/' + g.appid + '/library_hero.jpg';
  // undefined = unchanged, null = back to Steam's art, otherwise a newly picked file.
  const cover = A.cover === undefined ? g.cover : A.cover ? A.coverUrl : g.artCover ? steamCover : g.cover;
  const hero = A.hero === undefined ? g.hero : A.hero ? A.heroUrl : g.artHero ? steamHero : g.hero;
  const pick = async k => { const r = await window.api.libPickImage(); if (r && r.file) setArt(app, { [k]: r.file, [k + 'Url']: r.url }); };
  const changed = A.cover !== undefined || A.hero !== undefined || A.pos !== (g.heroPos ?? 30);
  return {
    name: g.name, cover: 'url("' + cover + '") center/cover no-repeat,' + app.gradOf(g), hero: 'url("' + hero + '") center ' + A.pos + '%/cover no-repeat,' + app.gradOf(g), pos: A.pos,
    coverCustom: A.cover === undefined ? g.artCover : !!A.cover, heroCustom: A.hero === undefined ? g.artHero : !!A.hero, changed,
    onCover: () => pick('cover'), onHero: () => pick('hero'),
    onCoverReset: () => setArt(app, { cover: null }), onHeroReset: () => setArt(app, { hero: null, pos: 30 }),
    onPos: e => setArt(app, { pos: +e.target.value }),
    close: () => app.setState({ art: null }),
    save: () => {
      const patch = { heroPos: A.pos };
      if (A.cover !== undefined) patch.artCover = A.cover;
      if (A.hero !== undefined) patch.artHero = A.hero;
      app.gset(g.id, patch);
      app.setState({ art: null });
      app.toast('success', 'Artwork saved', "Only SwapDeck shows it. Steam's library keeps its own art.");
    },
  };
}

export function artOverlay(P) {
  return html`<div class="tm-ov" onClick=${e => { if (e.target === e.currentTarget) P.close(); }}><div class="tm art" role="dialog" aria-modal="true" aria-label=${'Change artwork for ' + P.name}>
<div class="tm-h"><h3>Change artwork</h3><p>${P.name}. Only SwapDeck shows it; Steam's library keeps its own art.</p></div>
<div class="tm-b"><div class="art-grid">
<div><div class="tm-lab">Cover</div><div class="art-cv" style=${'background:' + P.cover}></div>
<div class="art-btns"><button class="st-btn sm" onClick=${P.onCover}>${icon('plus', 14)}Choose image</button>${P.coverCustom ? html`<button class="st-btn sm" onClick=${P.onCoverReset}>Use Steam's</button>` : null}</div></div>
<div class="art-r"><div class="tm-lab">Banner</div><div class="art-hero" style=${'background:' + P.hero}></div>
<label class="art-pos"><span>Position</span><input type="range" min="0" max="100" value=${P.pos} onInput=${P.onPos} aria-label="Banner position" /></label>
<div class="art-btns"><button class="st-btn sm" onClick=${P.onHero}>${icon('plus', 14)}Choose image</button>${P.heroCustom ? html`<button class="st-btn sm" onClick=${P.onHeroReset}>Use Steam's</button>` : null}</div></div>
</div><div class="tm-mut">Covers look best tall (600 × 900), banners wide (1920 × 620).</div></div>
<div class="tm-f"><button class="st-btn" onClick=${P.close}>Cancel</button><span class="tm-sp"></span><button class="st-btn p" disabled=${!P.changed} onClick=${P.save}>Save</button></div></div></div>`;
}

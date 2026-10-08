// Steam pages for a game (Store, Community hub, Workshop...). The renderer only names a page and an appid;
// the URL is built here from a fixed table, so nothing else can be opened through this.

const web = url => 'steam://openurl/' + url;
const PAGES = {
  store: id => `steam://store/${id}`,
  dlc: id => web(`https://store.steampowered.com/dlc/${id}/`),
  hub: id => `steam://url/GameHub/${id}`,
  discussions: id => web(`https://steamcommunity.com/app/${id}/discussions/`),
  guides: id => web(`https://steamcommunity.com/app/${id}/guides/`),
  workshop: id => `steam://url/SteamWorkshopPage/${id}`,
  subscriptions: id => web(`https://steamcommunity.com/my/myworkshopfiles/?appid=${id}&browsefilter=mysubscriptions`),
  market: id => web(`https://steamcommunity.com/market/search?appid=${id}`),
  support: id => web(`https://help.steampowered.com/en/wizard/HelpWithGame/?appid=${id}`),
  news: id => web(`https://store.steampowered.com/news/app/${id}`),
  game: id => `steam://nav/games/details/${id}`,
};

// Returns the URL, or null for an unknown page or an appid that isn't a plain number.
function steamPage(kind, appid) {
  if (!/^\d{1,10}$/.test(String(appid)) || !Object.prototype.hasOwnProperty.call(PAGES, kind)) return null;
  return PAGES[kind](String(appid));
}

// One announcement on the game's news page.
function newsPage(appid, gid) {
  if (!/^\d{1,10}$/.test(String(appid)) || !/^\d{1,20}$/.test(String(gid))) return null;
  return web(`https://store.steampowered.com/news/app/${appid}/view/${gid}`);
}

module.exports = { steamPage, newsPage, PAGE_KINDS: Object.keys(PAGES) };

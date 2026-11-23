/**
 * The brand colour of well-known sites, for the coloured favicon square of a card (Shelf LinkCard:
 * "the site's coloured favicon"). Keyed by host without `www.`; a host that is not listed keeps the
 * neutral letter tile. Colours only: the letter is picked by `ui-favicon` for contrast.
 */
export const SITE_COLOURS: Readonly<Record<string, string>> = {
  'youtube.com': '#ff0000',
  'youtu.be': '#ff0000',
  'github.com': '#181717',
  'gitlab.com': '#fc6d26',
  'angular.dev': '#c3002f',
  'developer.mozilla.org': '#1b1b1b',
  'medium.com': '#000000',
  'dev.to': '#0a0a0a',
  'stackoverflow.com': '#f48024',
  'wikipedia.org': '#000000',
  'en.wikipedia.org': '#000000',
  'reddit.com': '#ff4500',
  'x.com': '#000000',
  'twitter.com': '#1d9bf0',
  'vimeo.com': '#1ab7ea',
  'figma.com': '#a259ff',
  'dribbble.com': '#ea4c89',
  'behance.net': '#1769ff',
  'amazon.com': '#ff9900',
  'etsy.com': '#f1641e',
  'allbirds.com': '#212a2f',
  'taylorstitch.com': '#8a5a2b',
  'nytimes.com': '#000000',
  'theverge.com': '#5200ff',
  'npmjs.com': '#cb3837',
  'spotify.com': '#1db954',
  'open.spotify.com': '#1db954',
  'notion.so': '#000000',
  'linkedin.com': '#0a66c2',
};

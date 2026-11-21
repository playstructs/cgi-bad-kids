// Profile pictures: the player's own picture first, webapp's generated one
// only when there is none.
//
// A player's picture on chain is `pfp`, a URL (or an opaque id). webapp never
// shows it: every portrait is drawn from `pfp_client_render_attributes`, the
// layers of its generated robot. Here every portrait shows the player's `pfp`
// when it is a URL a browser can load, over the generated layers, which stay
// underneath as the fallback: a picture that fails to load is removed.
//
// The URL travels inside the render attributes, as `url`:
// - bk/patches.cjs has PlayerFactory and PlayerSearchResultDTOFactory (every
//   player and player search result webapp reads) put the player's `pfp` there,
//   which every portrait already receives;
// - sign-up puts the chosen Bad Kid there (kids.js), since the guild API's
//   sign-up request can't carry a URL in `pfp` (it requires JSON, which the
//   chain refuses in a pfp). Once the player exists, their own key sets `pfp`
//   on chain to the same URL (below).
//
// Bad Kids' pictures are hosted by this site, 320px WebP, at
// https://badkids.structs.zone/bk/kids/<id>.webp (bk/public/bk/kids). Any Bad
// Kid's picture, as this site, badkids.com's archive or the collection's IPFS
// metadata names it, is shown from this site's copy, which also keeps the
// pictures loading in development.
import {PfpClientRenderAttributes} from '../../structs-webapp/src/js/models/PfpClientRenderAttributes.js';

export const FIRST_KID = 1;
export const LAST_KID = 9999;
const KID_HOST = 'https://badkids.structs.zone';
const KID = /^https:\/\/badkids\.structs\.zone\/bk\/kids\/(\d{1,4})\.webp$/;
const KID_ELSEWHERE = [
  KID,
  /^https?:\/\/badkidsweb\.storage\.googleapis\.com\/badkids\/images\/(\d{1,4})\.jpg$/,
  /^ipfs:\/\/QmbGvE3wmxex8KiBbbvMjR8f9adR28s3XkiZSTuGmHoMHV\/(\d{1,4})\.jpg$/,
];
const GATEWAYS = {
  'ipfs:': 'https://ipfs.io/ipfs/',
  'ipns:': 'https://ipfs.io/ipns/',
  'ar:': 'https://arweave.net/',
};
const PLACEHOLDER = '<img class="pfp-viewer-layer" src="/img/portrait-placeholder.png" alt="Profile picture">';

const inRange = id => Number.isInteger(id) && id >= FIRST_KID && id <= LAST_KID ? id : null;

/** This site's copy of a Bad Kid's picture, as a path on this site. */
export const kidPath = id => `/bk/kids/${Number.parseInt(id, 10)}.webp`;

/** A Bad Kid's picture as players set it: this site's copy, by its full URL. */
export const kidUrl = id => KID_HOST + kidPath(id);

/** @return {number|null} the Bad Kid a pfp URL set by this site pictures */
export const kidId = value => typeof value === 'string' && KID.test(value) ? inRange(Number(value.match(KID)[1])) : null;

/** @return {number|null} the Bad Kid any known copy of its picture shows */
function anyKidId(value) {
  for (const pattern of KID_ELSEWHERE) {
    const match = value.match(pattern);
    if (match) return inRange(Number(match[1]));
  }
  return null;
}

/**
 * @param {*} value a pfp as players set it
 * @return {string|null} an https URL (or this site's own path) an <img> can load, or null
 */
export function src(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 512) {
    return null;
  }
  const kid = anyKidId(value.trim());
  if (kid !== null) {
    return kidPath(kid);
  }
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    return null; // an opaque id, or not a URL
  }
  if (GATEWAYS[url.protocol]) {
    // ipfs://CID/path and ipfs:CID/path alike.
    const id = (url.host + url.pathname).replace(/^\/+/, '');
    return id ? GATEWAYS[url.protocol] + id + url.search : null;
  }
  if (url.protocol === 'http:') {
    url.protocol = 'https:'; // a secure page can't show it otherwise
  }
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) {
    return null;
  }
  return url.href;
}

const escape = text => text.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

/** Patched into PfpClientRenderAttributes.fromJson: keeps the `url` webapp's model drops. */
export function keepUrl(obj, attributes) {
  if (typeof obj?.url === 'string' && obj.url) {
    attributes.url = obj.url;
  }
  return attributes;
}

/**
 * Patched into the player factories: the player's own picture, `pfp`, into the
 * render attributes every portrait is drawn from.
 *
 * @param {string|null} pfp the player's pfp on chain
 * @param {PfpClientRenderAttributes|null} attributes
 * @return {PfpClientRenderAttributes|null}
 */
export function attributes(pfp, attributes) {
  if (!src(pfp)) {
    return attributes;
  }
  const merged = attributes ?? new PfpClientRenderAttributes();
  merged.url = pfp;
  return merged;
}

/**
 * Patched into PfpViewerComponent.renderHTML.
 *
 * @param {object|null} pfp the component's render attributes
 * @param {string} layers webapp's own HTML for them
 * @return {string}
 */
export function html(pfp, layers) {
  const url = src(pfp?.url);
  if (!url) {
    return layers;
  }
  return `${layers || PLACEHOLDER}<img class="pfp-viewer-layer bk-pfp-url" src="${escape(url)}" alt="Profile picture" referrerpolicy="no-referrer">`;
}

// A picture that can't be loaded leaves the generated one showing.
window.addEventListener('error', event => {
  if (event.target instanceof HTMLImageElement && event.target.classList.contains('bk-pfp-url')) {
    event.target.remove();
  }
}, true);

// The Bad Kid chosen at sign-up is in the player's render attributes; once the
// player exists their own key sets it as their pfp on chain. Only a key that is
// the player's own primary address does it (not a device key, nor in spectator
// mode, where the "player" is someone else), and once a page load.
const synced = new Set();
window.addEventListener('RENDER_PLAYER_PFP', event => {
  if (event.playerType !== 'player') {
    return;
  }
  const {gameState, signingClientManager} = globalThis;
  const player = gameState?.keyPlayers?.player?.player;
  const url = player?.pfp_client_render_attributes?.url;
  if (!player?.id || player.pfp || kidId(url) === null || synced.has(player.id)) {
    return;
  }
  if (!signingClientManager || !gameState.signingAccount || gameState.signingAccount.address !== player.primary_address) {
    return;
  }
  synced.add(player.id);
  signingClientManager.queueMsgPlayerUpdatePfp(player.id, url)
    .then(tx => {
      // A settled transaction that failed resolves too.
      if (tx?.status !== 'succeeded') throw new Error(tx?.error ?? tx?.status ?? 'not sent');
      player.pfp = url;
      console.info(`[bk] pfp of ${player.id} set to ${url}`);
    })
    .catch(error => console.warn(`[bk] pfp of ${player.id} not set: ${error?.message ?? error}`));
});

// Choosing a Bad Kid as the profile picture at sign-up.
//
// "Choose Bad Kid", beside the generated picture, opens a gallery of every
// Bad Kid (#1 to #9999), as this site hosts them (bk/public/bk/kids), in one
// endless scroll: more are added as the player nears the end, and images load
// only as they come into view. A player who knows their Bad Kid's number finds
// it: the gallery scrolls to it and outlines it. Clicking a Bad Kid chooses it,
// and its picture, https://badkids.structs.zone/bk/kids/<id>.webp, becomes the
// player's picture (pfp.js). No wallet is asked for: the picture is the
// player's choice.
//
// Its controls are webapp's own SUI components: screen buttons, the text input
// and the close link.
import {FIRST_KID, LAST_KID, kidId, kidPath, kidUrl, attributes} from './pfp.js';
import {PfpViewerComponent} from '../../structs-webapp/src/js/view_models/components/PfpViewerComponent.js';

const BATCH = 120;
const ID_PATTERN = /^\d{1,4}$/;

/** @return {number|null} the Bad Kid with this number, if there is one */
function parseId(text) {
  const value = String(text).trim().replace(/^#/, '');
  if (!ID_PATTERN.test(value)) return null;
  const id = Number(value);
  return id >= FIRST_KID && id <= LAST_KID ? id : null;
}

/** @return {number|null} the Bad Kid the render attributes picture, if any */
const chosenId = pfp => kidId(pfp?.url);

/**
 * Adds "Choose Bad Kid" to the sign-up profile screen (SetUsernameViewModel,
 * patched to call this once its picture is shown).
 *
 * @param {object} viewModel SetUsernameViewModel
 * @param {object} menuPage webapp's MenuPage
 */
function mount(viewModel, menuPage) {
  const refresh = document.getElementById(viewModel.regeneratePfpBtnId);
  const body = document.querySelector('.set-username-screen-body');
  if (!refresh || !body) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'bk-kid-btn';
  button.className = 'sui-screen-btn sui-mod-secondary';
  button.textContent = 'Choose Bad Kid';
  refresh.after(button);

  const picker = createPicker(body, {
    current: () => chosenId(viewModel.pfpViewerComponent?.pfp),
    say: text => menuPage.setDialogueScreenContent(text, true),
    choose: id => {
      const component = viewModel.pfpViewerComponent;
      // The generated layers stay, under the Bad Kid, for clients that don't show URLs.
      component.pfp = {...(component.pfp ?? {}), url: kidUrl(id)};
      component.render();
      viewModel.gameState.signupRequest.pfp_client_render_attributes = component.getPfpJson();
      menuPage.setDialogueScreenContent(`Bad Kid #${id} it is. Now, your display name.`, true);
    },
  });
  button.addEventListener('click', picker.open);
}

/**
 * The gallery, hidden over `host` until opened: at sign-up (mount) and on the
 * player's own profile (mountProfile).
 *
 * @param {HTMLElement} host positioned element the gallery covers
 * @param {object} options
 * @param {function(): (number|null)} options.current the Bad Kid chosen now, if any
 * @param {function(string): void} options.say shows the gallery's messages
 * @param {function(number): void} options.choose called with the chosen number
 * @param {HTMLElement} [options.viewport] the scrolling element `host` is in,
 *   when `host` may be taller than it: the gallery then ends where it does
 * @return {{open: function(): void, close: function(): void}}
 */
function createPicker(host, {current, say, choose, viewport = null}) {
  host.querySelector('.bk-kid-picker')?.remove();
  const panel = document.createElement('div');
  panel.id = 'bk-kid-picker';
  panel.className = 'bk-kid-picker hidden';
  panel.innerHTML = `
    <div class="bk-kid-picker-layout">
      <div class="bk-kid-picker-header">
        <span class="sui-text-header">Bad Kids</span>
        <a id="bk-kid-close" class="sui-screen-nav-close" href="javascript: void(0)" aria-label="Close">
          <i class="sui-icon-sm icon-close"></i>
        </a>
      </div>
      <div class="common-inline-text-input-group-container">
        <div class="common-inline-text-input-controls-container">
          <label class="sui-input-text" for="bk-kid-id">
            <span>Find by Number</span>
            <input type="text" inputmode="numeric" autocomplete="off" name="bk-kid-id" id="bk-kid-id" placeholder="${FIRST_KID} to ${LAST_KID}">
          </label>
          <button id="bk-kid-id-btn" class="sui-screen-btn sui-mod-disabled" type="button" disabled>Find</button>
        </div>
      </div>
      <div id="bk-kid-scroll" class="bk-kid-scroll">
        <div id="bk-kid-grid" class="bk-kid-grid"></div>
      </div>
    </div>`;
  host.append(panel);

  const scroller = panel.querySelector('#bk-kid-scroll');
  const grid = panel.querySelector('#bk-kid-grid');
  const idInput = panel.querySelector('#bk-kid-id');
  const idButton = panel.querySelector('#bk-kid-id-btn');

  let next = FIRST_KID; // the first Bad Kid not yet in the grid
  const tile = id => grid.querySelector(`[data-kid="${id}"]`);

  /** Adds Bad Kids to the grid, the next batch or up to (and past) `id`. */
  const renderMore = (id = null) => {
    if (next > LAST_KID || (id !== null && id < next)) return;
    const last = Math.min(LAST_KID, (id ?? next) + BATCH - 1);
    const chosen = current();
    const html = [];
    for (let n = next; n <= last; n++) {
      html.push(`<button type="button" class="bk-kid-tile${n === chosen ? ' sui-mod-active' : ''}" data-kid="${n}" title="Bad Kid #${n}" aria-label="Bad Kid #${n}"><img src="${kidPath(n)}" alt="" loading="lazy"></button>`);
    }
    grid.insertAdjacentHTML('beforeend', html.join(''));
    next = last + 1;
  };

  // The endless scroll: nearing the end of the grid adds the next batch, until
  // the grid reaches past the bottom of the view.
  const fill = () => {
    while (next <= LAST_KID && scroller.clientHeight > 0 && scroller.scrollTop + scroller.clientHeight > scroller.scrollHeight - 600) {
      renderMore();
    }
  };
  scroller.addEventListener('scroll', fill, {passive: true});

  grid.addEventListener('click', event => {
    const target = event.target.closest('.bk-kid-tile');
    if (target) pick(Number(target.dataset.kid));
  });

  /** Brings a Bad Kid into view, outlined. */
  const reveal = (id, {mark = true, smooth = true} = {}) => {
    renderMore(id);
    const target = tile(id);
    if (!target) return;
    if (mark) {
      grid.querySelectorAll('.bk-mod-found').forEach(found => found.classList.remove('bk-mod-found'));
      // Restarted, so finding the same Bad Kid again plays the highlight again.
      void target.offsetWidth;
      target.classList.add('bk-mod-found');
    }
    // A far jump (9,999 Bad Kids is a long gallery) is instant: scrolled
    // smoothly, it would pass thousands of pictures that never load in time.
    const near = Math.abs(target.offsetTop - scroller.scrollTop) < scroller.clientHeight * 3;
    target.scrollIntoView({block: 'center', behavior: smooth && near ? 'smooth' : 'auto'});
  };

  // Within a taller page (the profile), the gallery covers what is in view.
  const fit = () => {
    if (!viewport) return;
    viewport.scrollTop = 0;
    panel.style.bottom = 'auto';
    panel.style.height = `${Math.max(0, viewport.getBoundingClientRect().bottom - host.getBoundingClientRect().top)}px`;
  };

  const open = () => {
    panel.classList.remove('hidden');
    fit();
    const chosen = current();
    grid.querySelectorAll('.bk-kid-tile.sui-mod-active').forEach(active => active.classList.remove('sui-mod-active'));
    if (chosen !== null) {
      renderMore(chosen);
      tile(chosen)?.classList.add('sui-mod-active');
      reveal(chosen, {mark: false, smooth: false});
    }
    fill();
    say('Pick your Bad Kid, or find it by number.');
  };

  const close = () => panel.classList.add('hidden');

  const pick = id => {
    close();
    choose(id);
  };

  const find = () => {
    const id = parseId(idInput.value);
    if (id === null) return;
    reveal(id);
    fill();
    say(`There's #${id}. Click it to make it yours.`);
  };

  // Find is on only while the number is one it can find.
  idInput.addEventListener('input', () => {
    const found = parseId(idInput.value) !== null;
    idButton.disabled = !found;
    idButton.classList.toggle('sui-mod-primary', found);
    idButton.classList.toggle('sui-mod-disabled', !found);
  });
  idInput.addEventListener('keyup', event => {
    if (event.key === 'Enter') find();
  });
  idButton.addEventListener('click', find);
  panel.querySelector('#bk-kid-close').addEventListener('click', close);
  return {open, close};
}

/** The profile is confirmed: the picture can't change any more. */
function lock() {
  document.getElementById('bk-kid-btn')?.remove();
  document.getElementById('bk-kid-picker')?.remove();
}

// The player's own profile ---------------------------------------------------

const EDIT_ID = 'bk-profile-pfp-edit-btn';

/**
 * The edit button on the player's own portrait (AccountProfileViewModel).
 *
 * @param {object} viewModel AccountProfileViewModel
 * @return {string}
 */
function profileButtonHTML(viewModel) {
  return viewModel.isOwnProfile
    ? `<a id="${EDIT_ID}" class="bk-profile-pfp-edit" href="javascript: void(0)" title="Change picture" aria-label="Change picture">
        <i class="sui-icon icon-edit sui-text-secondary"></i>
      </a>`
    : '';
}

/**
 * Opens the gallery from the player's own profile; the Bad Kid they choose is
 * set as their pfp on chain by their key at once (MsgPlayerUpdatePfp).
 *
 * @param {object} viewModel AccountProfileViewModel
 * @param {object} menuPage webapp's MenuPage
 */
function mountProfile(viewModel, menuPage) {
  const button = document.getElementById(EDIT_ID);
  const host = document.getElementById(menuPage.pageTemplateContentId);
  if (!button || !host) return;
  host.classList.add('bk-kid-picker-host');

  const status = document.createElement('div');
  status.className = 'bk-profile-pfp-status sui-text-hint hidden';
  document.querySelector('.profile-header-info-container')?.append(status);
  const say = text => {
    status.textContent = text;
    status.classList.toggle('hidden', !text);
  };

  const picker = createPicker(host, {
    viewport: document.getElementById(menuPage.screenBodyId),
    current: () => chosenId({url: viewModel.player?.pfp}),
    say: () => {},
    choose: async id => {
      const {gameState, signingClientManager} = globalThis;
      const player = gameState?.keyPlayers?.player?.player;
      if (!player?.id || player.id !== viewModel.playerId || !signingClientManager) {
        say('Your picture can only be changed while you are signed in.');
        return;
      }
      const url = kidUrl(id);
      button.classList.add('sui-mod-disabled');
      say(`Setting Bad Kid #${id} as your picture…`);
      try {
        const tx = await signingClientManager.queueMsgPlayerUpdatePfp(player.id, url);
        if (tx?.status !== 'succeeded') throw new Error(tx?.error ?? tx?.status ?? 'not sent');
        player.pfp = url;
        player.pfp_client_render_attributes = attributes(url, player.pfp_client_render_attributes);
        // The HUD's portrait, and anything else showing the player's own.
        const event = new CustomEvent('RENDER_PLAYER_PFP');
        event.playerType = 'player';
        window.dispatchEvent(event);
        const portrait = document.querySelector('.profile-header-image');
        if (portrait) portrait.innerHTML = new PfpViewerComponent(player.pfp_client_render_attributes).renderHTML();
        say(`Bad Kid #${id} is your picture.`);
      } catch (error) {
        console.warn(`[bk] pfp of ${player.id} not set: ${error?.message ?? error}`);
        say(`Your picture was not changed: ${error?.message ?? error}`);
      } finally {
        button.classList.remove('sui-mod-disabled');
      }
    },
  });
  button.addEventListener('click', () => {
    if (!button.classList.contains('sui-mod-disabled')) picker.open();
  });
}

export const kids = Object.freeze({mount, lock, profileButtonHTML, mountProfile});

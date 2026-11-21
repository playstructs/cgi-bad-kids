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
// with its warning and the close link.
import {FIRST_KID, LAST_KID, kidId, kidPath, kidUrl} from './pfp.js';
import {bindSubmitButtonToInput} from '../../structs-webapp/src/js/util/SubmitButtonToggle.js';

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

  const panel = document.createElement('div');
  panel.id = 'bk-kid-picker';
  panel.className = 'bk-kid-picker hidden';
  panel.innerHTML = `
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
      <div class="common-inline-text-input-error-container">
        <div id="bk-kid-id-error" class="sui-input-text-warning">Enter a number from ${FIRST_KID} to ${LAST_KID}.</div>
      </div>
    </div>
    <div id="bk-kid-scroll" class="bk-kid-scroll">
      <div id="bk-kid-grid" class="bk-kid-grid"></div>
    </div>`;
  body.append(panel);

  const scroller = panel.querySelector('#bk-kid-scroll');
  const grid = panel.querySelector('#bk-kid-grid');
  const idInput = panel.querySelector('#bk-kid-id');
  const idButton = panel.querySelector('#bk-kid-id-btn');
  const idError = panel.querySelector('#bk-kid-id-error');

  let next = FIRST_KID; // the first Bad Kid not yet in the grid
  const tile = id => grid.querySelector(`[data-kid="${id}"]`);

  /** Adds Bad Kids to the grid, the next batch or up to (and past) `id`. */
  const renderMore = (id = null) => {
    if (next > LAST_KID || (id !== null && id < next)) return;
    const last = Math.min(LAST_KID, (id ?? next) + BATCH - 1);
    const chosen = chosenId(viewModel.pfpViewerComponent?.pfp);
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
    if (target) choose(Number(target.dataset.kid));
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

  const open = () => {
    panel.classList.remove('hidden');
    const chosen = chosenId(viewModel.pfpViewerComponent?.pfp);
    grid.querySelectorAll('.bk-kid-tile.sui-mod-active').forEach(active => active.classList.remove('sui-mod-active'));
    if (chosen !== null) {
      renderMore(chosen);
      tile(chosen)?.classList.add('sui-mod-active');
      reveal(chosen, {mark: false, smooth: false});
    }
    fill();
    menuPage.setDialogueScreenContent(`Pick your Bad Kid. Know its number? Find it.`, true);
  };

  const close = () => panel.classList.add('hidden');

  const choose = id => {
    const component = viewModel.pfpViewerComponent;
    // The generated layers stay, under the Bad Kid, for clients that don't show URLs.
    component.pfp = {...(component.pfp ?? {}), url: kidUrl(id)};
    component.render();
    viewModel.gameState.signupRequest.pfp_client_render_attributes = component.getPfpJson();
    close();
    menuPage.setDialogueScreenContent(`Bad Kid #${id} it is. Now, your display name.`, true);
  };

  const find = () => {
    const id = parseId(idInput.value);
    if (id === null) {
      idError.classList.add('sui-mod-show');
      return;
    }
    idError.classList.remove('sui-mod-show');
    reveal(id);
    fill();
    menuPage.setDialogueScreenContent(`There's #${id}. Click it to make it yours.`, true);
  };

  bindSubmitButtonToInput(idInput, () => idButton);
  idInput.addEventListener('input', () => idError.classList.remove('sui-mod-show'));
  idInput.addEventListener('keyup', event => {
    if (event.key === 'Enter') find();
  });
  idButton.addEventListener('click', find);
  panel.querySelector('#bk-kid-close').addEventListener('click', close);
  button.addEventListener('click', open);
}

/** The profile is confirmed: the picture can't change any more. */
function lock() {
  document.getElementById('bk-kid-btn')?.remove();
  document.getElementById('bk-kid-picker')?.remove();
}

export const kids = Object.freeze({mount, lock});

# badkids.structs.zone — Structs for Bad Kids

The [structs-webapp](https://github.com/playstructs/structs-webapp) game client
for [Bad Kids](https://www.badkids.com)' Structs guild (`BAD`, guild `0-11`).
structs-webapp is a git submodule (`structs-webapp/`, following its `main`) and
its client is built as it is: its own JavaScript, page, styles and art, in
English, with its webpack configuration as the starting point. What this
repository adds is the overlay in [`bk/`](bk/README.md), applied while webpack
reads webapp's sources. Nothing in the submodule is edited, so a newer
structs-webapp builds with the same overlay.

Only the client side is used. This site hosts no guild API of its own: the page
talks straight to the guild's API, its GRASS feed and its chain node, which
`beta.playstructs.com` runs for Bad Kids.

Onboarding and tutorial telemetry is reported with the interface name
`badkids.structs.zone`, so these runs can be told apart from other clients' in
the guild's reports (`?interface_name=badkids.structs.zone`).

## Setup

```bash
git clone --recurse-submodules <this repository>
npm install          # also installs structs-webapp/src's own dependencies
npm run dev          # http://localhost:5197
```

## Updating structs-webapp

```bash
npm run update:webapp
```

This moves the submodule to the latest `main`, installs its dependencies and
runs the check, which lists what the update touched:

| Report | Meaning | What to do |
|---|---|---|
| `stale` | upstream changed the text a patch replaces | fix the patch in `bk/patches.cjs` |
| `orphan` | a patched upstream file is gone | move or delete its patches |
| `branding` | SN Corp is named somewhere a player sees | add a patch naming Bad Kids |
| `guild` | `bk/public/guild.json` and `GUILD_ID` disagree | fix whichever is wrong |

`npm test` fails while any remain. The build shows stale patches as warnings.
Commit the submodule pointer together with the overlay.

## Profile pictures

Every portrait (the HUD, profile, guild roster, player search, scans, spectator
and device activation) shows the player's own picture, their `pfp` on chain,
when it is a URL a browser can load: `https` (`http` is upgraded), or `ipfs://`,
`ipns://` and `ar://` through the ipfs.io and arweave.net gateways. webapp's
generated portrait stays underneath, and shows when a player has no such
picture or it fails to load (`bk/runtime/pfp.js`). Sector Blitz's public raid
lists are the exception: the guild API sends them only the generated portrait's
attributes, so they show a player's picture only when it is in those too, as it
is for everyone who signs up here.

### The Bad Kids gallery

This site hosts every Bad Kid's picture, `#1` to `#9999`, as 320px WebP in
[`bk/public/bk/kids/`](bk/public/bk/kids), so any Bad Kid is one link:

```
https://badkids.structs.zone/bk/kids/<id>.webp
```

At sign-up, **Choose Bad Kid** beside the generated picture opens a gallery of
all of them, edge to edge in one endless scroll (more are added as the player
nears the end; images load as they come into view). A player who knows their
Bad Kid's number finds it: the gallery jumps to it and outlines it. Clicking a
Bad Kid chooses it. No wallet is involved: the picture is the player's choice
(`bk/runtime/kids.js`). The gallery's controls are webapp's own SUI components:
screen buttons, the text input and its warning, and the close link.

That URL can't go into the sign-up request's `pfp`: the guild API requires it
to be JSON, which the chain then refuses as a pfp. So it goes in
`pfp_client_render_attributes` as `url` (beside the generated layers, which
other clients keep showing), the player joins with it, and when they first play,
their own key sets their `pfp` on chain to the same URL
(`MsgPlayerUpdatePfp`).

Members who have already joined change their picture from their own profile:
the edit button on their portrait opens the same gallery over the profile, and
the Bad Kid they click becomes their `pfp` on chain at once, signed by their own
key (`MsgPlayerUpdatePfp`); the profile and HUD show it, and a line under their
name says whether it went through (`bk/runtime/kids.js`).

Any copy of a Bad Kid's picture a player may have set as their `pfp` (this
site's, badkids.com's archive at `badkidsweb.storage.googleapis.com`, or the
collection's `ipfs://QmbGvE3w…/<id>.jpg`) is shown from this site's copy: the
same picture, a fraction of the size of the 2048px originals.

## Sign-up and the player's key

Sign-up has no recovery key section: once the player has chosen their name,
the page makes their account's key (a mnemonic) and creates the account
straight away, with nothing shown, explained or confirmed, and goes on to
Success. If the guild can't create it, the player sees why and can try again
with the same key (`bk/runtime/account.js`).

The Account page has **Download Player** where webapp has **Log Out**: a text
file, `<name>-<player id>.structs-player.txt`, holding the mnemonic this
browser signs with. After sign-up that is the account's own key; after an
account recovery or a device activation it is this browser's device key, which
can recover the player too, for as long as that device stays registered.

## Which guild

The site is Bad Kids': its guild is `0-11`, fixed in `webpack.config.js`
(`GUILD_ID`), and never looked up. Webapp normally asks its guild API which
guild it is (`/guild/this`), but Bad Kids shares SN Corp's API, so the page
asks for `/guild/0-11` instead.

Before webapp's code starts, the page reads `0-11`'s `guild.json` (the endpoint
the guild set on chain, `https://badkids.structs.zone/guild.json`, which this
site serves from [`bk/public/guild.json`](bk/public/guild.json)) for its
`guild_api`, `grass_nats_websocket` and `client_websocket`
(`bk/runtime/guild.js`). If it can't be read, it uses what it last read, then
the fallback in `webpack.config.js`. Requests carry a bearer token from the
guild's `/api/auth/token` (the same signed login as `/api/auth/login`), since a
guild's session cookie would be third-party here.

Account recovery asks the chain which guild the key's player is in before it
calls the guild API, since a shared API may log in another guild's player. A
player of another guild is moved here first: the key signs
`MsgGuildMembershipJoin` for this guild (allowed when its join minimum is 0),
and recovery goes on once the chain shows the move and the guild API knows the
player. Recovery stops instead when the player owns their guild, the guild asks
a join minimum, or the chain can't be read (`bk/runtime/recovery.js`).

| Variable (build time) | Default | |
|---|---|---|
| `BK_LCD_URL` | `https://public.testnet.structs.network` | the chain node the guild is read from |
| `BK_GUILD_API` | — | a fixed guild API (a local guild in development), skipping guild.json |
| `BK_GRASS_URL`, `BK_CHAIN_WS` | — | override what the guild publishes |

### On chain

| | |
|---|---|
| Guild | `0-11` Bad Kids, tag `BAD`, owned by founder player `1-14664` (`structs1th2kaercjz5ea3lh6maku4n9vpxh2ak5efwg70`) |
| Primary reactor | `3-4` Moonbridge (`structsvaloper1l8hkkj2sds7xg6x6ksdg6mcy0q3zprm5twdfye`) |
| Entry substation | `4-22`, fed by allocation `6-72` from the guild's own stake |
| Joining | open: join minimum 0, invite bypass permissioned |
| Endpoint | `https://badkids.structs.zone/guild.json` |
| Sign-up (TSA) | player `1-14665` (`structs1fn3ytar297qx3jgllcm2zfs0h2smr3ftxgyjm8`), the host's proxy-join signer: 512 (GuildMembership) on `0-11`, 1024 (SubstationConnection) on `4-22` |
| Bank denom | `scowl` / `uscowl` (in guild.json) |

## Building and serving

```bash
npm run build        # dist/
```

`dist/` is a static site: `index.html` (webapp's game page), the bundles in
`js/` and webapp's `css/`, `img/`, `lottie/` and fonts, plus `guild.json` and
Bad Kids' art in `bk/` (the pictures are about 134 MB of the 161 MB). It uses
absolute paths, so serve it from the root of `badkids.structs.zone`; it needs
nothing else on that domain, but `guild.json` must be readable cross-origin
(`Access-Control-Allow-Origin: *`), since other clients read it, as should
`bk/kids/` if other clients are to show these pictures as players' `pfp`.
GitHub Pages sends that header for every file. `.github/workflows/pages.yml`
publishes it there.

## Licences

structs-webapp is Apache-2.0 (Slow Ninja Inc). The Bad Kids artwork in
`bk/public/` (the collection's pictures, its avatar and @badkidsart's) is Bad
Kids' own, used for its guild.

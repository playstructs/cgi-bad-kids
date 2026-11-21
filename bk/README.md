# The Bad Kids overlay

Everything in this directory is applied to the `structs-webapp` submodule as it
is built. Nothing in the submodule is edited. The client stays in English;
there is no translation layer.

| Path | What it is |
|---|---|
| `patches.cjs` | `[exact upstream text, replacement]` pairs per upstream file: the guild connection, recovery, the telemetry name, players' own pictures, the Bad Kid picker, and Bad Kids in place of SN Corp in sign-up and the tutorial |
| `runtime/` | Loaded before webapp's entry as `__bk`: `guild` (`guild.js`, the services of the guild the page plays through, Bad Kids `0-11`), `recovery` (`recovery.js`, moving a recovered player of another guild into it), `pfp` (`pfp.js`, every portrait showing the player's `pfp` URL over the generated one, and setting a sign-up Bad Kid as `pfp` on chain) and `kids` (`kids.js`, the Bad Kids gallery at sign-up) |
| `public/` | Static files served over webapp's: `guild.json` (guild `0-11`'s on-chain endpoint), `favicon.ico`, and `bk/` with `bk.css`, the sign-up badge, the guild logo, icons and `kids/`, every Bad Kid's picture |
| `page.cjs` | Renders webapp's Twig page (`templates/`) to `index.html`, adding the icons and `bk.css` |
| `overlay.cjs`, `loader.cjs` | Apply `patches.cjs` to each source file webpack reads |
| `check.cjs` | `npm run check` / `npm test`: stale or orphaned patches, SN Corp left on screen, guild.json against `GUILD_ID` |

## Writing a patch

```js
'js/view_models/signup/Orientation7ViewModel.js': [
  ['on behalf of SN.CORPORATION.`', 'on behalf of BAD KIDS.`'],
],
```

- The first string is copied exactly from the upstream file; every occurrence
  is replaced, in one pass, longest first.
- Include enough around it (quotes, tags) that it only matches what you mean,
  never an id, class, storage key or anything sent to the guild or the chain.
  CSS classes such as `snc-logo` keep webapp's names.
- One key per upstream file: a second entry for the same file replaces the
  first.

## The art

All of it is made from the Bad Kids archive in `../BadKids` (retrieved from
badkids.com, its Stargaze collection and @badkidsart):

- `public/bk/kids/<id>.webp`: every Bad Kid, `#1` to `#9999`, resized from the
  collection's 2048px JPEGs (`BadKids/images/`) to 320px WebP at quality 82,
  about 13 KB each and 134 MB in all. The originals are 10 GB, too much for a
  repository or GitHub Pages (1 GB per site). To remake them:

  ```bash
  seq 1 9999 | xargs -P 16 -I{} cwebp -quiet -resize 320 320 -q 82 -m 6 -sharp_yuv ../BadKids/images/{}.jpg -o bk/public/bk/kids/{}.webp
  ```

- `public/bk/img/bad-kids-badge.png`: the @badkidsart profile avatar's kid,
  its black ink as white (the paper as alpha), in the top of a 384px square,
  the shape of webapp's 192px sign-up logo slot, with "BAD KIDS" set under it
  by webapp's own motto line.
- `bad-kids-logo.jpg`: the Stargaze collection avatar, 512px, for `guild.json`.
- The icons (`favicon.ico`, `favicon-32x32.png`, `apple-touch-icon.png`) are
  the black BAD KIDS square at the centre of that avatar.

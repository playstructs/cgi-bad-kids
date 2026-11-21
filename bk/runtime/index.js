// The Bad Kids overlay's runtime, loaded ahead of structs-webapp's entry.
//
// __bk.guild is the guild this page plays through, Bad Kids (guild.js),
// __bk.recovery moves a recovered player of another guild into it
// (recovery.js), __bk.pfp shows players' own pictures (pfp.js) and
// __bk.kids lets a player pick their Bad Kid at sign-up (kids.js).
// bk/patches.cjs points webapp's code at them.
import {guild} from './guild.js';
import {recovery} from './recovery.js';
import * as pfp from './pfp.js';
import {kids} from './kids.js';

globalThis.__bk = Object.freeze({guild, recovery, pfp: Object.freeze({...pfp}), kids});

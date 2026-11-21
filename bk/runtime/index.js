// The Bad Kids overlay's runtime, loaded ahead of structs-webapp's entry.
//
// __bk.guild is the guild this page plays through, Bad Kids (guild.js),
// __bk.recovery moves a recovered player of another guild into it
// (recovery.js), __bk.pfp shows players' own pictures (pfp.js) and
// __bk.kids lets a player pick their Bad Kid at sign-up (kids.js).
// bk/patches.cjs points webapp's code at them.
// __bk.account creates the account at sign-up without showing its recovery
// key, and offers Download Player in place of Log Out (account.js).
import {guild} from './guild.js';
import {recovery} from './recovery.js';
import * as pfp from './pfp.js';
import {kids} from './kids.js';
import {account} from './account.js';

globalThis.__bk = Object.freeze({guild, recovery, pfp: Object.freeze({...pfp}), kids, account});

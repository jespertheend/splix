import { Main } from "./Main.js";
import { parse as parseArgs } from "https://deno.land/std@0.198.0/flags/mod.ts";
import { basename } from "https://deno.land/std@0.198.0/path/mod.ts";
import { validGamemodes } from "./gameplay/Game.js";

/**
 * @param {ConstructorParameters<typeof Main>} args
 */
export function init(...args) {
	return new Main(...args);
}

if (import.meta.main) {
	const args = parseArgs(Deno.args);
	const executableName = basename(Deno.execPath());

	if (args.h || args.help) {
		console.log(`Available options:

-h --help
    Prints this help message

-p --port
    Configures the port of the websocket.
    Example: ${executableName} -p 5050

-h --hostname
    Configures the hostname of the websocket.
    Defaults to 127.0.0.1.
    Use 0.0.0.0 to allow access from other devices.
    Example: ${executableName} -h 0.0.0.0

--arenaWidth, --arenaHeight
    Configures the width and height of the arena.
    Both the width and height default to 100.
    Example: ${executableName} --arenaWidth 100 --arenaHeight 200

-s --arenaSize
    Sets both the width and height of the arena to the same value.
    Takes precedence over --arenaWidth and --arenaHeight.
    Example: ${executableName} -s 100

--fakeArenaWidth, --fakeArenaHeight
    Configures the width and height of the fake arena.
    Both the width and height default to 16.
    Example: ${executableName} --arenaWidth 10 --arenaHeight 20
	
-f --fakeArenaSize
    Sets both the width and height of the fake arena to the same value.
    Takes precedence over --fakeArenaWidth and --fakeArenaHeight.
    Example: ${executableName} -s 20

-g --gameMode
    Sets the game mode of the game. Valid values are:
    ${validGamemodes.join(" ")}
    Example: ${executableName} --gameMode default
`);
	} else {
		const port = args.p || args.port || 8080;
		const hostname = args.h || args.hostname || "127.0.0.1";
		let arenaWidth = parseInt(args.arenaWidth || 100);
		let arenaHeight = parseInt(args.arenaHeight || 100);
		const arenaSize = parseInt(args.s || args.arenaSize || 0);
		let fakeArenaWidth = parseInt(args.fakeArenaWidth || 16);
		let fakeArenaHeight = parseInt(args.fakeArenaHeight || 16);
		const fakeArenaSize = parseInt(args.f || args.fakeArenaSize || 16);
		const gameMode = args.g || args.gameMode || "default";
		if (!validGamemodes.includes(gameMode)) {
			throw new Error(`"${gameMode}" is not a valid gamemode.`);
		}
		if (arenaSize) {
			arenaWidth = arenaSize;
			arenaHeight = arenaSize;
		}
		if (fakeArenaSize) {
			fakeArenaWidth = fakeArenaSize;
			fakeArenaHeight = fakeArenaSize;
		}
		const main = init({
			arenaWidth,
			arenaHeight,
			fakeArenaWidth,
			fakeArenaHeight,
			gameMode,
		});
		main.init({ port, hostname });
	}
}

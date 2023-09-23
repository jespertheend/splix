import { Main } from "./Main.js";
import { parse as parseArgs } from "https://deno.land/std@0.198.0/flags/mod.ts";
import { basename } from "https://deno.land/std@0.198.0/path/mod.ts";

/** @type {Main?} */
let main = null;

/**
 * @param {ConstructorParameters<typeof Main>} args
 */
export function init(...args) {
	main = new Main(...args);
	// @ts-ignore
	globalThis.mainInstance = main;
	return main;
}

export function getMainInstance() {
	if (!main) {
		throw new Error("Main instance is not initialized");
	}
	return main;
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

--arenaWidth, --arenaHeight
    Configures the width and height of the arena.
    Both the width and height default to 100.
    Example: ${executableName} --arenaWidth 100 --arenaHeight 200

-s --arenaSize
    Sets both the width and height of the arena to the same value.
    Takes precedence over --arenaWidth and --arenaHeight.
    Example: ${executableName} -s 100
`);
	} else {
		const port = args.p || args.port || 8080;
		let arenaWidth = parseInt(args.arenaWidth || 100);
		let arenaHeight = parseInt(args.arenaHeight || 100);
		const arenaSize = parseInt(args.s || args.arenaSize || 0);
		if (arenaSize) {
			arenaWidth = arenaSize;
			arenaHeight = arenaSize;
		}
		const main = init({
			arenaWidth,
			arenaHeight,
		});
		main.init({ port });
	}
}

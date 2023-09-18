import { Main } from "./Main.js";

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

import { PLAYER_TRAVEL_SPEED } from "./config.js";
import { getMainInstance } from "./mainInstance.js";

/**
 * Tick rate in milliseconds
 */
const APPLICATION_LOOP_INTERVAL = 50;

/**
 * The maximum allowed duration for a single tick.
 * If the server has a hiccup for some reason, and a tick takes longer than this amount,
 * we won't move players forward any further and all players will receive a message of their new location.
 */
const MAX_LOOP_DURATION_MS = 3 / PLAYER_TRAVEL_SPEED;

export class ApplicationLoop {
	#prevNow = 0;

	constructor() {
		this.now = 0;
		setInterval(this.loop.bind(this), APPLICATION_LOOP_INTERVAL);
	}

	loop() {
		const now = performance.now();
		let dt = now - this.#prevNow;
		if (dt > MAX_LOOP_DURATION_MS) {
			dt = Math.min(MAX_LOOP_DURATION_MS, dt);
		}
		this.#prevNow = now;
		this.now += dt;
		getMainInstance().game.loop(this.now, dt);
		getMainInstance().websocketManager.loop(this.now, dt);
	}

	/**
	 * If the server is currently under a lot of stress, and the current tick is taking too long,
	 * messages will not arrive at the exact time when they were sent.
	 * Instead, a tick starts taking very long and all messages that were sent during that tick are
	 * all bundled together and fired in rapid succession.
	 * In some cases, it is best to just ignore some of these messages when this happens.
	 * But since these messages arrive just before the next tick starts,
	 * any message handling code can't rely on the `dt` value of any loop.
	 * Instead this function should be called to check if the current tick has been running for too long.
	 */
	currentTickIsSlow() {
		const dt = performance.now() - this.#prevNow;
		return dt > MAX_LOOP_DURATION_MS;
	}
}

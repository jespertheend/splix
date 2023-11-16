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
		const dt = Math.min(MAX_LOOP_DURATION_MS, now - this.#prevNow);
		this.#prevNow = now;
		this.now += dt;
		getMainInstance().game.loop(this.now, dt);
		getMainInstance().websocketManager.loop(this.now, dt);
	}
}

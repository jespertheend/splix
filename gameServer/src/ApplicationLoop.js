import { getMainInstance } from "./mainInstance.js";

export const APPLICATION_LOOP_INTERVAL = 50;

export class ApplicationLoop {
	constructor() {
		this.now = 0;
		setInterval(this.loop.bind(this), APPLICATION_LOOP_INTERVAL);
	}

	loop() {
		const now = performance.now();
		const dt = now - this.now;
		this.now = now;
		getMainInstance().game.loop(this.now, dt);
		getMainInstance().websocketManager.loop(this.now, dt);
	}
}

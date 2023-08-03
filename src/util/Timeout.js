export class Timeout {
	/**
	 * @param {() => void} cb
	 * @param {number} ms
	 * @param {boolean} startAtCreation
	 */
	constructor(cb, ms, startAtCreation = false) {
		this.cb = cb;
		this.id = -1;
		this.ms = ms;
		this.isDestructed = false;

		if (startAtCreation) {
			this.start();
		}
	}

	destructor() {
		this.stop();
		this.isDestructed = true;
	}

	get isRunning() {
		return this.id != -1;
	}

	// returns true if the timeout was running and is now cleared,
	// returns false if there was no timeout running
	stop() {
		if (this.isDestructed) return;
		if (this.id >= 0) {
			clearTimeout(this.id);
			this.id = -1;
			return true;
		}
		return false;
	}

	start(ms = this.ms) {
		if (this.isDestructed) return;
		this.stop();
		this.id = setTimeout(this.execute.bind(this), ms);
	}

	execute() {
		this.id = -1;
		if (this.cb) this.cb();
	}

	/**
	 * @param {number} ms
	 */
	static promise(ms) {
		/** @type {Promise<void>} */
		const p = new Promise((resolve, reject) => {
			setTimeout(() => {
				resolve();
			}, ms);
		});
		return p;
	}
}

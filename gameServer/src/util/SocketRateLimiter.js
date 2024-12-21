/**
 * Limit the number of messages sent to the server within a time interval
 * to guard against socket abuse.
 *
 * @example
 * const rateLimiter = new DinoRateLimiter({
 *    maxMessages: 20, // Allow a maximum of 20 messages
 *    interval: 100, // Within a 100ms time window
 *    onRateLimitExceeded: () => {
 *        socket.close(); // close the connection when limit is exceeded
 *    }
 *    banHandler: new BanHandler({
 * 		  ip: ip,
 * 		  banDurationInSeconds: 600,
 * 	      banThreshold: 3,
 * 		  onBan: () => {
 * 			socket.close();
 * 		  },
 * 	  }),
 * });
 *
 * // Trigger the tick() method when a message is received
 * if (rateLimiter.tick()) {
 *    console.log('Rate limit exceeded');
 * } else {
 *    console.log('Message received');
 * }
 */
class DinoRateLimiter {
	/**
	 * @param {Object} options - Configurations
	 * @param {number} options.maxMessages - Maximum number of messages allowed in the time interval.
	 * @param {number} options.interval - Time interval in milliseconds for the rate limit.
	 * @param {Function} [options.onRateLimitExceeded] - Optional callback to invoke when the ratelimit is exceeded.
	 * @param {BanHandler} [options.banHandler] - Optional ban handler to ban abusive clients.
	 */
	constructor({ maxMessages, interval, onRateLimitExceeded, banHandler }) {
		/** @type {number[]} */
		this.messageTimeQueue = [];
		this.maxMessages = maxMessages;
		this.interval = interval;
		this.onRateLimitExceeded = onRateLimitExceeded;
		this.banHandler = banHandler;
	}

	/**
	 * Checks if the rate limit is exceeded and pushes the message timestamp to the
	 * message queue. This method must be called every time a message is received.
	 * If the rate limit is reached, it executes the `onRateLimitExceeded` callback.
	 *
	 * @returns {boolean} True if the rate limit is exceeded, otherwise false.
	 */
	tick() {
		if (this.banHandler) BanHandler.checkFrequentAbuse(this.banHandler);

		const now = Date.now();
		this.messageTimeQueue.push(now);

		while (this.messageTimeQueue.length && now - this.messageTimeQueue[0] > this.interval) {
			this.messageTimeQueue.shift();
		}

		if (this.messageTimeQueue.length > this.maxMessages) {
			if (this.onRateLimitExceeded) this.onRateLimitExceeded();
			if (this.banHandler) BanHandler.tick(this.banHandler);
			return true;
		}
		return false;
	}
}

/**
 * Handles banning abusive clients based on socket activity.
 */
class BanHandler {
	/**
	 * @param {Object} options - Configurations
	 * @param {string} options.ip - IP address of the client.
	 * @param {number} options.banDurationInSeconds - Time period the player stays banned.
	 * @param {number} options.banThreshold - Number of socket abuses to trigger a ban.
	 * @param {Function} options.onBan - Callback to invoke when a client is banned.
	 */
	constructor({ ip, banDurationInSeconds, banThreshold, onBan }) {
		this.ip = ip;
		this.banThreshold = banThreshold;
		this.onBan = onBan;
		this.banDuration = banDurationInSeconds * 1000;
	}

	/** @type {{[key: string]: number[]}} */
	static abuseLog = {};

	/**
	 * Logs an abuse instance for the specified handler.
	 * @param {BanHandler} handler - The banhandler for the client.
	 */
	static tick(handler) {
		this.abuseLog[handler.ip] ||= [];
		this.abuseLog[handler.ip].push(Date.now());
	}

	/**
	 * Block if client exceeds the ban threshold.
	 * @param {BanHandler} handler - The banhandler for the client.
	 * @returns {boolean} True if the ban threshold is exceeded, otherwise false.
	 */
	static checkFrequentAbuse(handler) {
		this.abuseLog[handler.ip] ||= [];
		while (
			this.abuseLog[handler.ip].length &&
			Date.now() - this.abuseLog[handler.ip][0] > handler.banDuration
		) {
			this.abuseLog[handler.ip].shift();
		}

		if (this.abuseLog[handler.ip].length >= handler.banThreshold) {
			handler.onBan();
			return true;
		}
		return false;
	}

	/**
	 * Cleans up the abuse log for entries beyond the maximum ban duration.
	 * Dino no like memory leaks.
	 */
	static maxBanDuration = 2 * 3600_000;
	static cleanupInterval = 3600_000;

	static abuseLogCleaner = setInterval(() => {
		for (const ip in this.abuseLog) {
			while (
				this.abuseLog[ip].length &&
				Date.now() - this.abuseLog[ip][0] > this.maxBanDuration
			) {
				this.abuseLog[ip].shift();
			}
			if (!this.abuseLog[ip].length) delete this.abuseLog[ip];
		}
	}, this.cleanupInterval);
}

export { BanHandler, DinoRateLimiter };

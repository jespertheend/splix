/**
 * Tracks which ips have recently attempted to authenticate and limits their rate of invalid attempts.
 */
export class AuthRateLimitManager {
	/**
	 * @typedef Attempt
	 * @property {Promise<void>} promise
	 * @property {number} timeout
	 * @property {() => void} resolve
	 * @property {boolean} resolved
	 */

	/** @type {Map<string, Attempt>} */
	#recentAttempts = new Map();
	#rateLimit;

	constructor({
		/** Time in milliseconds indicating how frequently and authentication request can be made. */
		rateLimit = 5_000,
	} = {}) {
		this.#rateLimit = rateLimit;
	}

	/**
	 * Returns a promises that resolves as soon as authentication is allowed again.
	 * @param {string} ip
	 * @returns {Promise<void>}
	 */
	waitForAuthenticationAllowed(ip) {
		const attempt = this.#recentAttempts.get(ip);
		if (attempt) {
			return attempt.promise;
		} else {
			return Promise.resolve();
		}
	}

	/**
	 * @param {string} ip
	 */
	markIpAsRecentAttempt(ip) {
		const attempt = this.#recentAttempts.get(ip);
		if (attempt && !attempt.resolved) {
			clearTimeout(attempt.timeout);
			attempt.timeout = setTimeout(() => {
				attempt.resolve();
			}, this.#rateLimit);
		} else {
			let resolvePromise = () => {};
			const timeout = setTimeout(() => {
				attempt.resolve();
			}, this.#rateLimit);

			/** @type {Attempt} */
			const attempt = {
				promise: new Promise((r) => {
					resolvePromise = r;
				}),
				resolve: () => {
					resolvePromise();
					attempt.resolved = true;
				},
				resolved: false,
				timeout,
			};
			this.#recentAttempts.set(ip, attempt);
		}
	}
}

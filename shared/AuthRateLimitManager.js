import { clamp } from "renda";

/**
 * Tracks which ips have recently attempted to authenticate and limits their rate of invalid attempts.
 */
export class AuthRateLimitManager {
	/**
	 * @typedef Attempt
	 * @property {number} attemptCount
	 * @property {Promise<void>} promise
	 * @property {number} timeout
	 * @property {() => void} resolve
	 * @property {boolean} resolved
	 */

	/** @type {Map<string, Attempt>} */
	#recentAttempts = new Map();

	constructor() {
		setInterval(() => {
			for (const [key, attempt] of this.#recentAttempts) {
				attempt.attemptCount--;
				if (attempt.attemptCount <= 0 && attempt.resolved) {
					this.#recentAttempts.delete(key);
				}
			}
		}, 60_000);
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
	 * @param {number} attemptCount
	 */
	#getRateLimitForAttemptCount(attemptCount) {
		return Math.pow(2, attemptCount) * 1000;
	}

	/**
	 * @param {string} ip
	 */
	markIpAsRecentAttempt(ip) {
		const attempt = this.#recentAttempts.get(ip);
		const attemptCount = clamp((attempt?.attemptCount || 0) + 1, 0, 5);
		if (attempt && !attempt.resolved) {
			clearTimeout(attempt.timeout);
			attempt.timeout = setTimeout(() => {
				attempt.resolve();
			}, this.#getRateLimitForAttemptCount(attemptCount));
		} else {
			let resolvePromise = () => {};
			const timeout = setTimeout(() => {
				newAttempt.resolve();
			}, this.#getRateLimitForAttemptCount(attemptCount));

			/** @type {Attempt} */
			const newAttempt = {
				promise: new Promise((r) => {
					resolvePromise = r;
				}),
				resolve: () => {
					resolvePromise();
					newAttempt.resolved = true;
				},
				resolved: false,
				timeout,
				attemptCount,
			};
			this.#recentAttempts.set(ip, newAttempt);
		}
	}
}

import { clamp, mapValue } from "renda";

/**
 * Tracks which IPs have recently attempted to perform an action and limits their rate of invalid attempts.
 */
export class RateLimitManager {
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

	#alwaysUseMultiConnectionLimit;

	constructor({
		alwaysUseMultiConnectionLimit = false,
	} = {}) {
		this.#alwaysUseMultiConnectionLimit = alwaysUseMultiConnectionLimit;
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
	 * @param {string} ip
	 */
	actionAllowed(ip) {
		const attempt = this.#recentAttempts.get(ip);
		if (!attempt) return true;
		return attempt.resolved;
	}

	/**
	 * Returns a promises that resolves as soon as the action is allowed again.
	 * @param {string} ip
	 * @returns {Promise<void>}
	 */
	waitForActionAllowed(ip) {
		const attempt = this.#recentAttempts.get(ip);
		if (attempt) {
			return attempt.promise;
		} else {
			return Promise.resolve();
		}
	}

	/**
	 * @param {number} attemptCount
	 * @param {number} currentConnectionCount
	 */
	#getRateLimitForAttemptCount(attemptCount, currentConnectionCount) {
		if (this.#alwaysUseMultiConnectionLimit || currentConnectionCount > 5) {
			return Math.pow(2, attemptCount - 5) * 1000;
		} else {
			return mapValue(attemptCount, 0, 10, 0, 1000);
		}
	}

	/**
	 * @param {string} ip
	 */
	markIpAsRecentAttempt(ip, currentConnectionCount = 1) {
		const attempt = this.#recentAttempts.get(ip);
		const attemptCount = clamp((attempt?.attemptCount || 0) + 1, 0, 10);
		const rateLimit = this.#getRateLimitForAttemptCount(attemptCount, currentConnectionCount);
		if (attempt && !attempt.resolved) {
			clearTimeout(attempt.timeout);
			attempt.timeout = setTimeout(() => {
				attempt.resolve();
			}, rateLimit);
		} else {
			let resolvePromise = () => {};
			const timeout = setTimeout(() => {
				newAttempt.resolve();
			}, rateLimit);

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

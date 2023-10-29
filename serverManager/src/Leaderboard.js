/**
 * @typedef LeaderboardScoreEntry
 * @property {string} name
 * @property {number} score
 * @property {number} lastUpdateTime
 */

/**
 * @typedef ApiLeaderboardScoreEntry
 * @property {string} name
 * @property {number} score
 */

export class Leaderboard {
	/** @type {LeaderboardScoreEntry[]} */
	#scores = [];

	/**
	 * @param {string} name
	 * @param {number} score
	 */
	reportPlayer(name, score) {
		const existingIndex = this.#scores.findIndex((otherEntry) => otherEntry.name == name);
		const insertionIndex = this.#scores.findIndex((otherEntry) => score > otherEntry.score);
		if (existingIndex >= 0) {
			// Remove the existing entry
			this.#scores.splice(existingIndex, 1);
		}
		/** @type {LeaderboardScoreEntry} */
		const newEntry = {
			name,
			score,
			lastUpdateTime: Date.now(),
		};
		// Insert at the insertion index, or at the end otherwise
		if (insertionIndex >= 0) {
			this.#scores.splice(insertionIndex, 0, newEntry);
		} else {
			this.#scores.push(newEntry);
		}
		// Limit scores to a max of 50 entries
		this.#scores = this.#scores.slice(0, 50);
	}

	getSaveData() {
		return this.#scores;
	}

	/**
	 * @returns {ApiLeaderboardScoreEntry[]}
	 */
	getApiJson() {
		return this.#scores.map((s) => {
			return {
				name: s.name,
				score: s.score,
			};
		});
	}

	/**
	 * @param {LeaderboardScoreEntry[]} scores
	 */
	loadSaveData(scores) {
		this.#scores = scores;
	}

	/**
	 * @param {number} maxAge
	 */
	clearOldScores(maxAge) {
		const oldIndices = [];
		for (const [index, entry] of this.#scores.entries()) {
			const ageMs = Date.now() - entry.lastUpdateTime;
			if (ageMs > maxAge) {
				oldIndices.push(index);
			}
		}
		for (let i = oldIndices.length - 1; i >= 0; i--) {
			const index = oldIndices[i];
			this.#scores.splice(index, 1);
		}
	}
}

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
		let insertionIndex = 0;
		for (const [i, otherEntry] of this.#scores.entries()) {
			if (otherEntry.name == name) {
				if (score > otherEntry.score) {
					otherEntry.score = score;
					otherEntry.lastUpdateTime = Date.now();
				}
				return;
			} else if (score > otherEntry.score) {
				insertionIndex = i;
				break;
			}
		}
		this.#scores.splice(insertionIndex, 0, { name, score, lastUpdateTime: Date.now() });
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

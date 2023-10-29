/**
 * @typedef LeaderboardScoreEntry
 * @property {string} name
 * @property {number} score
 * @property {number} lastUpdateTime
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
				otherEntry.score = Math.max(score, otherEntry.score);
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
	 * @param {LeaderboardScoreEntry[]} scores
	 */
	loadSaveData(scores) {
		this.#scores = scores;
	}
}

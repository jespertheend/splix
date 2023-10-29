export class Leaderboard {
	/**
	 * @typedef ScoreEntry
	 * @property {string} name
	 * @property {number} score
	 */
	/** @type {ScoreEntry[]} */
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
		this.#scores.splice(insertionIndex, 0, { name, score });
		// Limit scores to a max of 50 entries
		this.#scores = this.#scores.slice(0, 50);
		console.log(this.#scores);
	}
}

import { Leaderboard } from "./Leaderboard.js";

/**
 * @typedef SavedLeaderboardGroupData
 * @property {import("./Leaderboard.js").LeaderboardScoreEntry[]} tiles
 * @property {import("./Leaderboard.js").LeaderboardScoreEntry[]} kills
 * @property {import("./Leaderboard.js").LeaderboardScoreEntry[]} timeAliveSeconds
 * @property {import("./Leaderboard.js").LeaderboardScoreEntry[]} rankingFirstSeconds
 * @property {import("./Leaderboard.js").LeaderboardScoreEntry[]} trailLength
 */

/**
 * @typedef ApiLeaderboardGroupData
 * @property {import("./Leaderboard.js").ApiLeaderboardScoreEntry[]} tiles
 * @property {import("./Leaderboard.js").ApiLeaderboardScoreEntry[]} kills
 * @property {import("./Leaderboard.js").ApiLeaderboardScoreEntry[]} timeAliveSeconds
 * @property {import("./Leaderboard.js").ApiLeaderboardScoreEntry[]} rankingFirstSeconds
 * @property {import("./Leaderboard.js").ApiLeaderboardScoreEntry[]} trailLength
 */

export class LeaderboardGroup {
	#tilesLeaderboard = new Leaderboard();
	#killsLeaderboard = new Leaderboard();
	#timeAliveLeaderboard = new Leaderboard();
	#rankingFirstLeaderboard = new Leaderboard();
	#traillLengthLeaderboard = new Leaderboard();

	/**
	 * @param {import("./LeaderboardManager.js").PlayerScoreData} score
	 */
	reportPlayerScore(score) {
		this.#tilesLeaderboard.reportPlayer(score.name, score.scoreTiles);
		this.#killsLeaderboard.reportPlayer(score.name, score.scoreKills);
		this.#timeAliveLeaderboard.reportPlayer(score.name, score.timeAliveSeconds);
		this.#rankingFirstLeaderboard.reportPlayer(score.name, score.rankingFirstSeconds);
		this.#traillLengthLeaderboard.reportPlayer(score.name, score.trailLength);
	}

	getSaveData() {
		/** @type {SavedLeaderboardGroupData} */
		const scoreData = {
			tiles: this.#tilesLeaderboard.getSaveData(),
			kills: this.#killsLeaderboard.getSaveData(),
			timeAliveSeconds: this.#timeAliveLeaderboard.getSaveData(),
			rankingFirstSeconds: this.#rankingFirstLeaderboard.getSaveData(),
			trailLength: this.#traillLengthLeaderboard.getSaveData(),
		};
		return scoreData;
	}

	/**
	 * @param {SavedLeaderboardGroupData} scoreData
	 */
	loadSaveData(scoreData) {
		this.#tilesLeaderboard.loadSaveData(scoreData.tiles);
		this.#killsLeaderboard.loadSaveData(scoreData.kills);
		this.#timeAliveLeaderboard.loadSaveData(scoreData.timeAliveSeconds);
		this.#rankingFirstLeaderboard.loadSaveData(scoreData.rankingFirstSeconds);
		this.#traillLengthLeaderboard.loadSaveData(scoreData.trailLength);
	}

	/**
	 * @param {number} maxAge
	 */
	clearOldScores(maxAge) {
		this.#tilesLeaderboard.clearOldScores(maxAge);
		this.#killsLeaderboard.clearOldScores(maxAge);
		this.#timeAliveLeaderboard.clearOldScores(maxAge);
		this.#rankingFirstLeaderboard.clearOldScores(maxAge);
		this.#traillLengthLeaderboard.clearOldScores(maxAge);
	}

	/**
	 * @returns {ApiLeaderboardGroupData}
	 */
	getApiJson() {
		return {
			tiles: this.#tilesLeaderboard.getApiJson(),
			kills: this.#killsLeaderboard.getApiJson(),
			timeAliveSeconds: this.#timeAliveLeaderboard.getApiJson(),
			rankingFirstSeconds: this.#rankingFirstLeaderboard.getApiJson(),
			trailLength: this.#traillLengthLeaderboard.getApiJson(),
		};
	}
}

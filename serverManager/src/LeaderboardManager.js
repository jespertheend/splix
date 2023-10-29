import { Leaderboard } from "./Leaderboard.js";

/**
 * @typedef PlayerScoreData
 * @property {string} name
 * @property {number} scoreTiles
 * @property {number} scoreKills
 * @property {number} timeAliveSeconds
 * @property {number} rankingFirstSeconds
 * @property {number} trailLength
 */

export class LeaderboardManager {
	#tilesLeaderboard = new Leaderboard();
	#killsLeaderboard = new Leaderboard();
	#timeAliveLeaderboard = new Leaderboard();
	#rankingFirstLeaderboard = new Leaderboard();
	#traillLengthLeaderboard = new Leaderboard();

	/**
	 * @param {PlayerScoreData} score
	 */
	reportPlayerScore(score) {
		this.#tilesLeaderboard.reportPlayer(score.name, score.scoreTiles);
		this.#killsLeaderboard.reportPlayer(score.name, score.scoreKills);
		this.#timeAliveLeaderboard.reportPlayer(score.name, score.timeAliveSeconds);
		this.#rankingFirstLeaderboard.reportPlayer(score.name, score.rankingFirstSeconds);
		this.#traillLengthLeaderboard.reportPlayer(score.name, score.trailLength);
	}
}

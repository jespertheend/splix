import { LeaderboardGroup } from "./LeaderboardGroup.js";
import { PersistentStorage } from "./PersistentStorage.js";

/**
 * @typedef PlayerScoreData
 * @property {string} name
 * @property {number} scoreTiles
 * @property {number} scoreKills
 * @property {number} timeAliveSeconds
 * @property {number} rankingFirstSeconds
 * @property {number} trailLength
 */

/**
 * @typedef LeaderboardData
 * @property {import("./LeaderboardGroup.js").SavedLeaderboardGroupData} daily
 * @property {import("./LeaderboardGroup.js").SavedLeaderboardGroupData} weekly
 */

const PERSISTENT_STORAGE_KEY = "globalLeaderboard";

export class LeaderboardManager {
	#dailyGroup = new LeaderboardGroup();
	#weeklyGroup = new LeaderboardGroup();

	#persistentStorage;

	/**
	 * @param {PersistentStorage} persistentStorage
	 */
	constructor(persistentStorage) {
		this.#persistentStorage = persistentStorage;
		this.#loadScores();
	}

	/**
	 * @param {PlayerScoreData} score
	 */
	reportPlayerScore(score) {
		this.#dailyGroup.reportPlayerScore(score);
		this.#weeklyGroup.reportPlayerScore(score);
		this.#saveScores();
	}

	#saveScores() {
		/** @type {LeaderboardData} */
		const scoreData = {
			daily: this.#dailyGroup.getSaveData(),
			weekly: this.#weeklyGroup.getSaveData(),
		};

		this.#persistentStorage.set(PERSISTENT_STORAGE_KEY, scoreData);
	}

	#loadScores() {
		const scoreData = this.#persistentStorage.get(PERSISTENT_STORAGE_KEY);
		if (scoreData) {
			const castData = /** @type {LeaderboardData} */ (scoreData);
			this.#dailyGroup.loadSaveData(castData.daily);
			this.#weeklyGroup.loadSaveData(castData.weekly);
		}
	}
}

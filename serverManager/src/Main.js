import { RateLimitManager } from "../../shared/RateLimitManager.js";
import { LeaderboardManager } from "./LeaderboardManager.js";
import { LegacyServerManager } from "./LegacyServerManager.js";
import { PersistentStorage } from "./PersistentStorage.js";
import { ServerManager } from "./ServerManager.js";
import { WebSocketManager } from "./WebSocketManager.js";

export class Main {
	/**
	 * @param {Object} options
	 * @param {string?} options.persistentStoragePath The location where the json file with persistent storage is located.
	 * @param {string} options.websocketAuthToken
	 */
	constructor({ persistentStoragePath, websocketAuthToken }) {
		this.persistentStorage = new PersistentStorage(persistentStoragePath);
		this.leaderboardManager = new LeaderboardManager(this.persistentStorage);
		this.servermanager = new ServerManager(this);
		this.legacyServerManager = new LegacyServerManager(this);
		this.websocketManager = new WebSocketManager(this, websocketAuthToken);
		this.authRateLimitManager = new RateLimitManager({ alwaysUseMultiConnectionLimit: true });
	}
}

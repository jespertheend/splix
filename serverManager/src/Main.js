import { AuthRateLimitManager } from "../../shared/AuthRateLimitManager.js";
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
		this.servermanager = new ServerManager(this);
		this.websocketManager = new WebSocketManager(this, websocketAuthToken);
		this.authRateLimitManager = new AuthRateLimitManager();
	}
}

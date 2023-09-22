import { AuthRateLimitManager } from "../../shared/AuthRateLimitManager.js";
import { PersistentStorage } from "./PersistentStorage.js";
import { ServerManager } from "./ServerManager.js";
import { WebSocketManager } from "./WebSocketManager.js";

export class Main {
	/**
	 * @param {string} storagePath The location where the json file with persistent storage is located.
	 */
	constructor(storagePath) {
		this.persistentStorage = new PersistentStorage(storagePath);
		this.servermanager = new ServerManager(this);
		this.websocketManager = new WebSocketManager(this);
		this.authRateLimitManager = new AuthRateLimitManager();
	}
}

import { AuthRateLimitManager } from "../../shared/AuthRateLimitManager.js";
import { ServerManager } from "./ServerManager.js";
import { WebSocketManager } from "./WebSocketManager.js";

export class Main {
	constructor() {
		this.servermanager = new ServerManager(this);
		this.websocketManager = new WebSocketManager(this);
		this.authRateLimitManager = new AuthRateLimitManager();
	}
}

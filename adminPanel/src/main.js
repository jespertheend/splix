import { LegacyServerManager } from "./LegacyServerManager.js";
import { ServerManager } from "./ServerManager.js";
import { WebSocketManager } from "./WebsocketManager.js";

export class Main {
	constructor() {
		this.webSocketManager = new WebSocketManager(this);
		this.legacyServersManager = new LegacyServerManager(this);
		this.serverManager = new ServerManager(this);
	}
}

const main = new Main();
globalThis.main = main;

document.body.appendChild(main.legacyServersManager.el);
document.body.appendChild(main.serverManager.el);

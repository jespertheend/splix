import { ServerManager } from "./ServerManager.js";
import { WebSocketManager } from "./WebsocketManager.js";

export class Main {
	constructor() {
		this.webSocketManager = new WebSocketManager(this);
		this.serverManager = new ServerManager(this);
	}
}

const main = new Main();
globalThis.main = main;

document.body.appendChild(main.serverManager.el);

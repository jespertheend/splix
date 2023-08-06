import { ApplicationLoop } from "./ApplicationLoop.js";
import { Game } from "./gameplay/Game.js";
import { WebSocketManager } from "./WebSocketManager.js";

export class Main {
	constructor() {
		this.websocketManager = new WebSocketManager();
		this.game = new Game({
			arenaHeight: 100,
			arenaWidth: 100,
		});
		this.applicationLoop = new ApplicationLoop();
	}

	init() {
		this.websocketManager.init();
	}
}

import { Game } from "./Game.js";
import { WebSocketManager } from "./WebSocketManager.js";

export class Main {
	constructor() {
		this.websocketManager = new WebSocketManager();
		this.game = new Game();
	}

	init() {
		this.websocketManager.init();
	}
}

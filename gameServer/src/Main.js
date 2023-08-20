import { ApplicationLoop } from "./ApplicationLoop.js";
import { Game } from "./gameplay/Game.js";
import { WebSocketManager } from "./WebSocketManager.js";

export class Main {
	/**
	 * @param {Object} options
	 * @param {number} options.port
	 * @param {number} options.arenaWidth
	 * @param {number} options.arenaHeight
	 */
	constructor({
		port,
		arenaWidth,
		arenaHeight,
	}) {
		this.websocketManager = new WebSocketManager(port);
		this.game = new Game({
			arenaWidth,
			arenaHeight,
		});
		this.applicationLoop = new ApplicationLoop();
	}

	init() {
		this.websocketManager.init();
	}
}

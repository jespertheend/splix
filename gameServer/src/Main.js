import { ApplicationLoop } from "./ApplicationLoop.js";
import { Game } from "./gameplay/Game.js";
import { WebSocketManager } from "./WebSocketManager.js";

export class Main {
	/**
	 * @param {Object} options
	 * @param {number} options.arenaWidth
	 * @param {number} options.arenaHeight
	 */
	constructor({
		arenaWidth,
		arenaHeight,
	}) {
		this.websocketManager = new WebSocketManager();
		this.game = new Game({
			arenaWidth,
			arenaHeight,
		});
		this.applicationLoop = new ApplicationLoop();
	}

	/**
	 * @param {Object} options
	 * @param {number} options.port
	 */
	init({ port }) {
		this.websocketManager.startServer(port);
	}
}

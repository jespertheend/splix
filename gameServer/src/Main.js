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
		this.game.onPlayerCountChange((playerCount) => {
			this.websocketManager.notifyControlSocketsPlayerCount(playerCount);
		});
		this.applicationLoop = new ApplicationLoop();
	}

	/**
	 * @param {Object} options
	 * @param {number} options.port
	 * @param {string} options.hostname
	 */
	init({ port, hostname }) {
		this.websocketManager.startServer(port, hostname);
	}
}

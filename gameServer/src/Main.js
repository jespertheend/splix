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
		this.applicationLoop = new ApplicationLoop();
		this.websocketManager = new WebSocketManager();
		this.game = new Game(this.applicationLoop, {
			arenaWidth,
			arenaHeight,
		});
		this.game.onPlayerCountChange((playerCount) => {
			this.websocketManager.notifyControlSocketsPlayerCount(playerCount);
		});
		this.game.onPlayerScoreReported((score) => {
			this.websocketManager.notifyControlSocketsPlayerScore(score);
		});
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

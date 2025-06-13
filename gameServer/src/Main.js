import { ApplicationLoop } from "./ApplicationLoop.js";
import { Game } from "./gameplay/Game.js";
import { WebSocketManager } from "./WebSocketManager.js";

export class Main {
	/**
	 * @param {Object} options
	 * @param {number} options.arenaWidth
	 * @param {number} options.arenaHeight
	 * @param {number} [options.pitWidth] pit is specific to arena gamemode and refers to the thing in the middle of the arena.
	 * @param {number} [options.pitHeight] pit is specific to arena gamemode and refers to the thing in the middle of the arena.
	 * @param {import("./gameplay/Game.js").GameModes} [options.gameMode]
	 */
	constructor({
		arenaWidth,
		arenaHeight,
		pitWidth = 16,
		pitHeight = 16,
		gameMode = "default",
	}) {
		this.applicationLoop = new ApplicationLoop(this);
		this.game = new Game(this.applicationLoop, this, {
			arenaWidth,
			arenaHeight,
			pitWidth,
			pitHeight,
			gameMode,
		});
		this.websocketManager = new WebSocketManager(this.game);
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

/** @typedef {"default" | "teams"} GameModes */

import { Arena } from "./Arena.js";
import { Player } from "./Player.js";

export class Game {
	#arena;

	get arena() {
		return this.#arena;
	}

	/**
	 * @param {Object} options
	 * @param {number} [options.arenaWidth]
	 * @param {number} [options.arenaHeight]
	 * @param {GameModes} [options.gameMode]
	 */
	constructor({
		arenaWidth = 600,
		arenaHeight = 600,
		gameMode = "default",
	} = {}) {
		this.#arena = new Arena(arenaWidth, arenaHeight);
	}

	/**
	 * @param {number} now
	 * @param {number} dt
	 */
	loop(now, dt) {
	}

	#lastPlayerId = 1;
	#getNewPlayerId() {
		while (true) {
			this.#lastPlayerId++;
			if (this.#lastPlayerId >= Math.pow(2, 16) - 1) {
				this.#lastPlayerId = 0;
			}
			let exists = false;
			for (const existingId of this.#players.keys()) {
				if (this.#lastPlayerId == existingId) {
					exists = true;
					break;
				}
			}
			if (!exists && this.#lastPlayerId != 0) {
				return this.#lastPlayerId;
			}
		}
	}

	/** @type {Map<number, Player>} */
	#players = new Map();

	createPlayer() {
		const id = this.#getNewPlayerId();
		const player = new Player(id, this);
		this.#players.set(id, player);
		return player;
	}

	/**
	 * @param {Player} player
	 */
	removePlayer(player) {
		this.#players.delete(player.id);
	}

	/**
	 * Gets the type of a tile that can be used for sending to clients.
	 * The returns a number that the client understands and uses to render the correct tile color.
	 * The player argument is used to make sure no tiles from other players appear with
	 * the same color as the tiles owned by the player itself.
	 *
	 * @param {import("./Player.js").Player} player The player that the message will be sent to.
	 * @param {number} x X coordinate of the tile
	 * @param {number} y Y coordinate of the tile
	 */
	getTileTypeForMessage(player, x, y) {
		const tileValue = this.arena.getTileValue(x, y);
		if (tileValue == -1) {
			return 0; // edge of the world
		}
		if (tileValue == 0) {
			return 1; // unfilled/grey
		}

		const tilePlayer = this.#players.get(tileValue);
		if (!tilePlayer) {
			throw new Error("Assertion failed, the tile points to a non existent player");
		}

		const colorId = tilePlayer.skinIdForPlayer(player) + 2;
		return colorId;
	}
}

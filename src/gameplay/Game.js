/** @typedef {"default" | "teams"} GameModes */

import { Vec2 } from "renda";
import { Arena } from "./Arena.js";
import { Player } from "./Player.js";
import { WebSocketConnection } from "../WebSocketConnection.js";

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

	/**
	 * @param {WebSocketConnection} connection
	 */
	createPlayer(connection) {
		const id = this.#getNewPlayerId();
		const player = new Player(id, this, connection);
		this.#players.set(id, player);
		this.#broadcastPosition(player);
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
	 * @param {Vec2} pos
	 */
	getTileTypeForMessage(player, pos) {
		const tileValue = this.arena.getTileValue(pos);
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

	/**
	 * Yields a list of players whose viewport contain (part of) the provided rect.
	 * @param {import("./Arena.js").Rect} rect
	 */
	*getOverlappingViewportPlayersForRect(rect) {
		for (const player of this.#players.values()) {
			const viewport = player.getUpdatesViewport();
			if (
				rect.max.x < viewport.min.x || viewport.max.x < rect.min.x || rect.max.y < viewport.min.y ||
				viewport.max.y < rect.min.y
			) {
				continue;
			}

			yield player;
		}
	}

	/**
	 * @param {Vec2} pos
	 */
	*getOverlappingViewportPlayersForPos(pos) {
		yield* this.getOverlappingViewportPlayersForRect({
			min: pos.clone(),
			max: pos.clone(),
		});
	}

	/**
	 * Sends the position of a player to all nearby players.
	 * @param {import("./Player.js").Player} player
	 */
	#broadcastPosition(player) {
		// TODO: Cache the list of nearby players
		for (const nearbyPlayer of this.getOverlappingViewportPlayersForPos(player.snappedPos)) {
			const playerId = player == nearbyPlayer ? 0 : player.id;
			nearbyPlayer.connection.sendPlayerState(player.snappedPos.x, player.snappedPos.y, playerId, "up", null);
		}
	}
}

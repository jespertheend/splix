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
		this.#arena.onRectFilled((rect, tileValue) => {
			for (const player of this.getOverlappingViewportPlayersForRect(rect)) {
				const tileType = this.getTileTypeForMessage(player, tileValue);
				player.connection.sendFillRect(rect, tileType, 1);
			}
		});
	}

	/**
	 * @param {number} now
	 * @param {number} dt
	 */
	loop(now, dt) {
		for (const player of this.#players.values()) {
			player.loop(now, dt);
		}
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
		this.broadcastPlayerState(player);
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
	 * @param {number} tileValue
	 */
	getTileTypeForMessage(player, tileValue) {
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
	 * @param {import("./util.js").Rect} rect
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
	 * @param {Vec2} pos
	 */
	*getOverlappingTrailBoundsPlayers(pos) {
		for (const player of this.#players.values()) {
			if (player.pointIsInTrailBounds(pos)) yield player;
		}
	}

	/**
	 * Sends the position and direction of a player to all nearby players.
	 * @param {import("./Player.js").Player} player
	 */
	broadcastPlayerState(player) {
		// TODO: Cache the list of nearby players
		const position = player.getPosition();
		for (const nearbyPlayer of this.getOverlappingViewportPlayersForPos(position)) {
			const playerId = player == nearbyPlayer ? 0 : player.id;
			nearbyPlayer.connection.sendPlayerState(
				position.x,
				position.y,
				playerId,
				player.currentDirection,
			);
		}
	}

	/**
	 * Sends the current trail of a player to all nearby players.
	 * @param {import("./Player.js").Player} player
	 */
	broadcastPlayerTrail(player) {
		const message = WebSocketConnection.createTrailMessage(player.id, Array.from(player.getTrailVertices()));
		for (const nearbyPlayer of this.getOverlappingViewportPlayersForPos(player.getPosition())) {
			if (nearbyPlayer == player) {
				// The client that owns the player should receive 0 as player id
				const samePlayerMessage = WebSocketConnection.createTrailMessage(
					0,
					Array.from(player.getTrailVertices()),
				);
				nearbyPlayer.connection.send(samePlayerMessage);
			} else {
				nearbyPlayer.connection.send(message);
			}
		}
	}

	/**
	 * Notifies nearby players that this player died.
	 * @param {import("./Player.js").Player} player
	 * @param {boolean} sendPosition Whether to let the client know about the location of the player's death.
	 */
	broadcastPlayerDeath(player, sendPosition) {
		const position = sendPosition ? player.getPosition() : null;
		const message = WebSocketConnection.createPlayerDieMessage(player.id, position);
		for (const nearbyPlayer of this.getOverlappingViewportPlayersForPos(player.getPosition())) {
			if (nearbyPlayer == player) {
				// The client that owns the player should receive 0 as player id
				const samePlayerMessage = WebSocketConnection.createPlayerDieMessage(0, position);
				nearbyPlayer.connection.send(samePlayerMessage);
			} else {
				nearbyPlayer.connection.send(message);
			}
		}
	}

	/**
	 * Notifies nearby players to render a hit line animation at a specific point.
	 * @param {import("./Player.js").Player} player The player that was hit.
	 * @param {import("./Player.js").Player} hitByPlayer The player that caused the hit.
	 */
	broadcastHitLineAnimation(player, hitByPlayer) {
		const position = hitByPlayer.getPosition();
		const didHitSelf = player == hitByPlayer;
		const message = WebSocketConnection.createHitLineMessage(player.id, 0, position, didHitSelf);
		for (const nearbyPlayer of this.getOverlappingViewportPlayersForPos(position)) {
			if (nearbyPlayer == player) {
				// The client that owns the player should receive 0 as player id
				const samePlayerMessage = WebSocketConnection.createHitLineMessage(0, 0, position, didHitSelf);
				nearbyPlayer.connection.send(samePlayerMessage);
			} else {
				nearbyPlayer.connection.send(message);
			}
		}
	}
}

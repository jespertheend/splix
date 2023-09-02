/** @typedef {"default" | "teams"} GameModes */

import { lerp, Vec2 } from "renda";
import { Arena } from "./Arena.js";
import { Player } from "./Player.js";
import { WebSocketConnection } from "../WebSocketConnection.js";
import { PLAYER_SPAWN_RADIUS } from "../config.js";

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
	} = {}) {
		this.#arena = new Arena(arenaWidth, arenaHeight);
		this.#arena.onRectFilled((rect, tileValue) => {
			for (const player of this.getOverlappingViewportPlayersForRect(rect)) {
				const { colorId, patternId } = this.getTileTypeForMessage(player, tileValue);
				player.connection.sendFillRect(rect, colorId, patternId);
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

	#lastPlayerId = 0;
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
	 * @param {import("./Player.js").CreatePlayerOptions} playerOptions
	 */
	createPlayer(connection, playerOptions) {
		const id = this.#getNewPlayerId();
		const player = new Player(id, this, connection, playerOptions);
		this.#players.set(id, player);
		this.broadcastPlayerState(player);
		return player;
	}

	/**
	 * @returns {{position: Vec2, direction: import("./Player.js").Direction}}
	 */
	getNewSpawnPosition() {
		const position = new Vec2(
			Math.floor(lerp(PLAYER_SPAWN_RADIUS + 1, this.arena.width - PLAYER_SPAWN_RADIUS - 1, Math.random())),
			Math.floor(lerp(PLAYER_SPAWN_RADIUS + 1, this.arena.height - PLAYER_SPAWN_RADIUS - 1, Math.random())),
		);
		/** @type {{direction: import("./Player.js").Direction, distance: number}[]} */
		const wallDistances = [
			{
				direction: "up",
				distance: this.arena.height - position.y,
			},
			{
				direction: "down",
				distance: position.y,
			},
			{
				direction: "right",
				distance: position.x,
			},
			{
				direction: "left",
				distance: this.arena.width - position.x,
			},
		];
		let closestWall = null;
		for (const wall of wallDistances) {
			if (!closestWall || wall.distance < closestWall.distance) {
				closestWall = wall;
			}
		}
		return {
			position,
			direction: closestWall?.direction || "up",
		};
	}

	/**
	 * @param {Player} player
	 */
	removePlayer(player) {
		player.removedFromGame();
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
	 * @returns {{colorId: number, patternId: number}}
	 */
	getTileTypeForMessage(player, tileValue) {
		if (tileValue == -1) {
			return {
				colorId: 0, // edge of the world
				patternId: 0,
			};
		}
		if (tileValue == 0) {
			return {
				colorId: 1, // unfilled/grey
				patternId: 0,
			};
		}

		const tilePlayer = this.#players.get(tileValue);
		if (!tilePlayer) {
			throw new Error("Assertion failed, the tile points to a non existent player");
		}

		const colorId = tilePlayer.skinColorIdForPlayer(player) + 1;
		return {
			colorId,
			patternId: tilePlayer.skinPatternId,
		};
	}

	/**
	 * Yields a list of players whose viewport contain (part of) the provided rect.
	 * @param {import("../util/util.js").Rect} rect
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
	 * Yields a list of players whose viewport contain the provided point.
	 * @param {Vec2} pos
	 */
	*getOverlappingViewportPlayersForPos(pos) {
		yield* this.getOverlappingViewportPlayersForRect({
			min: pos.clone(),
			max: pos.clone(),
		});
	}

	/**
	 * Yields a list of players that are either inside the provided rect,
	 * or have a part of their trail inside the rect.
	 * @param {import("../util/util.js").Rect} rect
	 */
	*getOverlappingTrailBoundsPlayersForRect(rect) {
		for (const player of this.#players.values()) {
			const trailBounds = player.getTrailBounds();
			if (
				rect.max.x < trailBounds.min.x || trailBounds.max.x < rect.min.x || rect.max.y < trailBounds.min.y ||
				trailBounds.max.y < rect.min.y
			) {
				continue;
			}

			yield player;
		}
	}

	/**
	 * @param {Vec2} pos
	 */
	*getOverlappingTrailBoundsPlayersForPos(pos) {
		yield* this.getOverlappingTrailBoundsPlayersForRect({
			min: pos.clone(),
			max: pos.clone(),
		});
	}

	/**
	 * Sends the position and direction of a player to all nearby players.
	 * @param {import("./Player.js").Player} player
	 */
	broadcastPlayerState(player) {
		const bounds = player.getTrailBounds();
		for (const nearbyPlayer of this.getOverlappingViewportPlayersForRect(bounds)) {
			player.sendPlayerStateToPlayer(nearbyPlayer);
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
		for (const nearbyPlayer of this.getOverlappingViewportPlayersForPos(position)) {
			const pointsColorId = player.skinColorIdForPlayer(nearbyPlayer);
			const hitByPlayerId = nearbyPlayer == hitByPlayer ? 0 : hitByPlayer.id;
			const message = WebSocketConnection.createHitLineMessage(
				hitByPlayerId,
				pointsColorId,
				position,
				didHitSelf,
			);
			nearbyPlayer.connection.send(message);
		}
	}

	/**
	 * @param {import("./Player.js").Player} player
	 * @param {number} honkDuration
	 */
	broadcastHonk(player, honkDuration) {
		const message = WebSocketConnection.createHonkMessage(player.id, honkDuration);
		for (const nearbyPlayer of this.getOverlappingViewportPlayersForPos(player.getPosition())) {
			if (nearbyPlayer == player) continue;
			nearbyPlayer.connection.send(message);
		}
	}
}

import { WebSocketConnection } from "../WebSocketConnection.js";
import {
	MIN_TILES_VIEWPORT_RECT_SIZE,
	PLAYER_TRAVEL_SPEED,
	SKINS_COUNT,
	UPDATES_VIEWPORT_RECT_SIZE,
	VALID_SKIN_COLOR_RANGE,
	VIEWPORT_EDGE_CHUNK_SIZE,
} from "../config.js";
import { lerp, Vec2 } from "renda";
import { checkTrailSegment } from "../util/util.js";

/**
 * When sent inside messages, these translate to an integer:
 * - right - 0
 * - down - 1
 * - left - 2
 * - up - 3
 * - paused - 4
 * @typedef {"right" | "down" | "left" | "up" | "paused"} Direction
 */

/** @typedef {"player" | "area-bounds" | "self"} DeathType */

/**
 * @typedef SkinData
 * @property {number} colorId
 * @property {number} patternId
 */

/**
 * @typedef CreatePlayerOptions
 * @property {SkinData?} skin
 * @property {string} name
 */

export class Player {
	#id;
	#game;
	#connection;

	#currentTileType = 0;

	/**
	 * The current position of the player, rounded to the coordinate of the current tile.
	 */
	#currentPosition;

	/**
	 * Returns the current position of the player, rounded to the coordinate of the current tile.
	 */
	getPosition() {
		return this.#currentPosition.clone();
	}

	/**
	 * The X position of the player when the most recent horizontal edge chunk was sent to the client.
	 * If the player moves too far away from this position, a new edge chunk will be sent.
	 */
	#lastEdgeChunkSendX;

	/**
	 * The Y position of the player when the most recent vertical edge chunk was sent to the client.
	 * If the player moves too far away from this position, a new edge chunk will be sent.
	 */
	#lastEdgeChunkSendY;

	/**
	 * Indicates how many tiles the player has moved on the client side.
	 * Any value below 1 means the player is still on its current tile.
	 * Any value above 1 means the player has travelled that many tiles, each of which should
	 * be checked for updates to their trail etc.
	 */
	#nextTileProgress = 0;

	/** @type {Direction} */
	#currentDirection = "up";

	get currentDirection() {
		return this.#currentDirection;
	}

	/** @type {Vec2[]} */
	#trailVertices = [];

	get isGeneratingTrail() {
		return this.#trailVertices.length > 0;
	}

	/**
	 * The bounding box of the current trail, used for hit detection with other players
	 * and determining which players are inside another player's viewport.
	 * @type {import("../util/util.js").Rect}
	 */
	#trailBounds = {
		min: new Vec2(),
		max: new Vec2(),
	};

	/**
	 * @typedef MovementQueueItem
	 * @property {Direction} direction The direction in which the player started moving.
	 * @property {Vec2} desiredPosition The location at which the player wishes to start moving. If the player
	 * has already moved past this point, we could also move them back in time in order to fulfill their request.
	 */

	/** @type {MovementQueueItem[]} */
	#movementQueue = [];

	/**
	 * @typedef DeathState
	 * @property {number} dieTime
	 * @property {DeathType} type
	 */

	/** @type {DeathState?} */
	#lastDeathState = null;
	get dead() {
		return Boolean(this.#lastDeathState);
	}

	#permanentlyDead = false;
	#permanentlyDieTime = 0;

	#skinColorId = 0;
	#skinPatternId = 0;
	#name = "";

	/**
	 * The list of other players that this player currently has in their viewport.
	 * We use this to keep track of when new players have entered this player's viewport.
	 * That way we can send stuff like the skin and player name.
	 * @type {Set<Player>}
	 */
	#playersInViewport = new Set();

	/**
	 * A list of other players for which this player is currently in their viewport.
	 * We use this to notify other players that they are no longer observing this player.
	 * @type {Set<Player>}
	 */
	#inOtherPlayerViewports = new Set();

	/**
	 * @param {number} id
	 * @param {import("./Game.js").Game} game
	 * @param {WebSocketConnection} connection
	 * @param {CreatePlayerOptions} options
	 */
	constructor(id, game, connection, options) {
		this.#id = id;
		this.#game = game;
		this.#connection = connection;

		if (options.skin) {
			this.#skinColorId = options.skin.colorId;
			this.#skinPatternId = options.skin.patternId;
		}
		this.#name = options.name;
		if (this.#skinColorId == 0) {
			this.#skinColorId = Math.floor(lerp(1, VALID_SKIN_COLOR_RANGE, Math.random()));
		}

		this.#currentPosition = game.getNewSpawnPosition();
		this.#lastEdgeChunkSendX = this.#currentPosition.x;
		this.#lastEdgeChunkSendY = this.#currentPosition.y;
		this.#currentPositionChanged();

		game.arena.fillPlayerSpawn(this.#currentPosition, id);
	}

	get id() {
		return this.#id;
	}

	get game() {
		return this.#game;
	}

	get connection() {
		return this.#connection;
	}

	get skinColorId() {
		return this.#skinColorId;
	}

	get skinPatternId() {
		return this.#skinPatternId;
	}

	/**
	 * Returns a rect defining the area for which events should be sent to this player.
	 * @returns {import("../util/util.js").Rect}
	 */
	getUpdatesViewport() {
		return {
			min: this.#currentPosition.clone().addScalar(-UPDATES_VIEWPORT_RECT_SIZE),
			max: this.#currentPosition.clone().addScalar(UPDATES_VIEWPORT_RECT_SIZE),
		};
	}

	/**
	 * Returns the bounding box of the trail of the player.
	 * If the player doesn't have a trail, the bounding box is just the player's position.
	 */
	getTrailBounds() {
		return {
			min: this.#trailBounds.min.clone(),
			max: this.#trailBounds.max.clone(),
		};
	}

	/**
	 * The client requested a new position and direction for its player.
	 * The request will be added to a queue and might not immediately get parsed.
	 * @param {Direction} direction
	 * @param {Vec2} desiredPosition
	 */
	clientPosUpdateRequested(direction, desiredPosition) {
		this.#movementQueue.push({
			direction,
			desiredPosition,
		});
		this.#drainMovementQueue();
	}

	/**
	 * @param {SkinData} skinData
	 */
	setSkin({ colorId, patternId }) {
		this.#skinColorId = colorId;
		this.#skinPatternId = patternId;
	}

	/**
	 * Tries to empty the movement queue until an item is encountered for which the player hasn't reached its location yet.
	 */
	#drainMovementQueue() {
		while (true) {
			if (this.#movementQueue.length <= 0) return;
			const firstItem = this.#movementQueue[0];
			const valid = this.#checkNextMoveValidity(firstItem.desiredPosition, firstItem.direction);
			if (!valid) {
				this.#movementQueue.shift();
				continue;
			}

			this.#movementQueue.shift();
			this.#currentPosition.set(firstItem.desiredPosition);
			if (this.isGeneratingTrail) {
				this.#trailVertices.push(firstItem.desiredPosition.clone());
			}
			this.#currentDirection = firstItem.direction;
			this.game.broadcastPlayerState(this);
		}
	}

	/**
	 * Sends the state of this player to `receivingPlayer`.
	 * @param {import("./Player.js").Player} receivingPlayer
	 */
	sendPlayerStateToPlayer(receivingPlayer) {
		const playerId = this == receivingPlayer ? 0 : this.id;
		receivingPlayer.connection.sendPlayerState(
			this.#currentPosition.x,
			this.#currentPosition.y,
			playerId,
			this.#currentDirection,
		);
	}

	/**
	 * Sends the state of this player to `receivingPlayer`.
	 * @param {import("./Player.js").Player} receivingPlayer
	 */
	sendTrailToPlayer(receivingPlayer) {
		const playerId = this == receivingPlayer ? 0 : this.id;
		const message = WebSocketConnection.createTrailMessage(playerId, Array.from(this.#trailVertices));
		receivingPlayer.connection.send(message);
	}

	/**
	 * Checks if this is a valid next move, and if not, returns the reason why it's invalid.
	 * @param {Vec2} desiredPosition
	 * @param {Direction} newDirection
	 */
	#checkNextMoveValidity(desiredPosition, newDirection) {
		// If the player is already moving in the same or opposite direction
		if (
			(this.#currentDirection == "right" || this.#currentDirection == "left") &&
			(newDirection == "right" || newDirection == "left")
		) {
			return false;
		}
		if (
			(this.#currentDirection == "up" || this.#currentDirection == "down") &&
			(newDirection == "up" || newDirection == "down")
		) {
			return false;
		}
		if (this.#currentDirection == newDirection) return false;

		// Pausing should always be allowed, if the provided position is invalid
		// it will be adjusted later
		if (newDirection == "paused") return true;

		// Finally we'll make sure the desiredPosition is aligned with the current direction of movement
		if (this.#currentDirection == "left" || this.#currentDirection == "right") {
			if (desiredPosition.y != this.#currentPosition.y) return false;
		}
		if (this.#currentDirection == "up" || this.#currentDirection == "down") {
			if (desiredPosition.x != this.#currentPosition.x) return false;
		}

		return true;
	}

	/**
	 * Returns an integer that a client can use to render the correct color for this player or one of its tiles.
	 * When two players have the same color, a different integer is returned to make sure a
	 * player doesn't see any players with their own color.
	 * The returned value ranges from 0 to (SKINS_COUNT - 1).
	 * @param {Player} otherPlayer The player that the message will be sent to.
	 */
	skinColorIdForPlayer(otherPlayer) {
		if (this.#skinColorId != otherPlayer.skinColorId || otherPlayer == this) {
			return this.#skinColorId;
		} else {
			// The color of this player is the same as my color, we'll generate a random color (that is not mine)
			let fakeSkinId = this.id % (SKINS_COUNT - 1); //ranges from 0 to (SKINS_COUNT - 2)
			if (fakeSkinId >= otherPlayer.skinColorId - 1) {
				fakeSkinId++; //make the value range from 0 to (SKINS_COUNT - 1) but exclude otherPlayer.skinId
			}
			return fakeSkinId;
		}
	}

	*getTrailVertices() {
		for (const vertex of this.#trailVertices) {
			yield vertex.clone();
		}
	}

	/**
	 * @param {number} now
	 * @param {number} dt
	 */
	loop(now, dt) {
		if (this.currentDirection != "paused" && !this.dead) {
			this.#nextTileProgress += dt * PLAYER_TRAVEL_SPEED;
			while (this.#nextTileProgress > 1) {
				this.#nextTileProgress -= 1;
				if (this.currentDirection == "left") {
					this.#currentPosition.x -= 1;
				} else if (this.currentDirection == "right") {
					this.#currentPosition.x += 1;
				} else if (this.currentDirection == "up") {
					this.#currentPosition.y -= 1;
				} else if (this.currentDirection == "down") {
					this.#currentPosition.y += 1;
				}
				this.#currentPositionChanged();
				this.#updateCurrentTile();
			}
		}

		if (this.#lastDeathState) {
			const dt = performance.now() - this.#lastDeathState.dieTime;
			if (dt > 600) {
				this.#permanentlyDie();
			}
		}
		if (this.#permanentlyDead) {
			const dt = performance.now() - this.#permanentlyDieTime;
			if (dt > 5_000) {
				this.connection.close();
			}
		}
	}

	#currentPositionChanged() {
		// Update the trailbounds
		if (this.isGeneratingTrail) {
			this.#trailBounds.min.x = Math.min(this.#trailBounds.min.x, this.#currentPosition.x);
			this.#trailBounds.min.y = Math.min(this.#trailBounds.min.y, this.#currentPosition.y);
			this.#trailBounds.max.x = Math.max(this.#trailBounds.max.x, this.#currentPosition.x);
			this.#trailBounds.max.y = Math.max(this.#trailBounds.max.y, this.#currentPosition.y);
		} else {
			this.#trailBounds.min = this.#currentPosition.clone();
			this.#trailBounds.max = this.#currentPosition.clone();
		}

		{
			// Check if any new players entered or left our viewport
			let leftPlayers = new Set([...this.#playersInViewport]);
			for (const player of this.game.getOverlappingTrailBoundsPlayersForRect(this.getUpdatesViewport())) {
				leftPlayers.delete(player);
				this.#playerAddedToViewport(player);
			}
			for (const player of leftPlayers) {
				this.#playerRemovedFromViewport(player);
			}

			// Check if we moved in or out of someone elses viewport
			leftPlayers = new Set([...this.#inOtherPlayerViewports]);
			for (const player of this.game.getOverlappingViewportPlayersForRect(this.getTrailBounds())) {
				leftPlayers.delete(player);
				this.#inOtherPlayerViewports.add(player);
				player.#playerAddedToViewport(this);
			}
			for (const player of leftPlayers) {
				this.#inOtherPlayerViewports.delete(player);
				player.#playerRemovedFromViewport(this);
			}
		}

		// Check if we touch the edge of the map.
		if (
			this.#currentPosition.x <= 0 || this.#currentPosition.y <= 0 ||
			this.#currentPosition.x >= this.game.arena.width - 1 ||
			this.#currentPosition.y >= this.game.arena.height - 1
		) {
			this.die("area-bounds", true);
		}

		// Check if we are touching someone's trail.
		for (const player of this.game.getOverlappingTrailBoundsPlayersForPos(this.#currentPosition)) {
			const includeLastSegment = player != this;
			if (player.pointIsInTrail(this.#currentPosition, { includeLastSegment })) {
				const killedSelf = player == this;
				player.die(killedSelf ? "self" : "player", killedSelf);
				this.game.broadcastHitLineAnimation(player, this);
			}
		}

		// Send new sections of the map when needed.
		this.#sendRequiredEdgeChunks();
	}

	/**
	 * Another player just moved into our viewport, or we moved closer to another player.
	 * We need to notify the client of their skin and name etc.
	 * @param {Player} player
	 */
	#playerAddedToViewport(player) {
		if (this.#playersInViewport.has(player)) return;
		this.#playersInViewport.add(player);
		player.sendPlayerStateToPlayer(this);
		const colorId = player.skinColorIdForPlayer(this);
		const playerId = player == this ? 0 : player.id;
		this.#connection.sendPlayerSkin(playerId, colorId);
		this.#connection.sendPlayerName(playerId, player.#name);
		player.sendTrailToPlayer(this);
	}

	/**
	 * Another player just moved out of our viewport, or we moved away from it.
	 * We need to notify the client that they can stop rendering this player.
	 * @param {Player} player
	 */
	#playerRemovedFromViewport(player) {
		if (this.#removedFromGame) return;
		if (!this.#playersInViewport.has(player)) return;
		this.#playersInViewport.delete(player);
		this.#connection.sendRemovePlayer(player.id);
	}

	#sendRequiredEdgeChunks() {
		const chunkSize = VIEWPORT_EDGE_CHUNK_SIZE;
		const viewportSize = MIN_TILES_VIEWPORT_RECT_SIZE;
		/** @type {{x: number, y: number, w: number, h: number} | null} */
		let chunk = null;
		if (this.#currentPosition.x >= this.#lastEdgeChunkSendX + chunkSize) {
			chunk = {
				x: this.#currentPosition.x + viewportSize,
				y: this.#lastEdgeChunkSendY - viewportSize - chunkSize,
				w: chunkSize,
				h: (viewportSize + chunkSize) * 2,
			};
			this.#lastEdgeChunkSendX = this.#currentPosition.x;
		}
		if (this.#currentPosition.x <= this.#lastEdgeChunkSendX - chunkSize) {
			chunk = {
				x: this.#currentPosition.x - viewportSize - chunkSize,
				y: this.#lastEdgeChunkSendY - viewportSize - chunkSize,
				w: chunkSize,
				h: (viewportSize + chunkSize) * 2,
			};
			this.#lastEdgeChunkSendX = this.#currentPosition.x;
		}
		if (this.#currentPosition.y >= this.#lastEdgeChunkSendY + chunkSize) {
			chunk = {
				x: this.#lastEdgeChunkSendX - viewportSize - chunkSize,
				y: this.#currentPosition.y + viewportSize,
				w: (viewportSize + chunkSize) * 2,
				h: chunkSize,
			};
			this.#lastEdgeChunkSendY = this.#currentPosition.y;
		}
		if (this.#currentPosition.y <= this.#lastEdgeChunkSendY - chunkSize) {
			chunk = {
				x: this.#lastEdgeChunkSendX - viewportSize - chunkSize,
				y: this.#currentPosition.y - viewportSize - chunkSize,
				w: (viewportSize + chunkSize) * 2,
				h: chunkSize,
			};
			this.#lastEdgeChunkSendY = this.#currentPosition.y;
		}
		if (chunk) {
			const { x, y, w, h } = chunk;
			this.#connection.sendChunk({
				min: new Vec2(x, y),
				max: new Vec2(x + w, y + h),
			});
		}
	}

	/**
	 * Initiates a player death. Though at this point the death is not permanent yet.
	 * The death can still be undone by the player that killed the other player, if it turns out
	 * they moved away just in time before hitting them.
	 *
	 * @param {DeathType} deathType
	 * @param {boolean} sendPosition Whether to let the client know about the location of the player's death.
	 * If the player died from touching their own trail, or the edge of the map, we want to make it clear
	 * that this is what caused their death, so we'll change their position.
	 * But in case the player died from another player, the position doesn't really matter and we'll let the
	 * client decide where to render the player's death, to prevent a sudden change in their position.
	 */
	die(deathType, sendPosition) {
		if (this.#lastDeathState) return;
		this.#lastDeathState = {
			dieTime: performance.now(),
			type: deathType,
		};
		this.game.broadcastPlayerDeath(this, sendPosition);
	}

	#permanentlyDie() {
		if (this.#permanentlyDead) return;
		this.#permanentlyDead = true;
		this.#permanentlyDieTime = performance.now();
		this.#clearAllMyTiles();
		if (!this.#lastDeathState) {
			throw new Error("Assertion failed, no death state is set");
		}
		this.connection.sendGameOver(0, 0, 0, 0, 0, this.#lastDeathState.type, "");
	}

	/**
	 * If true, the player is no longer in game and
	 * updates should no longer be sent since the connection is likely already closed.
	 */
	#removedFromGame = false;

	removedFromGame() {
		this.#removedFromGame = true;
		this.#clearAllMyTiles();
		for (const player of this.#inOtherPlayerViewports) {
			player.#playerRemovedFromViewport(this);
		}
	}

	#allMyTilesCleared = false;

	/**
	 * Resets all owned tiles of this player back to tiles that are not owned by anyone.
	 * This can only be called once, so after this has been called, no attempts should be
	 * made to add new tiles of this player to the arena.
	 */
	#clearAllMyTiles() {
		if (this.#allMyTilesCleared) return;
		this.#allMyTilesCleared = true;
		this.game.arena.clearAllPlayerTiles(this.id);
	}

	/**
	 * @param {Vec2} point
	 */
	rectOverlapsTrailBounds(point) {
		const bounds = this.#trailBounds;
		return point.x >= bounds.min.x && point.y >= bounds.min.y && point.x <= bounds.max.x && point.y <= bounds.max.y;
	}

	/**
	 * @param {Vec2} point
	 * @param {Object} options
	 * @param {boolean} [options.includeLastSegment] When true, also checks if the point lies between the
	 * last segment and the current position of the player. If the player is not generating a trail,
	 * this checks if the point lies at the exact location of the current player.
	 */
	pointIsInTrail(point, {
		includeLastSegment = true,
	} = {}) {
		if (this.isGeneratingTrail) {
			for (let i = 0; i < this.#trailVertices.length - 1; i++) {
				const start = this.#trailVertices[i];
				const end = this.#trailVertices[i + 1];
				if (checkTrailSegment(point, start, end)) return true;
			}
			if (includeLastSegment) {
				const last = this.#trailVertices.at(-1);
				if (!last) throw new Error("Assertion failed, no trail exists");
				if (checkTrailSegment(point, last, this.#currentPosition)) return true;
			}
			return false;
		} else {
			if (includeLastSegment) {
				return point.x == this.#currentPosition.x && point.y == this.#currentPosition.y;
			}
			return false;
		}
	}

	/**
	 * Checks if the type of the tile the player is currently on has changed.
	 * This can happen either because the player moved to a new coordinate,
	 * or because the current tile type got changed to that of another player.
	 */
	#updateCurrentTile() {
		const tileValue = this.#game.arena.getTileValue(this.#currentPosition);
		if (this.#currentTileType != tileValue) {
			// When the player moves out of their captured area, we will start a new trail.
			if (tileValue != this.#id && !this.isGeneratingTrail) {
				this.#trailVertices.push(this.#currentPosition.clone());
				this.game.broadcastPlayerTrail(this);
			}

			// When the player comes back into their captured area, we add a final vertex to the trail,
			// Then fill the tiles underneath the trail, and finally clear the trail.
			if (tileValue == this.#id && this.isGeneratingTrail) {
				this.#trailVertices.push(this.#currentPosition.clone());
				if (this.#allMyTilesCleared) {
					throw new Error("Assertion failed, player tiles have already been removed from the arena.");
				}
				this.game.arena.fillPlayerTrail(this.#trailVertices, this.id);
				this.game.arena.updateCapturedArea(this.id, []);
				this.#trailVertices = [];
				this.game.broadcastPlayerTrail(this);
			}

			this.#currentTileType = tileValue;
		}
	}
}

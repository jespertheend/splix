import { WebSocketConnection } from "../WebSocketConnection.js";
import {
	FREE_SKINS_COUNT,
	MAX_UNDO_EVENT_TIME,
	MAX_UNDO_TILE_COUNT,
	MIN_TILES_VIEWPORT_RECT_SIZE,
	PLAYER_TRAVEL_SPEED,
	UPDATES_VIEWPORT_RECT_SIZE,
	VALID_SKIN_COLOR_RANGE,
	VIEWPORT_EDGE_CHUNK_SIZE,
} from "../config.js";
import { lerp, Vec2 } from "renda";
import { checkTrailSegment } from "../util/util.js";
import { PlayerEventHistory } from "./PlayerEventHistory.js";

/**
 * When sent inside messages, these translate to an integer:
 * - right - 0
 * - down - 1
 * - left - 2
 * - up - 3
 * - paused - 4
 * @typedef {"right" | "down" | "left" | "up" | "paused"} Direction
 */

/**
 * @typedef {Exclude<Direction, "paused">} UnpausedDirection
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
	#currentDirection = "paused";
	/**
	 * The direction the player was moving in before they paused.
	 * Or the current direction if the player is not currently paused.
	 * @type {Exclude<Direction, "paused">}
	 */
	#lastUnpausedDirection = "up";

	get currentDirection() {
		return this.#currentDirection;
	}

	/**
	 * We want to allow clients to jump back slightly, but in order to prevent cheaters from abusing this,
	 * we'll keep track of the last valid position we received from the client.
	 * We'll use this in combination with the lastUnpausedDirection to verify that the client
	 * is not trying to move to locations it has never been in the first place.
	 */
	#lastCertainClientPosition;

	/** @type {Vec2[]} */
	#trailVertices = [];

	#currentTrailLengthExcludingPos = 0;

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

	#eventHistory = new PlayerEventHistory();

	#capturedTileCount = 0;
	#maxCapturedTileCount = 0;
	#killCount = 0;
	#rank;
	#highestRank;
	#joinTime;
	#isCurrentlyRankingFirst = false;
	#rankingFirstStartTime = 0;
	#rankingFirstSeconds = 0;
	#maxTrailLength = 0;

	/**
	 * @typedef DeathState
	 * @property {number} dieTime
	 * @property {DeathType} type
	 * @property {string} killerName
	 */

	/** @type {DeathState?} */
	#lastDeathState = null;
	get dead() {
		return Boolean(this.#lastDeathState);
	}

	#permanentlyDead = false;
	#permanentlyDieTime = 0;
	get permanentlyDead() {
		return this.#permanentlyDead;
	}

	#skinColorId = 0;
	#skinPatternId = 0;
	#name = "";
	get name() {
		return this.#name;
	}

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
			this.#skinColorId = Math.floor(lerp(1, FREE_SKINS_COUNT + 1, Math.random()));
		}

		const { position, direction } = game.getNewSpawnPosition();
		this.#currentPosition = position;
		this.#currentDirection = direction;
		this.#lastUnpausedDirection = direction;
		this.#lastEdgeChunkSendX = this.#currentPosition.x;
		this.#lastEdgeChunkSendY = this.#currentPosition.y;
		this.#lastCertainClientPosition = position.clone();
		this.#currentPositionChanged();

		this.#eventHistory.onUndoEvent((event) => {
			if (event.type == "kill-player") {
				this.game.undoPlayerDeath(event.playerId);
				if (event.deathType != "area-bounds") {
					this.#killCount--;
					this.#killCount = Math.max(0, this.#killCount);
					this.#sendMyScore();
				}
			} else if (event.type == "start-trail") {
				// The player started creating a trail, we reset it in order to prevent
				// the tiles underneath the trail from getting filled as a result of the player
				// returning to their captured area.
				this.#clearTrailVertices();
				this.game.broadcastPlayerTrail(this);
			}
		});

		const capturedTileCount = game.arena.fillPlayerSpawn(this.#currentPosition, id);
		this.#setCapturedTileCount(capturedTileCount);

		this.#joinTime = performance.now();

		// We add one because at this point the current player hasn't been added to the game yet.
		this.#rank = game.getPlayerCount() + 1;
		this.#highestRank = this.#rank;
		this.#sendMyRank();
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
		let lastMoveWasInvalid = false;
		while (this.#movementQueue.length > 0) {
			const firstItem = this.#movementQueue[0];
			const validity = this.#checkNextMoveValidity(firstItem.desiredPosition, firstItem.direction);
			if (validity == "invalid") {
				this.#movementQueue.shift();
				lastMoveWasInvalid = true;
				continue;
			} else {
				lastMoveWasInvalid = false;
			}

			let desiredPosition = firstItem.desiredPosition;
			if (validity == "valid-direction") {
				desiredPosition = this.#currentPosition.clone();
			}

			if (this.#isFuturePosition(desiredPosition)) {
				// The position is valid, but the player hasn't reached this location yet.
				// We'll wait until the player is there, and then handle it accordingly.
				// If we handle the movement item now, we would allow players to teleport ahead and move very fast.
				return;
			}

			this.#movementQueue.shift();
			let previousPosition = this.#currentPosition.clone();
			this.#currentPosition.set(desiredPosition);
			this.#lastCertainClientPosition.set(desiredPosition);
			if (this.isGeneratingTrail) {
				this.#addTrailVertex(desiredPosition);
			}
			this.#currentDirection = firstItem.direction;
			if (firstItem.direction != "paused") {
				this.#lastUnpausedDirection = firstItem.direction;
			}
			this.#eventHistory.undoRecentEvents(previousPosition, this.#currentPosition);
			this.game.broadcastPlayerState(this);
			this.#updateCurrentTile(this.#currentPosition);
			this.#currentPositionChanged();
		}

		// If the last move was invalid, we want to let the client know so they can
		// teleport the player to the correct position so that it stays in sync with the position on the server
		if (lastMoveWasInvalid) {
			this.sendPlayerStateToPlayer(this);
		}
	}

	/**
	 * Adds a vertex to the current trail, deduplicating any unnecessary vertices.
	 * Throws when a diagonal vertex is added.
	 * @param {Vec2} pos
	 */
	#addTrailVertex(pos) {
		const lastVertexA = this.#trailVertices.at(-1);
		if (lastVertexA) {
			if (pos.x == lastVertexA.x && pos.y == lastVertexA.y) {
				// The last vertex is already at the same location,
				// we won't do anything to avoid duplicate vertices.
				return;
			}
			if (pos.x != lastVertexA.x && pos.y != lastVertexA.y) {
				throw new Error(
					"Assertion failed: Attempted to add a trail vertex that would result in a diagonal segment.",
				);
			}
			const lastVertexB = this.#trailVertices.at(-2);
			if (lastVertexB) {
				// We check if the previous two vertices are on the same line as the one we're about to add.
				// If so, we modify the last vertex instead of adding a new one.
				if (lastVertexA.x == lastVertexB.x && lastVertexA.x == pos.x) {
					if (pos.y >= lastVertexA.y && pos.y <= lastVertexB.y) {
						throw new Error(
							`Assertion failed: Attempted to add a trail vertex (${pos}) in between two previous vertices. Full trail: ${
								this.#trailVertices.join(" ")
							}`,
						);
					}
					lastVertexA.set(pos);
					return;
				}
				if (lastVertexA.y == lastVertexB.y && lastVertexA.y == pos.y) {
					if (pos.x >= lastVertexA.x && pos.x <= lastVertexB.x) {
						throw new Error(
							`Assertion failed: Attempted to add a trail vertex (${pos}) in between two previous vertices. Full trail: ${
								this.#trailVertices.join(" ")
							}`,
						);
					}
					lastVertexA.set(pos);
					return;
				}
			}
		}
		this.#trailVertices.push(pos.clone());
		this.#updateTrailLengthExcludingPos();
	}

	#clearTrailVertices() {
		this.#trailVertices = [];
		this.#currentTrailLengthExcludingPos = 0;
	}

	#updateTrailLengthExcludingPos() {
		let length = 0;
		for (let i = 0; i < this.#trailVertices.length - 1; i++) {
			const vertexA = this.#trailVertices[i];
			const vertexB = this.#trailVertices[i + 1];
			length += vertexA.distanceTo(vertexB);
		}
		this.#currentTrailLengthExcludingPos = length;
	}

	/**
	 * Returns true if the target is directly in front of the player (based on their current direction of travel).
	 * Returns false if it's either behind the player, or not on the current path of the player.
	 * @param {Vec2} target
	 */
	#isFuturePosition(target) {
		if (target.x == this.#currentPosition.x && target.y == this.#currentPosition.y) return false;
		if (this.#currentDirection == "paused") return false;

		if (this.#currentDirection == "right" && target.x > this.#currentPosition.x) return true;
		if (this.#currentDirection == "left" && target.x < this.#currentPosition.x) return true;
		if (this.#currentDirection == "up" && target.y < this.#currentPosition.y) return true;
		if (this.#currentDirection == "down" && target.y > this.#currentPosition.y) return true;

		return false;
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
	 * Checks if this is a valid next move.
	 * @param {Vec2} desiredPosition
	 * @param {Direction} newDirection
	 * @returns {"valid" | "invalid" | "valid-direction"}
	 */
	#checkNextMoveValidity(desiredPosition, newDirection) {
		// If the player is already moving in the same or opposite direction
		if (
			(this.#currentDirection == "right" || this.#currentDirection == "left") &&
			(newDirection == "right" || newDirection == "left")
		) {
			return "invalid";
		}
		if (
			(this.#currentDirection == "up" || this.#currentDirection == "down") &&
			(newDirection == "up" || newDirection == "down")
		) {
			return "invalid";
		}
		if (this.#currentDirection == newDirection) return "invalid";

		// Prevent the player from going back into their own trail when paused
		if (this.#currentDirection == "paused" && this.isGeneratingTrail) {
			if (this.#lastUnpausedDirection == "right" && newDirection == "left") return "invalid";
			if (this.#lastUnpausedDirection == "left" && newDirection == "right") return "invalid";
			if (this.#lastUnpausedDirection == "up" && newDirection == "down") return "invalid";
			if (this.#lastUnpausedDirection == "down" && newDirection == "up") return "invalid";
		}

		// We'll make sure the desiredPosition is aligned with the current direction of movement
		if (this.#lastUnpausedDirection == "left" || this.#lastUnpausedDirection == "right") {
			if (desiredPosition.y != this.#currentPosition.y) return "valid-direction";
		}
		if (this.#lastUnpausedDirection == "up" || this.#lastUnpausedDirection == "down") {
			if (desiredPosition.x != this.#currentPosition.x) return "valid-direction";
		}

		// If the player is currently paused, the client will always send the current position.
		if (this.#currentDirection == "paused") {
			if (desiredPosition.x != this.#currentPosition.x || desiredPosition.y != this.#currentPosition.y) {
				return "valid-direction";
			}
		}

		// Make sure the client isn't trying to move further back than the last location where it changed direction.
		// We won't allow the client to send something equal to the lastCertainClientPosition,
		// otherwise we would allow players to go so far back that it never made a move in the first place.
		if (
			(this.#lastUnpausedDirection == "left" && desiredPosition.x >= this.#lastCertainClientPosition.x) ||
			(this.#lastUnpausedDirection == "right" && desiredPosition.x <= this.#lastCertainClientPosition.x) ||
			(this.#lastUnpausedDirection == "up" && desiredPosition.y >= this.#lastCertainClientPosition.y) ||
			(this.#lastUnpausedDirection == "down" && desiredPosition.y <= this.#lastCertainClientPosition.y)
		) {
			return "valid-direction";
		}

		// Make sure players don't move back too far
		if (
			Math.abs(this.#currentPosition.x - desiredPosition.x) > MAX_UNDO_TILE_COUNT ||
			Math.abs(this.#currentPosition.y - desiredPosition.y) > MAX_UNDO_TILE_COUNT
		) {
			// Players having a ping higher than 500 should be rare, but when they do,
			// marking the move as "invalid" would mean the player never gets a chance to change their direction.
			// So we'll mark this as "valid-direction" instead.
			// That way only the direction of the movement queue will be used.
			return "valid-direction";
		}

		return "valid";
	}

	/**
	 * Returns an integer that a client can use to render the correct color for this player or one of its tiles.
	 * When two players have the same color, a different integer is returned to make sure a
	 * player doesn't see any players with their own color.
	 * The returned value ranges from 1 to FREE_SKINS_COUNT.
	 * @param {Player} otherPlayer The player that the message will be sent to.
	 */
	skinColorIdForPlayer(otherPlayer) {
		if (this.#skinColorId != otherPlayer.#skinColorId || otherPlayer == this) {
			return this.#skinColorId;
		} else {
			// At this point, the color of this player is the same as my color, we'll generate a random color (that is not mine)
			// The color is not strictly random, but instead we use the id of the player as 'seed',
			// that way the colorId stays consistent when this is called multiple times.

			// The amount of possible colors to choose from.
			// If we are using a free skin then this one cannot be generated, subtract one to exclude it.
			let possibleSkinsCount = FREE_SKINS_COUNT;
			if (this.#skinColorId <= possibleSkinsCount) {
				possibleSkinsCount--;
			}

			// This modulo operator maps 0 to 0, 1 to 1 etc. until possibleSkinsCount is reached, which is mapped to 0 again.
			let fakeSkinId = this.id % possibleSkinsCount;
			// So now fakeSkinId could range anywhere from 0 to (possibleSkinsCount - 1).

			// But we want to exclude 0 from this range, since that colorId represents grey.
			// We 'shift' the range to the right by incrementing it.
			fakeSkinId++;
			// Now fakeSkinId could range anywhere from 1 to possibleSkinsCount.

			// But what we want is to generate any color except the one from the other player.
			// Otherwise we still might end up displaying this player with the same color as that of the client we are sending it to.
			// Which is exactly what we were trying to prevent in the first place.

			// We 'cut' the range in half by shifting only one portion to the right.
			// Only if the the current value is higher than or equal to the color of the other player, will we increment it.
			if (fakeSkinId >= otherPlayer.#skinColorId) {
				fakeSkinId++;
			}
			// Now fakeSkinId could range anywhere from 1 to (otherPlayer.skinId - 1)
			// or from (otherPlayer.skinId + 1) to FREE_SKINS_COUNT.
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
			if (this.#nextTileProgress > 1) {
				this.#nextTileProgress -= 1;

				const previousPosition = this.#currentPosition.clone();
				if (this.currentDirection == "left") {
					this.#currentPosition.x -= 1;
				} else if (this.currentDirection == "right") {
					this.#currentPosition.x += 1;
				} else if (this.currentDirection == "up") {
					this.#currentPosition.y -= 1;
				} else if (this.currentDirection == "down") {
					this.#currentPosition.y += 1;
				}

				try {
					this.#updateCurrentTile(previousPosition);
				} catch (e) {
					console.error(e);
					this.#connection.close();
				}
				this.#currentPositionChanged();
				this.#drainMovementQueue();
			}
		}

		if (this.#lastDeathState) {
			const dt = performance.now() - this.#lastDeathState.dieTime;
			if (dt > MAX_UNDO_EVENT_TIME) {
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

		// Update max trail length
		if (this.isGeneratingTrail) {
			const lastVertex = this.#trailVertices.at(-1);
			if (!lastVertex) throw new Error("Assertion failed, trailVertices is empty");
			const trailLength = lastVertex.distanceTo(this.#currentPosition) + this.#currentTrailLengthExcludingPos;
			this.#maxTrailLength = Math.max(this.#maxTrailLength, trailLength);
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
				player.#playerAddedToViewport(this);
			}
			for (const player of leftPlayers) {
				player.#playerRemovedFromViewport(this);
			}
		}

		// Check if we touch the edge of the map.
		if (
			this.#currentPosition.x <= 0 || this.#currentPosition.y <= 0 ||
			this.#currentPosition.x >= this.game.arena.width - 1 ||
			this.#currentPosition.y >= this.game.arena.height - 1
		) {
			this.#killPlayer(this, "area-bounds");
		}

		// Check if we are touching someone's trail.
		for (const player of this.game.getOverlappingTrailBoundsPlayersForPos(this.#currentPosition)) {
			const includeLastSegments = player != this;
			if (player.pointIsInTrail(this.#currentPosition, { includeLastSegments })) {
				const killedSelf = player == this;
				if (player.dead) continue;

				if (player.isGeneratingTrail || player.#currentDirection == "paused") {
					const success = this.#killPlayer(player, killedSelf ? "self" : "player");
					if (success) {
						this.game.broadcastHitLineAnimation(player, this);
					}
				}

				if (
					!killedSelf &&
					player.#currentPosition.x == this.#currentPosition.x &&
					player.#currentPosition.y == this.#currentPosition.y &&
					this.isGeneratingTrail && player.isGeneratingTrail
				) {
					const success = player.#killPlayer(this, "player");
					if (success) {
						this.game.broadcastHitLineAnimation(this, player);
					}
				}
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
		player.#inOtherPlayerViewports.add(this);
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
		player.#inOtherPlayerViewports.delete(this);
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
			this.sendChunk({
				min: new Vec2(x, y),
				max: new Vec2(x + w, y + h),
			});
		}
	}

	/**
	 * Sends a chunk of tiles from the arena.
	 * @param {import("../util/util.js").Rect} rect The area to send.
	 */
	sendChunk(rect) {
		const chunkData = this.game.getArenaChunkForMessage(rect, this);
		for (const rect of chunkData) {
			this.connection.sendFillRect(rect.rect, rect.tileType.colorId, rect.tileType.patternId);
		}
	}

	/**
	 * Kills another player (or this player itself) and records an event in the event history.
	 * So that the death can be undone should the player move back in time.
	 *
	 * @param {Player} otherPlayer
	 * @param {DeathType} deathType
	 */
	#killPlayer(otherPlayer, deathType) {
		if (otherPlayer.dead) return false;
		this.#eventHistory.addEvent(this.getPosition(), {
			type: "kill-player",
			playerId: otherPlayer.id,
			deathType,
		});
		otherPlayer.#die(deathType, this.name);
		if (deathType != "area-bounds") {
			this.#killCount++;
			this.#sendMyScore();
		}
		return true;
	}

	/**
	 * Initiates a player death. Though at this point the death is not permanent yet.
	 * The death can still be undone by the player that killed the other player, if it turns out
	 * they moved away just in time before hitting them.
	 *
	 * @param {DeathType} deathType
	 * @param {string} killerName
	 */
	#die(deathType, killerName) {
		if (this.#lastDeathState) return;
		this.#lastDeathState = {
			dieTime: performance.now(),
			type: deathType,
			killerName,
		};
		this.game.broadcastPlayerDeath(this);
	}

	undoDie() {
		this.#lastDeathState = null;
		this.game.broadcastUndoPlayerDeath(this);
	}

	#permanentlyDie() {
		if (this.#permanentlyDead) return;
		this.#permanentlyDead = true;
		this.#permanentlyDieTime = performance.now();
		this.#clearAllMyTiles();
		if (!this.#lastDeathState) {
			throw new Error("Assertion failed, no death state is set");
		}
		this.#incrementRankingFirstSeconds();
		const rankingFirstSeconds = Math.round(this.#rankingFirstSeconds / 1000);
		this.connection.sendGameOver(
			this.#capturedTileCount,
			this.#killCount,
			this.#highestRank,
			this.#getTimeAliveSeconds(),
			rankingFirstSeconds,
			this.#lastDeathState.type,
			this.#lastDeathState.type == "player" ? this.#lastDeathState.killerName : "",
		);
	}

	#getTimeAliveSeconds() {
		const timeAliveMs = performance.now() - this.#joinTime;
		return Math.round(timeAliveMs / 1000);
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
	 * Checks if a point is inside the trail of the player.
	 * If the player is not generating a trail,
	 * this checks if the point lies at the exact location of the current player.
	 * @param {Vec2} point
	 * @param {Object} options
	 * @param {boolean} [options.includeLastSegments] When true, also checks if the point lies between the
	 * last two segments and the current position of the player. When checking if the player is touching their own
	 * trail, we need to ignore the last two segments since the player position is always touching the last segment.
	 * If the player made a turn recently, it might also be inside the second to last segment.
	 */
	pointIsInTrail(point, {
		includeLastSegments = true,
	} = {}) {
		if (this.isGeneratingTrail) {
			const verticesLengthOffset = includeLastSegments ? 1 : 2;
			const verticesLength = this.#trailVertices.length - verticesLengthOffset;
			for (let i = 0; i < verticesLength; i++) {
				const start = this.#trailVertices[i];
				const end = this.#trailVertices[i + 1];
				if (checkTrailSegment(point, start, end)) return true;
			}
			if (includeLastSegments) {
				const lastVertex = this.#trailVertices.at(-1);
				if (!lastVertex) throw new Error("Assertion failed, trailVertices is empty");
				if (checkTrailSegment(point, lastVertex, this.#currentPosition)) return true;
			}
			return false;
		} else {
			if (includeLastSegments) {
				return point.x == this.#currentPosition.x && point.y == this.#currentPosition.y;
			}
			return false;
		}
	}

	/**
	 * Checks if the type of the tile the player is currently on has changed.
	 * This can happen either because the player moved to a new coordinate,
	 * or because the current tile type got changed to that of another player.
	 * @param {Vec2} previousPosition Used for the final vertex when a trail ends.
	 */
	#updateCurrentTile(previousPosition) {
		const tileValue = this.#game.arena.getTileValue(this.#currentPosition);
		if (this.#currentTileType != tileValue) {
			// When the player moves out of their captured area, we will start a new trail.
			if (tileValue != this.#id && !this.isGeneratingTrail) {
				this.#eventHistory.addEvent(this.getPosition(), { type: "start-trail" });
				this.#addTrailVertex(this.#currentPosition);
				this.game.broadcastPlayerTrail(this);
			}

			// When the player comes back into their captured area, we add a final vertex to the trail,
			// Then fill the tiles underneath the trail, and finally clear the trail.
			if (tileValue == this.#id && this.isGeneratingTrail) {
				this.#addTrailVertex(previousPosition);
				if (this.#allMyTilesCleared) {
					throw new Error("Assertion failed, player tiles have already been removed from the arena.");
				}
				this.game.arena.fillPlayerTrail(this.#trailVertices, this.id);
				this.#updateCapturedArea();
				this.game.broadcastPlayerEmptyTrail(this);
				this.#clearTrailVertices();
			}

			this.#currentTileType = tileValue;
		}
	}

	async #updateCapturedArea() {
		const totalFilledTileCount = await this.game.arena.updateCapturedArea(
			this.id,
			Array.from(this.game.getUnfillableLocations(this)),
		);
		this.#setCapturedTileCount(totalFilledTileCount);
	}

	/**
	 * @param {number} capturedTileCount
	 */
	#setCapturedTileCount(capturedTileCount) {
		if (this.#capturedTileCount != capturedTileCount) {
			this.#capturedTileCount = capturedTileCount;
			this.#maxCapturedTileCount = Math.max(this.#maxCapturedTileCount, this.#capturedTileCount);
			this.#sendMyScore();
		}
	}

	#sendMyScore() {
		this.#connection.sendMyScore(this.#capturedTileCount, this.#killCount);
	}

	/**
	 * @param {number} rank
	 */
	setRank(rank) {
		this.#rank = rank;
		this.#highestRank = Math.min(this.#highestRank, rank);
		this.#sendMyRank();

		const isRankingFirst = this.#rank == 1;
		if (isRankingFirst != this.#isCurrentlyRankingFirst) {
			this.#isCurrentlyRankingFirst = isRankingFirst;
			if (isRankingFirst) {
				this.#rankingFirstStartTime = performance.now();
			} else {
				this.#incrementRankingFirstSeconds();
			}
		}
	}

	#incrementRankingFirstSeconds() {
		if (this.#rankingFirstStartTime <= 0) return;
		const duration = performance.now() - this.#rankingFirstStartTime;
		this.#rankingFirstSeconds += duration;
		this.#rankingFirstStartTime = 0;
	}

	#sendMyRank() {
		this.#connection.sendMyRank(this.#rank);
	}

	getTotalScore() {
		return this.#capturedTileCount + this.#killCount * 500;
	}

	/**
	 * @returns {import("../../../serverManager/src/LeaderboardManager.js").PlayerScoreData}
	 */
	getGlobalLeaderboardScore() {
		return {
			name: this.name,
			scoreTiles: this.#maxCapturedTileCount,
			rankingFirstSeconds: this.#rankingFirstSeconds,
			scoreKills: this.#killCount,
			timeAliveSeconds: this.#getTimeAliveSeconds(),
			trailLength: this.#maxTrailLength,
		};
	}

	/**
	 * @param {number} honkDuration
	 */
	honk(honkDuration) {
		this.game.broadcastHonk(this, honkDuration);
	}
}

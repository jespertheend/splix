import { WebSocketConnection } from "../WebSocketConnection.js";
import { SKINS_COUNT, UPDATES_VIEWPORT_RECT_SIZE } from "../config.js";
import { Vec2 } from "renda";

/**
 * When sent inside messages, these translate to an integer:
 * - right - 0
 * - down - 1
 * - left - 2
 * - up - 3
 * - paused - 4
 * @typedef {"right" | "down" | "left" | "up" | "paused"} Direction
 */

export class Player {
	#id;
	#game;
	#connection;
	#skinId = 2;

	/**
	 * The position of the player which is rounded to the closest tile it is on.
	 */
	snappedPos = new Vec2(20, 20);

	/** @type {Direction} */
	#currentDirection = "up";

	get currentDirection() {
		return this.#currentDirection;
	}

	/**
	 * @typedef MovementQueueItem
	 * @property {Direction} direction The direction in which the player started moving.
	 * @property {Vec2} desiredPosition The location at which the player wishes to start moving. If the player
	 * has already moved past this point, we could also move them back in time in order to fulfill their request.
	 */

	/** @type {MovementQueueItem[]} */
	#movementQueue = [];

	/**
	 * @param {number} id
	 * @param {import("./Game.js").Game} game
	 * @param {WebSocketConnection} connection
	 */
	constructor(id, game, connection) {
		this.#id = id;
		this.#game = game;
		this.#connection = connection;
		game.arena.fillPlayerSpawn(this.snappedPos, id);
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

	get skinId() {
		return this.#skinId;
	}

	/**
	 * Returns a rect defining the area for which events should be sent to this player.
	 * @returns {import("./Arena.js").Rect}
	 */
	getUpdatesViewport() {
		return {
			min: this.snappedPos.clone().addScalar(-UPDATES_VIEWPORT_RECT_SIZE),
			max: this.snappedPos.clone().addScalar(UPDATES_VIEWPORT_RECT_SIZE),
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
			this.snappedPos.set(firstItem.desiredPosition);
			this.#currentDirection = firstItem.direction;
			this.game.broadcastPlayerState(this);
		}
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
			if (desiredPosition.y != this.snappedPos.y) return false;
		}
		if (this.#currentDirection == "up" || this.#currentDirection == "down") {
			if (desiredPosition.x != this.snappedPos.x) return false;
		}

		return true;
	}

	/**
	 * Returns an integer that a client can use to render the correct color for a player or tile.
	 * When two players have the same color, a different integer is returned to make sure a
	 * player doesn't see any players with their own color.
	 * The returned value ranges from 0 to (SKINS_COUNT - 1).
	 * @param {Player} otherPlayer
	 */
	skinIdForPlayer(otherPlayer) {
		if (this.#skinId != otherPlayer.skinId || otherPlayer == this) {
			return this.#skinId;
		} else {
			// The color of this player is the same as my color, we'll generate a random color (that is not mine)
			let fakeSkinId = this.id % (SKINS_COUNT - 1); //ranges from 0 to (SKINS_COUNT - 2)
			if (fakeSkinId >= otherPlayer.skinId - 1) {
				fakeSkinId++; //make the value range from 0 to (SKINS_COUNT - 1) but exclude otherPlayer.skinId
			}
			return fakeSkinId;
		}
	}
}

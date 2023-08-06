import { WebSocketConnection } from "../WebSocketConnection.js";
import { SKINS_COUNT, UPDATES_VIEWPORT_RECT_SIZE } from "../config.js";
import { Vec2 } from "renda";

export class Player {
	#id;
	#game;
	#connection;
	#skinId = 2;

	/**
	 * The position of the player which is rounded to the closest tile it is on.
	 */
	snappedPos = new Vec2(20, 20);

	/**
	 * @param {number} id
	 * @param {import("./Game.js").Game} game
	 * @param {WebSocketConnection} connection
	 */
	constructor(id, game, connection) {
		this.#id = id;
		this.#game = game;
		this.#connection = connection;
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

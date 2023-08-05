import { SKINS_COUNT } from "../config.js";

export class Player {
	#id;
	#game;
	#skinId = 2;

	/**
	 * @param {number} id
	 * @param {import("./Game.js").Game} game
	 */
	constructor(id, game) {
		this.#id = id;
		this.#game = game;
	}

	get id() {
		return this.#id;
	}

	get game() {
		return this.#game;
	}

	get skinId() {
		return this.#skinId;
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

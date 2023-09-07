/**
 * @fileoverview
 *
 * It's possible for players to move back in time.
 * When their ping is high, and a movement message arrives late, they might move backwards.
 * Clients can specify at which specific tile they want to make a turn,
 * so if the message arrives late, we'll move the player back a few tiles so that it matches this exact tile.
 *
 * However, we also want to undo any events that happened during that time.
 * Such as player deaths or filled tiles.
 *
 * The `PlayerEventHistory` class keeps track of events so that they can be undone should the player move back.
 */

import { Vec2 } from "renda";
import { MAX_UNDO_EVENT_TIME } from "../config.js";

/**
 * @typedef PlayerEventKillPlayer
 * @property {"kill-player"} type
 * @property {number} playerId
 */

/**
 * @typedef {PlayerEventKillPlayer} PlayerEvent
 */

/**
 * @typedef {(event: PlayerEvent) => void} OnUndoEventCallback
 */

export class PlayerEventHistory {
	/**
	 * @typedef PlayerEventData
	 * @property {PlayerEvent} event
	 * @property {Vec2} position
	 * @property {number} time
	 */

	/** @type {PlayerEventData[]} */
	#events = [];

	/**
	 * @param {Vec2} position The location of the player where the event occurred.
	 * @param {PlayerEvent} event
	 */
	addEvent(position, event) {
		this.#events.push({
			event,
			position,
			time: performance.now(),
		});
	}

	/**
	 * Undoes events that occurred during the provided positions.
	 * @param {Vec2} previousPosition
	 * @param {Vec2} newPosition
	 */
	undoRecentEvents(previousPosition, newPosition) {
		while (true) {
			const event = this.#events.pop();
			if (!event) break;
			if (performance.now() - event.time > MAX_UNDO_EVENT_TIME) break;
			this.#onUndoEventCbs.forEach((cb) => cb(event.event));
		}
		this.#events = [];
	}

	/** @type {Set<OnUndoEventCallback>} */
	#onUndoEventCbs = new Set();

	/**
	 * @param {OnUndoEventCallback} cb
	 */
	onUndoEvent(cb) {
		this.#onUndoEventCbs.add(cb);
	}
}

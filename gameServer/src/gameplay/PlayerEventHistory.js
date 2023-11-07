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
 * @property {import("./Player.js").DeathType} deathType
 */

/**
 * @typedef PlayerEventStartTrail
 * @property {"start-trail"} type
 */

/**
 * @typedef {PlayerEventKillPlayer | PlayerEventStartTrail} PlayerEvent
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

	/** @type {Set<PlayerEventData>} */
	#events = new Set();

	/**
	 * @param {Vec2} position The location of the player where the event occurred.
	 * @param {PlayerEvent} event
	 */
	addEvent(position, event) {
		this.#events.add({
			event,
			position,
			time: performance.now(),
		});
	}

	/**
	 * Yields recent events that both lie within the provided range and have recently been created.
	 * @param {Vec2} previousPosition
	 * @param {Vec2} newPosition
	 */
	*getRecentEvents(previousPosition, newPosition) {
		// We create a rectangle which we can use to check which events lie within that rectangle.
		// Any events outside of the rectangle should be ignored, otherwise we allow the player jump over
		// certain tiles, such as player trails or the wall.
		/** @type {import("../util/util.js").Rect} */
		let allowedRect = {
			min: new Vec2(),
			max: new Vec2(),
		};
		if (previousPosition.x == newPosition.x && previousPosition.y == newPosition.y) {
			// When the previous and new position are at the exact same location,
			// no events should be undone because the player never moved back.
			// We set the rectangle to something with size zero,
			// That way all events will be filtered away
			allowedRect.min.set(previousPosition);
			allowedRect.max.set(previousPosition);
		} else if (previousPosition.x == newPosition.x) {
			if (previousPosition.y < newPosition.y) {
				allowedRect.min.set(previousPosition.x, previousPosition.y);
				allowedRect.max.set(newPosition.x + 1, newPosition.y);
			} else {
				allowedRect.min.set(newPosition.x, newPosition.y + 1);
				allowedRect.max.set(previousPosition.x + 1, previousPosition.y + 1);
			}
		} else if (previousPosition.y == newPosition.y) {
			if (previousPosition.x < newPosition.x) {
				allowedRect.min.set(previousPosition.x, previousPosition.y);
				allowedRect.max.set(newPosition.x, newPosition.y + 1);
			} else {
				allowedRect.min.set(newPosition.x + 1, newPosition.y);
				allowedRect.max.set(previousPosition.x + 1, previousPosition.y + 1);
			}
		} else {
			throw new Error("Assertion failed, previous and new position create a diagonal line.");
		}
		for (const event of this.#events) {
			if (performance.now() - event.time > MAX_UNDO_EVENT_TIME) {
				this.#events.delete(event);
				continue;
			}

			// Check if the event lies between previousPosition and newPosition, and skip otherwise
			if (
				event.position.x >= allowedRect.min.x &&
				event.position.y >= allowedRect.min.y &&
				event.position.x < allowedRect.max.x &&
				event.position.y < allowedRect.max.y
			) {
				yield event;
			}
		}
	}

	/**
	 * Undoes events that occurred during the provided positions.
	 * @param {Vec2} previousPosition
	 * @param {Vec2} newPosition
	 */
	undoRecentEvents(previousPosition, newPosition) {
		for (const event of this.getRecentEvents(previousPosition, newPosition)) {
			this.#onUndoEventCbs.forEach((cb) => cb(event.event));
		}
		this.#events.clear();
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

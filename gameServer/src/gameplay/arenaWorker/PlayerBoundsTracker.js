import { Vec2 } from "renda";
/**
 * Keeps track of the bounding boxes of player areas.
 * We don't want to perform flood fill operations on the entire arena.
 * To kepe things fast, we'll only perform it on the tiles that are known to contain tiles from the relevant player.
 * Bounding boxes may be bigger than the actual area, but when they are too small, we'll start running into issues.
 *
 * We need to keep track of bounding boxes inside the worker.
 * If we start sending bounding boxes back and forth between the main thread,
 * we'll start running into synchronisation issues.
 * For example, we could let the main thread keep track of it
 * and then send new bounding boxes with every `updateCapturedArea` message,
 * and return updated bounding boxes in its response.
 * But doing that way makes it possible for the main thread to send outdated bounding boxes (that are too small)
 * in circumstances where a `updateCapturedArea` doesn't return the updated bounding box in time.
 */
export class PlayerBoundsTracker {
	/** @type {Map<number, import("../../util/util.js").Rect>} */
	#bounds = new Map();

	/**
	 * Returns a copy of the stored player bounds.
	 * Throws if no bounds for this player exists.
	 * @param {number} playerId
	 * @returns {import("../../util/util.js").Rect}
	 */
	getBounds(playerId) {
		const bounds = this.#getBounds(playerId);
		return {
			min: bounds.min.clone(),
			max: bounds.max.clone(),
		};
	}

	/**
	 * Returns the reference to the player bounds.
	 * Throws if no bounds for this player exists.
	 * @param {number} playerId
	 */
	#getBounds(playerId) {
		const bounds = this.#bounds.get(playerId);
		if (!bounds) throw new Error(`Assertion failed, no bounds found for player id '${playerId}'`);
		return bounds;
	}

	/**
	 * @param {number} playerId
	 * @param {import("../../util/util.js").Rect} rect
	 */
	initializePlayer(playerId, rect) {
		if (this.#bounds.has(playerId)) {
			throw new Error(`Assertion failed, bounds for player id '${playerId}' already exist`);
		}
		this.#bounds.set(playerId, {
			min: rect.min.clone(),
			max: rect.max.clone(),
		});
	}

	/**
	 * Expands the bounding box of a player.
	 * @param {number} playerId
	 * @param {import("../../util/util.js").Rect} rect
	 */
	expandBoundsWithRect(playerId, rect) {
		const bounds = this.#getBounds(playerId);
		bounds.min.x = Math.min(bounds.min.x, rect.min.x);
		bounds.min.y = Math.min(bounds.min.y, rect.min.y);
		bounds.max.x = Math.max(bounds.max.x, rect.max.x);
		bounds.max.y = Math.max(bounds.max.y, rect.max.y);
	}

	/**
	 * Expands the bounding box of a player.
	 * @param {number} playerId
	 * @param {Vec2} point
	 */
	expandBoundsWithPoint(playerId, point) {
		this.expandBoundsWithRect(playerId, {
			min: point,
			max: point.clone().addScalar(1),
		});
	}

	/**
	 * Replaces the bounding box of a player.
	 * @param {number} playerId
	 * @param {import("../../util/util.js").Rect} newBounds
	 */
	updateBounds(playerId, newBounds) {
		const bounds = this.#getBounds(playerId);
		bounds.min.set(newBounds.min);
		bounds.max.set(newBounds.max);
	}

	/**
	 * @param {number} playerId
	 */
	deletePlayer(playerId) {
		this.#bounds.delete(playerId);
	}
}

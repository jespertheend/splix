import { TypedMessenger, Vec2 } from "renda";
import { clampRect, createArenaTiles, fillRect } from "./arenaWorker/util.js";

/**
 * @typedef Rect
 * @property {import("renda").Vec2} min
 * @property {import("renda").Vec2} max
 */

/**
 * @typedef FilledAreaData
 * @property {number} minX
 * @property {number} minY
 * @property {number} maxX
 * @property {number} maxY
 * @property {number} playerId
 */

/**
 * @typedef WorkerArenaHandlers
 * @property {(areas: FilledAreaData[]) => void} notifyAreasFilled
 */

export class Arena {
	/**
	 * Stores which tiles have been filled and by which player.
	 * -1 = border
	 *  0 = empty
	 * 1+ = player id
	 */
	#tiles;

	#width;
	#height;

	#worker;
	/** @type {TypedMessenger<import("./arenaWorker/mod.js").ArenaWorkerHandlers, WorkerArenaHandlers>} */
	#messenger;

	/**
	 * @param {number} width
	 * @param {number} height
	 */
	constructor(width, height) {
		this.#width = width;
		this.#height = height;

		this.#tiles = createArenaTiles(width, height);

		this.#worker = new Worker(new URL("./arenaWorker/mod.js", import.meta.url), {
			type: "module",
		});
		this.#messenger = new TypedMessenger();
		this.#messenger.initialize(this.#worker, {
			notifyAreasFilled: (areas) => {
				for (const area of areas) {
					const rect = {
						min: new Vec2(area.minX, area.minY),
						max: new Vec2(area.maxX, area.maxY),
					}
					fillRect(this.#tiles, this.#width, this.#height, rect, area.playerId)
				}
			}
		});
		this.#messenger.send.init(width, height);
	}

	/**
	 * Modifies a the provided rect to make sure exists within the area of the arena.
	 * @param {Rect} rect
	 */
	clampRect(rect) {
		return clampRect(rect, {
			min: new Vec2(),
			max: new Vec2(this.#width, this.#height),
		});
	}

	/**
	 * @param {Vec2} pos
	 */
	getTileValue(pos) {
		if (pos.x >= this.#width || pos.y >= this.#height) {
			throw new Error("Assertion failed, tile coord is out of bounds");
		}
		return this.#tiles[pos.x][pos.y];
	}

	/**
	 * @param {Vec2} pos
	 * @param {number} playerId
	 */
	fillPlayerSpawn(pos, playerId) {
		this.#messenger.send.fillPlayerSpawn(pos.x, pos.y, playerId);
	}
}

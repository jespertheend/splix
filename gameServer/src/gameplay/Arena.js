import { TypedMessenger, Vec2 } from "renda";
import { clampRect, createArenaTiles, deserializeRect, fillRect } from "./util.js";

/**
 * @typedef FilledAreaMessageData
 * @property {import("./util.js").SerializedRect} rect
 * @property {number} tileValue
 */

/**
 * @typedef WorkerArenaHandlers
 * @property {(areas: FilledAreaMessageData[]) => void} notifyAreasFilled
 */

/** @typedef {(rect: import("./util.js").Rect, tileValue: number) => void} OnRectFilledCallback */

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
	/** @type {TypedMessenger<WorkerArenaHandlers, import("./arenaWorker/mod.js").ArenaWorkerHandlers>} */
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
					const rect = deserializeRect(area.rect);
					fillRect(this.#tiles, this.#width, this.#height, rect, area.tileValue);
					this.#onRectFilledCbs.forEach((cb) => {
						cb(rect, area.tileValue);
					});
				}
			},
		});
		this.#messenger.send.init(width, height);
	}

	/** @type {Set<OnRectFilledCallback>} */
	#onRectFilledCbs = new Set();

	/**
	 * Registers a callback that is fired whenever a rectangle of the arena is filled with a new tile type.
	 * @param {OnRectFilledCallback} cb
	 */
	onRectFilled(cb) {
		this.#onRectFilledCbs.add(cb);
	}

	/**
	 * Modifies a the provided rect to make sure exists within the area of the arena.
	 * @param {import("./util.js").Rect} rect
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
	 * Fills the spawn area tiles around a player.
	 * @param {Vec2} pos
	 * @param {number} playerId
	 */
	async fillPlayerSpawn(pos, playerId) {
		const newBoundsRect = await this.#messenger.send.fillPlayerSpawn(pos.x, pos.y, playerId);
		return deserializeRect(newBoundsRect);
	}

	/**
	 * @param {number} playerId
	 */
	clearAllPlayerTiles(playerId) {
		this.#messenger.send.clearAllPlayerTiles(playerId);
	}

	/**
	 * Fills the tiles that are covered with a player trail.
	 * @param {Vec2[]} vertices
	 * @param {number} playerId
	 */
	fillPlayerTrail(vertices, playerId) {
		this.#messenger.send.fillPlayerTrail(vertices.map((v) => v.toArray()), playerId);
	}

	/**
	 * Finds unfilled areas of the player and fills them.
	 * @param {number} playerId
	 * @param {Vec2[]} otherPlayerLocations
	 */
	updateCapturedArea(playerId, otherPlayerLocations) {
		this.#messenger.send.updateCapturedArea(playerId, otherPlayerLocations.map((v) => v.toArray()));
	}
}

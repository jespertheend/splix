import { TypedMessenger, Vec2 } from "renda";
import { clampRect, compressTiles, createArenaTiles, deserializeRect, fillRect } from "../util/util.js";
import { PLAYER_SPAWN_RADIUS } from "../config.js";

/**
 * @typedef FilledAreaMessageData
 * @property {import("../util/util.js").SerializedRect} rect
 * @property {number} tileValue
 */

/**
 * @typedef WorkerArenaHandlers
 * @property {(areas: FilledAreaMessageData[]) => void} notifyAreasFilled
 */

/** @typedef {(rect: import("../util/util.js").Rect, tileValue: number) => void} OnRectFilledCallback */

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

	#pitWidth;
	#pitHeight;

	get width() {
		return this.#width;
	}

	get height() {
		return this.#height;
	}

	get pitWidth() {
		return this.#pitWidth;
	}

	get pitHeight() {
		return this.#pitHeight;
	}

	#worker;
	/** @type {TypedMessenger<WorkerArenaHandlers, import("./arenaWorker/mod.js").ArenaWorkerHandlers>} */
	#messenger;

	/**
	 * @param {number} width
	 * @param {number} height
	 * @param {number} pitWidth
	 * @param {number} pitHeight
	 * @param {import("./Game.js").GameModes} gameMode
	 */
	constructor(width, height, pitWidth, pitHeight, gameMode) {
		this.#width = width;
		this.#height = height;

		this.#pitWidth = pitWidth;
		this.#pitHeight = pitHeight;

		this.#tiles = createArenaTiles(width, height, pitWidth, pitHeight, gameMode);

		this.#worker = new Worker(new URL("./arenaWorker/mod.js", import.meta.url), {
			type: "module",
		});
		this.#messenger = new TypedMessenger();
		this.#messenger.initializeWorker(this.#worker, {
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
		this.#messenger.send.init(width, height, pitWidth, pitHeight, gameMode);
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
	 * @param {import("../util/util.js").Rect} rect
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
	fillPlayerSpawn(pos, playerId) {
		this.#messenger.send.fillPlayerSpawn(pos.x, pos.y, playerId);
		const size = PLAYER_SPAWN_RADIUS * 2 + 1;
		return size * size;
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
		return this.#messenger.send.updateCapturedArea(playerId, otherPlayerLocations.map((v) => v.toArray()));
	}

	/**
	 * Gets a chunk of the arena and compresses it into rectangles,
	 * ready to be sent to clients.
	 * @param {import("../util/util.js").Rect} rect
	 * @param {(tileValue: number) => import("./Game.js").TileTypeForMessage} convertTileDataCb
	 */
	getChunk(rect, convertTileDataCb) {
		rect = this.clampRect(rect);
		const width = rect.max.x - rect.min.x;
		const height = rect.max.y - rect.min.y;
		if (width <= 0 || height <= 0) return [];

		/** @type {Map<string, import("./Game.js").TileTypeForMessage>} */
		const tileDataRefs = new Map();

		return compressTiles(rect, (x, y) => {
			const tileValue = this.#tiles[x][y];
			const tileData = convertTileDataCb(tileValue);
			const key = tileData.colorId + "-" + tileData.patternId;
			let ref = tileDataRefs.get(key);
			if (ref) return ref;
			tileDataRefs.set(key, tileData);
			return tileData;
		}).map((rectData) => {
			return {
				rect: rectData.rect,
				tileType: rectData.ref,
			};
		});
	}

	/**
	 * @param {number} part
	 */
	getMinimapPart(part) {
		return this.#messenger.send.getMinimapPart(part);
	}
}

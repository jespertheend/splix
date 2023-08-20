import { Vec2 } from "renda";

/**
 * Creates a 2d array of numbers, each set to 0 except for the border, which is -1.
 * @param {number} width
 * @param {number} height
 */
export function createArenaTiles(width, height) {
	/** @type {number[][]} */
	const tiles = [];
	// Create the tiles of the arena
	for (let x = 0; x < width; x++) {
		const column = new Array(height).fill(0);
		tiles.push(column);
	}

	// Create the border of the arena
	for (let x = 0; x < width; x++) {
		tiles[x][0] = -1;
		tiles[x][height - 1] = -1;
	}
	for (let y = 0; y < height; y++) {
		tiles[0][y] = -1;
		tiles[width - 1][y] = -1;
	}
	return tiles;
}

/**
 * Returns a new rect representing the smallest area of the two rects.
 * @param {Rect} rect1
 * @param {Rect} rect2
 * @returns {Rect}
 */
export function clampRect(rect1, rect2) {
	const minX = Math.max(rect1.min.x, rect2.min.x);
	const minY = Math.max(rect1.min.y, rect2.min.y);
	const maxX = Math.min(rect1.max.x, rect2.max.x);
	const maxY = Math.min(rect1.max.y, rect2.max.y);
	return {
		min: new Vec2(minX, minY),
		max: new Vec2(maxX, maxY),
	};
}

/**
 * @param {number[][]} tiles
 * @param {number} tilesWidth The width of the `tiles` parameter.
 * @param {number} tilesHeight The height of the `tiles` parameter.
 * @param {Rect} rect
 * @param {number} value The value to fill the tiles with.
 */
export function fillRect(tiles, tilesWidth, tilesHeight, rect, value) {
	rect = clampRect(rect, {
		min: new Vec2(),
		max: new Vec2(tilesWidth, tilesHeight),
	});

	for (let x = rect.min.x; x < rect.max.x; x++) {
		for (let y = rect.min.y; y < rect.max.y; y++) {
			tiles[x][y] = value;
		}
	}
}

/**
 * @typedef Rect
 * @property {import("renda").Vec2} min
 * @property {import("renda").Vec2} max
 */

/**
 * @typedef SerializedRect
 * @property {number} minX
 * @property {number} minY
 * @property {number} maxX
 * @property {number} maxY
 */

/**
 * @param {Rect} rect
 * @returns {SerializedRect}
 */
export function serializeRect(rect) {
	return {
		minX: rect.min.x,
		minY: rect.min.y,
		maxX: rect.max.x,
		maxY: rect.max.y,
	};
}

/**
 * @param {SerializedRect} rect
 * @returns {Rect}
 */
export function deserializeRect(rect) {
	return {
		min: new Vec2(rect.minX, rect.minY),
		max: new Vec2(rect.maxX, rect.maxY),
	};
}

/**
 * Converts arbitrary data to an array of `Rect`s.
 * This can be used to send less data over the network, instead of sending the value of each tile individually,
 * you can send just the list of rectangles and then what should happen to them.
 * For example, when a player fills an area of land, instead of sending which tiles have been filled,
 * you can send the rectangles that have been filled and the id of the player that they were filled with.
 *
 * @param {Rect} rect The coordinates to iterate over. `cb` will be fired for every coordinate in this rectangle.
 * @param {(x: number, y: number) => boolean} cb A callback that determine whether tiles should be included
 * in the returned array of rectangles. Basically, this callback should return `true` when you wish to change
 * the value of a tile, and `false` if when you wish to keep the value as is.
 */
export function compressTiles(rect, cb) {
	const rects = [];

	/** @typedef {[start: number, end: number]} Section */

	/**
	 * Checks if two columns contain the exact same sections.
	 * @param {Section[]} columnA
	 * @param {Section[]} columnB
	 */
	function columnsEqual(columnA, columnB) {
		if (columnA.length != columnB.length) return false;
		for (let i = 0; i < columnA.length; i++) {
			const sectionA = columnA[i];
			const sectionB = columnB[i];
			if (sectionA[0] != sectionB[0]) return false;
			if (sectionA[1] != sectionB[1]) return false;
		}
		return true;
	}

	/** @type {Section[]} */
	let previousSections = [];
	let equalColumnCount = 0;
	for (let x = rect.min.x; x < rect.max.x + 1; x++) {
		/** @type {Section[]} */
		const collectedSections = [];

		if (x < rect.max.x) {
			/** @type {Section?} */
			let currentlyMeasuringSection = null;
			for (let y = rect.min.y; y < rect.max.y + 1; y++) {
				const tileShouldBeIncluded = y < rect.max.y && cb(x, y);
				if (tileShouldBeIncluded) {
					if (!currentlyMeasuringSection) {
						currentlyMeasuringSection = [y, 0];
						collectedSections.push(currentlyMeasuringSection);
					}
				} else {
					if (currentlyMeasuringSection) {
						currentlyMeasuringSection[1] = y;
						currentlyMeasuringSection = null;
					}
				}
			}
		}

		// Compare the current sections to that of the previous column.
		if (columnsEqual(previousSections, collectedSections)) {
			equalColumnCount++;
		} else {
			for (const section of previousSections) {
				rects.push({
					min: new Vec2(x - equalColumnCount - 1, section[0]),
					max: new Vec2(x, section[1]),
				});
			}
			equalColumnCount = 0;
			previousSections = collectedSections;
		}
	}

	return rects;
}

/** @typedef {"default" | "drawing" | "arena"} GameModes */
import { Vec2 } from "renda";

/**
 * Creates a 2d array of numbers, each set to 0 except for the border, which is -1.
 * @param {number} width
 * @param {number} height
 * @param {number} fakeArenaWidth
 * @param {number} fakeArenaHeight
 * @param {GameModes} gameMode
 */
export function createArenaTiles(width, height, fakeArenaWidth, fakeArenaHeight, gameMode) {
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

	// Create the border of the fake arena (make new function later which can create walls anywhere instead).
	if (gameMode == "arena") {
		const minX = Math.floor(width / 2 - fakeArenaWidth / 2);
		const maxX = Math.floor(width / 2 + fakeArenaWidth / 2 - 1);
		const minY = Math.floor(height / 2 - fakeArenaHeight / 2);
		const maxY = Math.floor(height / 2 + fakeArenaHeight / 2 - 1);
		for (let x = 0; x < fakeArenaWidth; x++) {
			if (x > 0 && x < fakeArenaWidth - 3) { // If ! upper door, fill upper border with -1.
				tiles[minX + x][minY] = -1;
			}
			if (x > 2) { // If ! bottom door, fill bottom border with -1.
				tiles[minX + x][maxY] = -1;
			}
		}
		for (let y = 0; y < fakeArenaHeight; y++) {
			tiles[minX][minY + y] = -1;
			tiles[maxX][minY + y] = -1;
		}
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
 * @template {Object} T
 * @param {Rect} rect The coordinates to iterate over. `cb` will be fired for every coordinate in this rectangle.
 * @param {(x: number, y: number) => T?} cb A callback that determines how to group different rectangles.
 * This callback should return the same reference from tiles that share the same type of data,
 * or `null` if you wish to ommit the tile from the results.
 */
export function compressTiles(rect, cb) {
	/** @type {{ref: T, rect: Rect}[]} */
	const rects = [];

	/**
	 * @typedef Section
	 * @property {number} start
	 * @property {number} end
	 * @property {T} ref
	 */

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
			if (sectionA.start != sectionB.start) return false;
			if (sectionA.end != sectionB.end) return false;
			if (sectionA.ref !== sectionB.ref) return false;
		}
		return true;
	}

	/** @type {Section[]} */
	let previousSections = [];
	let equalColumnCount = 0;
	for (let x = rect.min.x; x < rect.max.x + 1; x++) {
		/** @type {Section[]} */
		const collectedSections = [];

		// In the for loops above, we run one extra time (hence the `rect.max.x + 1`).
		// This is so we can do one final pass where we compare it to the row above.
		// We don't actually check any tiles, since these tiles would lie outside the prived `rect`.
		// The if statement below ensures no tiles are parsed, resulting in an empty `collectedSections` array.
		// That way we compare an empty array against the row above, resulting in the final set of rectangles being created.
		if (x < rect.max.x) {
			/** @type {Section?} */
			let currentlyMeasuringSection = null;
			for (let y = rect.min.y; y < rect.max.y + 1; y++) {
				let ref = null;
				// Here we do the same thing as with the `for x` loop above. Making sure the last tile is handled correctly.
				if (y < rect.max.y) {
					ref = cb(x, y);
				}
				if (
					Boolean(ref) != Boolean(currentlyMeasuringSection) ||
					(ref && currentlyMeasuringSection && ref != currentlyMeasuringSection.ref)
				) {
					currentlyMeasuringSection = null;
					if (ref) {
						currentlyMeasuringSection = { start: y, end: y + 1, ref };
						collectedSections.push(currentlyMeasuringSection);
					}
				} else {
					if (currentlyMeasuringSection) {
						currentlyMeasuringSection.end = y + 1;
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
					rect: {
						min: new Vec2(x - equalColumnCount - 1, section.start),
						max: new Vec2(x, section.end),
					},
					ref: section.ref,
				});
			}
			equalColumnCount = 0;
			previousSections = collectedSections;
		}
	}

	return rects;
}

/**
 * Checks if a point lies within a trail segment.
 * @param {import("renda").Vec2} point
 * @param {import("renda").Vec2} start
 * @param {import("renda").Vec2} end
 */
export function checkTrailSegment(point, start, end) {
	if (start.x != end.x && start.y != end.y) {
		throw new Error("Assertion failed, trail with diagonal segment found.");
	}
	const minX = Math.min(start.x, end.x);
	const minY = Math.min(start.y, end.y);
	const maxX = Math.max(start.x, end.x);
	const maxY = Math.max(start.y, end.y);

	if (point.x == minX) {
		if (point.y >= minY && point.y <= maxY) return true;
	} else if (point.y == minY) {
		if (point.x >= minX && point.x <= maxX) return true;
	}
	return false;
}

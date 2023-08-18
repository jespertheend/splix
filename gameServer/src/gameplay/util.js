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

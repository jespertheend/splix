/**
 * @typedef Rect
 * @property {import("renda").Vec2} min
 * @property {import("renda").Vec2} max
 */

export class Arena {
	/**
	 * Stores which tiles have been filled and by which player.
	 * -1 = border
	 *  0 = empty
	 * 1+ = player id
	 * @type {number[][]}
	 */
	#tiles = [];

	#width;
	#height;

	/**
	 * @param {number} width
	 * @param {number} height
	 */
	constructor(width, height) {
		this.#width = width;
		this.#height = height;

		// Create the tiles of the arena
		for (let x = 0; x < width; x++) {
			const column = new Array(height).fill(0);
			this.#tiles.push(column);
		}

		// Create the border of the arena
		for (let x = 0; x < width; x++) {
			this.#tiles[x][0] = -1;
			this.#tiles[x][height - 1] = -1;
		}
		for (let y = 0; y < height; y++) {
			this.#tiles[0][y] = -1;
			this.#tiles[width - 1][y] = -1;
		}
	}

	/**
	 * Modifies a the provided rect to make sure exists within the area of the arena.
	 * @param {Rect} rect
	 */
	clampRect(rect) {
		rect.min.x = Math.max(rect.min.x, 0);
		rect.min.y = Math.max(rect.min.y, 0);
		rect.max.x = Math.min(rect.max.x, this.#width);
		rect.max.y = Math.min(rect.max.y, this.#height);
	}

	/**
	 * @param {number} x X coordinate of the tile
	 * @param {number} y Y coordinate of the tile
	 */
	getTileValue(x, y) {
		if (x >= this.#width || y >= this.#height) {
			throw new Error("Assertion failed, tile coord is out of bounds");
		}
		return this.#tiles[x][y];
	}
}

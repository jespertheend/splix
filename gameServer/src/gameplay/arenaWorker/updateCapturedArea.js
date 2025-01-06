import { Vec2 } from "renda";
import { compressTiles } from "../../util/util.js";
import { CircularQueue } from "../../util/CircularQueue.js";

/**
 * Instead of performing the floodfill on the arena itself,
 * which would destroy important information about which tile is owned by which player,
 * we allocate a temporary mask which we perform the flood fill algorithm on.
 * Then once the flood fill is complete, we invert the result and only look at the tiles that have not been "filled".
 * We then take those tiles and inform the arena about which tiles it should change.
 */
let maskWidth = 0;
let maskHeight = 0;
let lineWidth = 0;

/** @type {Uint8Array} */
let grid;

/** @type {CircularQueue} */
let queue;

/**
 * Informs the flood fill algorithm how large of a mask should be allocated.
 * Updating captured player areas of a size larger than this will result in errors.
 * @param {number} width
 * @param {number} height
 */
export function initializeMask(width, height) {
	maskWidth = width;
	maskHeight = height;
	lineWidth = maskHeight;
	grid = new Uint8Array(maskWidth * maskHeight);
	queue = new CircularQueue(maskWidth * maskHeight); // maskWidth + maskHeight would be enough, but for safety
}

const FILLABLE_BLOCK = 0;
const FILLED_BLOCK = 1;
const PLAYER_BLOCK = 2;

/**
 * Finds unfilled areas of the player and fills them.
 * @param {number[][]} arenaTiles
 * @param {number} playerId
 * @param {import("../../util/util.js").Rect} bounds
 * @param {[x: number, y: number][]} unfillableLocations
 */
export function updateCapturedArea(arenaTiles, playerId, bounds, unfillableLocations) {
	// We'll want to add padding of 1 tile to each edge of the bounds.
	// The reason for this is that we want to seed the flood fill algorithm at the top left corner of the bounds.
	// We need to have at least one tile around the area that is not owned by the player that we try to fill for.
	// That way the flood fill can wrap all the way around the players existing area.
	bounds.min.subScalar(1);
	bounds.max.addScalar(1);

	// empty the queue.
	queue.clear();

	/**
	 * Tests if a node can be filled.
	 * @param {number} x coord x
	 * @param {number} y coord y
	 * @param {number} index linear index -> x * lineWidth + y
	 * @returns {Boolean}
	 */
	function testFillNode(x, y, index) {
		if (x < bounds.min.x || y < bounds.min.y) return false;
		if (x >= bounds.max.x || y >= bounds.max.y) return false;

		if (grid[index] === FILLED_BLOCK || grid[index] === PLAYER_BLOCK) return false;
		return true;
	}

	for (let i = bounds.min.x; i < bounds.max.x; i++) {
		const offset = i * lineWidth;
		for (let j = bounds.min.y; j < bounds.max.y; j++) {
			if (arenaTiles[i][j] == playerId) {
				grid[offset + j] = PLAYER_BLOCK;
			} else {
				grid[offset + j] = FILLABLE_BLOCK;
			}
		}
	}

	// pick the top left corner of the bounds as the floodfill seed, we are allowed to pick any point on the edge of the bounds.
	const cornerSeed = bounds.min.clone();

	// We do a quick assertion to make sure our seed is not outside the bounds or already owned by the player.
	// There needs to be a border of one tile around the players area,
	// otherwise the floodfill algorithm won't be able to fully wrap around the player area.
	if (!testFillNode(cornerSeed.x, cornerSeed.y, cornerSeed.x * lineWidth + cornerSeed.y)) {
		throw new Error("Assertion failed, expected the top left corner to get filled");
	}

	// enqueue the corner seed and mark it as already filled
	queue.enqueue(cornerSeed.x, cornerSeed.y);
	grid[cornerSeed.x * lineWidth + cornerSeed.y] = FILLED_BLOCK;

	// We also add seeds for all the player positions in the game,
	// Since we don't want players to just fill a large area around another player.
	for (const node of unfillableLocations) {
		const offset = node[0] * lineWidth;
		if (testFillNode(node[0], node[1] + 1, offset + node[1] + 1)) {
			grid[offset + node[1] + 1] = FILLED_BLOCK;
			queue.enqueue(node[0], node[1] + 1);
		}
		if (testFillNode(node[0], node[1] - 1, offset + node[1] - 1)) {
			grid[offset + node[1] - 1] = FILLED_BLOCK;
			queue.enqueue(node[0], node[1] - 1);
		}
		if (testFillNode(node[0] + 1, node[1], offset + lineWidth + node[1])) {
			grid[offset + lineWidth + node[1]] = FILLED_BLOCK;
			queue.enqueue(node[0] + 1, node[1]);
		}
		if (testFillNode(node[0] - 1, node[1], offset - lineWidth + node[1])) {
			grid[offset - lineWidth + node[1]] = FILLED_BLOCK;
			queue.enqueue(node[0] - 1, node[1]);
		}
	}
	// We don't need to do a `testFillNode` assertion for these seeds.
	// There are actually good reasons why player positions might not be valid nodes.
	// They could lie outside the bounds for instance, or maybe this player is currently inside the
	// captured area of the other player.

	// dino flood fill
	while (!queue.isEmpty()) {
		const node = queue.dequeue();
		if (!node) continue;

		const offset = node[0] * lineWidth;
		if (testFillNode(node[0], node[1] + 1, offset + node[1] + 1)) {
			grid[offset + node[1] + 1] = FILLED_BLOCK;
			queue.enqueue(node[0], node[1] + 1);
		}
		if (testFillNode(node[0], node[1] - 1, offset + node[1] - 1)) {
			grid[offset + node[1] - 1] = FILLED_BLOCK;
			queue.enqueue(node[0], node[1] - 1);
		}
		if (testFillNode(node[0] + 1, node[1], offset + lineWidth + node[1])) {
			grid[offset + lineWidth + node[1]] = FILLED_BLOCK;
			queue.enqueue(node[0] + 1, node[1]);
		}
		if (testFillNode(node[0] - 1, node[1], offset - lineWidth + node[1])) {
			grid[offset - lineWidth + node[1]] = FILLED_BLOCK;
			queue.enqueue(node[0] - 1, node[1]);
		}
	}

	/** @type {import("../../util/util.js").Rect} */
	const newBounds = {
		min: new Vec2(Infinity, Infinity),
		max: new Vec2(-Infinity, -Infinity),
	};
	let totalFilledTileCount = 0;
	for (let x = bounds.min.x; x < bounds.max.x; x++) {
		for (let y = bounds.min.y; y < bounds.max.y; y++) {
			if (grid[x * lineWidth + y] === FILLABLE_BLOCK || grid[x * lineWidth + y] === PLAYER_BLOCK) {
				totalFilledTileCount++;
				newBounds.min.x = Math.min(newBounds.min.x, x);
				newBounds.min.y = Math.min(newBounds.min.y, y);
				newBounds.max.x = Math.max(newBounds.max.x, x + 1);
				newBounds.max.y = Math.max(newBounds.max.y, y + 1);
			}
		}
	}

	// pack the blocks that remains unfilled into rectangles
	const fillRects = compressTiles(bounds, (x, y) => {
		return grid[x * lineWidth + y] == FILLABLE_BLOCK;
	});

	return {
		fillRects,
		totalFilledTileCount,
		newBounds,
	};
}

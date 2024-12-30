import { Vec2 } from "renda";
import { compressTiles } from "../../util/util.js";

/**
 * Instead of performing the floodfill on the arena itself,
 * which would destroy important information about which tile is owned by which player,
 * we allocate a temporary mask which we perform the flood fill algorithm on.
 * Then once the flood fill is complete, we invert the result and only look at the tiles that have not been "filled".
 * We then take those tiles and inform the arena about which tiles it should change.
 */
let maskWidth = 0;
let maskHeight = 0;

/** @type {Uint8Array} */
let byteArray;

/**
 * Informs the flood fill algorithm how large of a mask should be allocated.
 * Updating captured player areas of a size larger than this will result in errors.
 * @param {number} width
 * @param {number} height
 */
export function initializeMask(width, height) {
	maskWidth = width;
	maskHeight = height;
	byteArray = new Uint8Array(maskWidth * maskHeight);
}

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

	/**
	 * Tests whether a node should be marked as 1 (unfillable by the player),
	 * @param {number} x coord x
	 * @param {number} y coord y
	 * @param {number} index linear index -> x * maskHeight + y
	 * @returns {Boolean}
	 */
	function testFillNode(x, y, index) {
		if (x < bounds.min.x || y < bounds.min.y) return false;
		if (x >= bounds.max.x || y >= bounds.max.y) return false;

		if (byteArray[index] == 1 || byteArray[index] === 2) return false;
		return true;
	}

	/**
	 * Initialize the flood fill mask
	 * -1: border
	 *  0: initial state: area unfilled, but fillable by the player
	 *  0: final state: area filled by the player
	 *  1: area unfillable by the player
	 *  2: already filled by the player
	 */
	for (let i = bounds.min.x; i < bounds.max.x; i++) {
		const offset = i * maskHeight;
		for (let j = bounds.min.y; j < bounds.max.y; j++) {
			if (arenaTiles[i][j] == playerId) {
				byteArray[offset + j] = 2;
			} else if (i == 0 || j == 0 || i == maskWidth - 1 || j == maskHeight - 1) {
				byteArray[offset + j] = -1;
			} else {
				byteArray[offset + j] = 0;
			}
		}
	}

	// We could seed the flood fill along anywhere across the edge of the bounds really,
	// but we'll just go with the top left corner.
	const cornerSeed = bounds.min.clone();

	// We do a quick assertion to make sure our seed is not outside the bounds or already owned by the player.
	// There needs to be a border of one tile around the players area,
	// otherwise the floodfill algorithm won't be able to fully wrap around the player area.
	if (!testFillNode(cornerSeed.x, cornerSeed.y, cornerSeed.x * maskHeight + cornerSeed.y)) {
		throw new Error("Assertion failed, expected the top left corner to get filled");
	}

	/**
	 * The queue of nodes
	 * we fill the corner seed first and mark it as 1 as it's unfillable by the player
	 */
	const queue = [[cornerSeed.x, cornerSeed.y]];
	byteArray[cornerSeed.x * maskHeight + cornerSeed.y] = 1;

	// We also add seeds for all the player positions in the game,
	// Since we don't want players to just fill a large area around another player.
	for (const location of unfillableLocations) {
		const [x, y] = location;
		const neighbors = [
			[x, y + 1],
			[x, y - 1],
			[x + 1, y],
			[x - 1, y],
		];
		for (const neighbor of neighbors) {
			const [nx, ny] = neighbor;
			const index = nx * maskHeight + ny;
			if (testFillNode(nx, ny, index)) {
				byteArray[index] = 1;
				queue.push(neighbor);
			}
		}
		// We don't need to do a `testFillNode` assertion for these seeds.
		// There are actually good reasons why player positions might not be valid nodes.
		// They could lie outside the bounds for instance, or maybe this player is currently inside the
		// captured area of the other player.
	}

	// dino flood fill
	while (queue.length > 0) {
		const node = queue.shift();
		if (!node) continue;
		const [x, y] = node;
		const neighbors = [
			[x, y + 1],
			[x, y - 1],
			[x + 1, y],
			[x - 1, y],
		];
		for (const neighbor of neighbors) {
			const [nx, ny] = neighbor;
			const index = nx * maskHeight + ny;
			if (testFillNode(nx, ny, index)) {
				byteArray[index] = 1;
				queue.push(neighbor);
			}
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
			if (byteArray[x * maskHeight + y] == 0 || arenaTiles[x][y] == playerId) {
				totalFilledTileCount++;
				newBounds.min.x = Math.min(newBounds.min.x, x);
				newBounds.min.y = Math.min(newBounds.min.y, y);
				newBounds.max.x = Math.max(newBounds.max.x, x + 1);
				newBounds.max.y = Math.max(newBounds.max.y, y + 1);
			}
		}
	}

	// At this point, the floodFillMask contains `0` values for each tile that needs to be filled or has already been filled.
	// We can filter out the ones that are already filled and only send rectangles of the tiles that need to be changed.
	const fillRects = compressTiles(bounds, (x, y) => {
		return byteArray[x * maskHeight + y] == 0 && arenaTiles[x][y] != playerId;
	});

	return {
		/** The rectangles that need to be filled with tiles from the player in order to fill all gaps in their area. */
		fillRects,
		totalFilledTileCount,
		newBounds,
	};
}

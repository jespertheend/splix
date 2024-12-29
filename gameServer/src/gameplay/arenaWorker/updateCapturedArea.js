import { Vec2 } from "renda";
import { compressTiles, createArenaTiles, fillRect } from "../../util/util.js";
import { Perf } from "../../util/Perf.js";

/**
 * Instead of performing the floodfill on the arena itself,
 * which would destroy important information about which tile is owned by which player,
 * we allocate a temporary mask which we perform the flood fill algorithm on.
 * Then once the flood fill is complete, we invert the result and only look at the tiles that have not been "filled".
 * We then take those tiles and inform the arena about which tiles it should change.
 * @type {number[][]}
 */
let floodFillMask2 = [];

let maskWidth = 0;
let maskHeight = 0;

/**
 * Informs the flood fill algorithm how large of a mask should be allocated.
 * Updating captured player areas of a size larger than this will result in errors.
 * @param {number} width
 * @param {number} height
 */
export function initializeMask(width, height) {
	floodFillMask2 = createArenaTiles(width, height);
	maskWidth = width;
	maskHeight = height;
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

	// We clear the mask because it might still contain values from the last call.
	fillRect(floodFillMask2, maskWidth, maskHeight, bounds, 0);

	/**
	 * Tests whether a node should be marked as 1 (not filled by the player, outside their area)
	 * or as 0 (filled by their player, or inside their area).
	 * @param {Vec2} coord
	 */
	function testFillNode2(coord) {
		if (coord.x < bounds.min.x || coord.y < bounds.min.y) return false;
		if (coord.x >= bounds.max.x || coord.y >= bounds.max.y) return false;

		const alreadyFilled = floodFillMask2[coord.x][coord.y];
		// We've already seen this node, so we can skip it.
		if (alreadyFilled) return false;

		const arenaValue = arenaTiles[coord.x][coord.y];
		return arenaValue != playerId;
	}

	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} index
	 * @returns
	 */
	function testFillNode(x, y, index) {
		if (x < bounds.min.x || y < bounds.min.y) return false;
		if (x >= bounds.max.x || y >= bounds.max.y) return false;

		if (byteArray[index]) return false;
		return true;
	}

	const byteArray = new Uint8Array(maskWidth * maskHeight);
	for (let i = 0; i < maskWidth; i++) {
		const offset = i * maskHeight;
		for (let j = 0; j < maskHeight; j++) {
			if (arenaTiles[i][j] == playerId) {
				byteArray[offset + j] = 2;
			}
		}
	}

	// outside bounds or filled already or own area -> skip

	// We could seed the flood fill along anywhere across the edge of the bounds really,
	// but we'll just go with the top left corner.
	const cornerSeed = bounds.min.clone();

	// We do a quick assertion to make sure our seed is not outside the bounds or already owned by the player.
	// There needs to be a border of one tile around the players area,
	// otherwise the floodfill algorithm won't be able to fully wrap around the player area.
	if (!testFillNode2(cornerSeed)) {
		throw new Error("Assertion failed, expected the top left corner to get filled");
	}

	const queue = [[cornerSeed.x, cornerSeed.y]];
	const stack = [cornerSeed];

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

		const pos = new Vec2(location);
		stack.push(
			pos.clone().add(0, 1),
			pos.clone().add(0, -1),
			pos.clone().add(1, 0),
			pos.clone().add(-1, 0),
		);
		// We don't need to do a `testFillNode` assertion for these seeds.
		// There are actually good reasons why player positions might not be valid nodes.
		// They could lie outside the bounds for instance, or maybe this player is currently inside the
		// captured area of the other player.
	}

	byteArray[cornerSeed.x * maskHeight + cornerSeed.y] = 1;

	Perf.start("dino floodfill");
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
	Perf.end("dino floodfill");

	Perf.start("old floodfill");
	while (true) {
		const node = stack.pop();
		if (!node) break;
		if (testFillNode2(node)) {
			floodFillMask2[node.x][node.y] = 1;
			stack.push(
				node.clone().add(0, 1),
				node.clone().add(0, -1),
				node.clone().add(1, 0),
				node.clone().add(-1, 0),
			);
		}
	}
	Perf.end("old floodfill");
	Perf.print();

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

import { Vec2 } from "renda";
import { compressTiles, createArenaTiles, fillRect } from "../../util/util.js";

/**
 * Instead of performing the floodfill on the arena itself,
 * which would destroy important information about which tile is owned by which player,
 * we allocate a temporary mask which we perform the flood fill algorithm on.
 * Then once the flood fill is complete, we invert the result and only look at the tiles that have not been "filled".
 * We then take those tiles and inform the arena about which tiles it should change.
 * @type {number[][]}
 */
let floodFillMask = [];
let maskWidth = 0;
let maskHeight = 0;

/**
 * Informs the flood fill algorithm how large of a mask should be allocated.
 * Updating captured player areas of a size larger than this will result in errors.
 * @param {number} width
 * @param {number} height
 */
export function initializeMask(width, height) {
	floodFillMask = createArenaTiles(width, height);
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
	fillRect(floodFillMask, maskWidth, maskHeight, bounds, 0);

	/**
	 * Tests whether a node should be marked as 1 (not filled by the player, outside their area)
	 * or as 0 (filled by their player, or inside their area).
	 * @param {Vec2} coord
	 */
	function testFillNode(coord) {
		if (coord.x < bounds.min.x || coord.y < bounds.min.y) return false;
		if (coord.x >= bounds.max.x || coord.y >= bounds.max.y) return false;

		const alreadyFilled = floodFillMask[coord.x][coord.y];
		// We've already seen this node, so we can skip it.
		if (alreadyFilled) return false;

		const arenaValue = arenaTiles[coord.x][coord.y];
		return arenaValue != playerId;
	}

	// We could seed the flood fill along anywhere across the edge of the bounds really,
	// but we'll just go with the top left corner.
	const cornerSeed = bounds.min.clone();

	// We do a quick assertion to make sure our seed is not outside the bounds or already owned by the player.
	// There needs to be a border of one tile around the players area,
	// otherwise the floodfill algorithm won't be able to fully wrap around the player area.
	if (!testFillNode(cornerSeed)) {
		throw new Error("Assertion failed, expected the top left corner to get filled");
	}

	const nodes = [cornerSeed];

	// We also add seeds for all the player positions in the game,
	// Since we don't want players to just fill a large area around another player.
	for (const location of unfillableLocations) {
		const pos = new Vec2(location);
		nodes.push(
			pos.clone().add(0, 1),
			pos.clone().add(0, -1),
			pos.clone().add(1, 0),
			pos.clone().add(-1, 0),
		);
		// We don't need to do a `testFillNode` assertion for these seeds.
		// There are actually good reasons why player positions might not be valid nodes.
		// They could lie outside the bounds for instance, or maybe this player is currently inside the
		// captured area of the other player.
		// `unfillableLocations` will also contain the location of the player that is currently filling this area itself,
		// so this check should exclude the players own location as well.
	}

	while (true) {
		const node = nodes.pop();
		if (!node) break;
		if (testFillNode(node)) {
			floodFillMask[node.x][node.y] = 1;
			nodes.push(
				node.clone().add(0, 1),
				node.clone().add(0, -1),
				node.clone().add(1, 0),
				node.clone().add(-1, 0),
			);
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
			if (floodFillMask[x][y] == 0 || arenaTiles[x][y] == playerId) {
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
		return floodFillMask[x][y] == 0 && arenaTiles[x][y] != playerId;
	});

	return {
		/** The rectangles that need to be filled with tiles from the player in order to fill all gaps in their area. */
		fillRects,
		totalFilledTileCount,
		newBounds,
	};
}

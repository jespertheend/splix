import { Vec2 } from "renda";
import { createArenaTiles, fillRect } from "../util.js";

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
 * @param {import("../util.js").Rect} bounds
 * @param {[x: number, y: number][]} otherPlayerLocations
 */
export function updateCapturedArea(arenaTiles, playerId, bounds, otherPlayerLocations) {
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
		if (coord.x > bounds.max.x || coord.y > bounds.max.y) return false;

		const alreadyFilled = floodFillMask[coord.x][coord.y];
		// We've already seen this node, so we can skip it.
		if (alreadyFilled) return false;

		const arenaValue = arenaTiles[coord.x][coord.y];
		return arenaValue != playerId;
	}

	// We could seed the flood fill along anywhere across the edge of the bounds really,
	// but we'll just go with the top left corner.
	const seed = bounds.min.clone();

	if (!testFillNode(seed)) {
		throw new Error("Assertion failed, expected the top left corner to get filled");
	}

	const nodes = [seed];

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

	// At this point, the floodFillMask contains `0` values for each tile that needs to be filled.
	// We could send a long list of all coordinates that need to be filled.
	// But let's try to reduce this somewhat into larger rectangles.
	// We loop over each column of tiles and collect a set of sections that need to be filled.
	// Then for each column after that, we check if the sections are the same as the column on the left.
	// If so, we'll expand the rectangles from the previous column, otherwise we'll start with a new set of rectangles.
	const fillRects = [];

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
	for (let x = bounds.min.x; x < bounds.max.x; x++) {
		/** @type {Section[]} */
		const collectedSections = [];
		/** @type {Section?} */
		let currentlyMeasuringSection = null;
		for (let y = bounds.min.y; y < bounds.max.y; y++) {
			const tileShouldBeFilled = floodFillMask[x][y] == 0 && arenaTiles[x][y] != playerId;
			if (tileShouldBeFilled) {
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

		// Compare the current sections to that of the previous column.
		if (columnsEqual(previousSections, collectedSections)) {
			equalColumnCount++;
		} else {
			for (const section of previousSections) {
				fillRects.push({
					min: new Vec2(x - equalColumnCount - 1, section[0]),
					max: new Vec2(x, section[1]),
				});
			}
			equalColumnCount = 0;
			previousSections = collectedSections;
		}
	}

	return {
		/** The rectangles that need to be filled with tiles from the player in order to fill all gaps in their area. */
		fillRects,
	};
}

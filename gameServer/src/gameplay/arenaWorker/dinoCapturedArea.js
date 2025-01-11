import { Vec2 } from "renda";
import { compressTiles } from "../../util/util.js";
import { CircularQueue } from "../../util/CircularQueue.js";

let arenaWidth = 0;
let arenaHeight = 0;
let lineWidth = 0;

/** @type {Uint8Array} */
let matrix;

/** @type {CircularQueue} */
let queue;

/** @type {import("../../util/util.js").Rect} */
let $bounds;

/**
 * @param {number} width
 * @param {number} height
 */
export function dinoInitializeMask(width, height) {
	arenaWidth = width;
	arenaHeight = height;
	lineWidth = arenaHeight;
	matrix = new Uint8Array(arenaWidth * arenaHeight);
	queue = new CircularQueue(arenaWidth * arenaHeight);
}

const EMPTY_BLOCK = 0;
const PLAYER_BLOCK = 1;
const PLAYER_TRAIL = 9;
const FILLED_BLOCK = 4;
const BOUNDARY_VISITED = 2;
const BOUNDARY_SELECTED_PATH = 3;

/**
 * @param {number[][]} arenaTiles
 * @param {number} playerId
 * @param {import("../../util/util.js").Rect} bounds
 * @param {number[][]} vertices
 * @param {[x: number, y: number][]} unfillableLocations
 */
export function dinoCapturedArea(arenaTiles, playerId, bounds, vertices, unfillableLocations) {
	let filledTileCount = 0;

	$bounds = bounds;
	// initializeMask

	// dilate new bounds
	$bounds.min.subScalar(1);
	$bounds.max.addScalar(1);

	// fill the trail vertices on the mask
	const {trailPath, trailBounds} = getTrailPoints(vertices);

	// find a points at which the trail touches the player's land
	const [start, end] = findTouchingPoints(arenaTiles, playerId, trailPath, vertices[0], vertices[vertices.length - 1]);
	
	// walk the boundary and find a path
	const {shortestPath, pathBounds} = boundaryWalk(start, end, playerId, arenaTiles, trailPath);
	
	// merge bounds
	const closedBounds = {
		min: new Vec2(Math.min(trailBounds.min.x, pathBounds.min.x), Math.min(trailBounds.min.y, pathBounds.min.y)),
		max: new Vec2(Math.max(trailBounds.max.x, pathBounds.max.x), Math.max(trailBounds.max.y, pathBounds.max.y)),
	};
	
	// dilate bounds
	closedBounds.max.addScalar(1);
	closedBounds.min.subScalar(1);
	
	for(let i = closedBounds.min.x; i < closedBounds.max.x; i++) {
		for(let j = closedBounds.min.y; j < closedBounds.max.y; j++) {
			$matrix(i, j, EMPTY_BLOCK);
		}
	}
	
	// TEMP
	for (const point of trailPath) {
		matrix[point] = FILLED_BLOCK;
	}
	
	// TEMP
	for (const point of shortestPath) {
		matrix[point] = FILLED_BLOCK;
	}
	
	// TEMP
	// printer(closedBounds);
	
	
	// visualize bounds (visualising may interrupt floodfill)
	// $matrix(closedBounds.min.x, closedBounds.min.y, 7);
	// $matrix(closedBounds.max.x - 1, closedBounds.max.y - 1, 7);

	// floodfill the closed bounds
	floodfill(closedBounds, unfillableLocations);

	// print mask
	// printer($bounds);

	// pack the blocks that remains unfilled to rectangles
	const fillRects = compressTiles(closedBounds, (x, y) => {
		const index = x * lineWidth + y;
		const status = !(
			matrix[index] === FILLED_BLOCK
		);
		if (status) {
			filledTileCount++;
		}
		return status;
	});

	// erode new bounds
	$bounds.min.addScalar(1);
	$bounds.max.subScalar(1);

	return {
		fillRects,
		totalFilledTileCount: filledTileCount,
		newBounds: $bounds,
	};
}

/**
 * @param {import("../../util/util.js").Rect} closedBounds
 * @param {[x: number, y: number][]} unfillableLocations
 */
function floodfill(closedBounds, unfillableLocations) {
	queue.clear();

	/**
	 * Tests if a node can be filled.
	 * @param {number} x coord x
	 * @param {number} y coord y
	 * @param {number} index linear index -> x * lineWidth + y
	 * @returns {Boolean}
	 */
	function testFillNode(x, y, index) {
		if (
			x < closedBounds.min.x ||
			y < closedBounds.min.y ||
			x >= closedBounds.max.x ||
			y >= closedBounds.max.y
		) return false;

		if (matrix[index] === FILLED_BLOCK) {
			return false;
		}

		return true;
	}

	const cornerSeed = closedBounds.min.clone();

	if (!testFillNode(cornerSeed.x, cornerSeed.y, cornerSeed.x * lineWidth + cornerSeed.y)) {
		throw new Error("Assertion failed, expected the top left corner to get filled");
	}

	queue.enqueue(cornerSeed.x, cornerSeed.y);
	matrix[cornerSeed.x * lineWidth + cornerSeed.y] = FILLED_BLOCK;

	for (const node of unfillableLocations) {
		const offset = node[0] * lineWidth;
		if (testFillNode(node[0], node[1] + 1, offset + node[1] + 1)) {
			matrix[offset + node[1] + 1] = FILLED_BLOCK;
			queue.enqueue(node[0], node[1] + 1);
		}
		if (testFillNode(node[0], node[1] - 1, offset + node[1] - 1)) {
			matrix[offset + node[1] - 1] = FILLED_BLOCK;
			queue.enqueue(node[0], node[1] - 1);
		}
		if (testFillNode(node[0] + 1, node[1], offset + lineWidth + node[1])) {
			matrix[offset + lineWidth + node[1]] = FILLED_BLOCK;
			queue.enqueue(node[0] + 1, node[1]);
		}
		if (testFillNode(node[0] - 1, node[1], offset - lineWidth + node[1])) {
			matrix[offset - lineWidth + node[1]] = FILLED_BLOCK;
			queue.enqueue(node[0] - 1, node[1]);
		}
	}

	while (!queue.isEmpty()) {
		const node = queue.dequeue();
		if (!node) continue;

		const offset = node[0] * lineWidth;
		if (testFillNode(node[0], node[1] + 1, offset + node[1] + 1)) {
			matrix[offset + node[1] + 1] = FILLED_BLOCK;
			queue.enqueue(node[0], node[1] + 1);
		}
		if (testFillNode(node[0], node[1] - 1, offset + node[1] - 1)) {
			matrix[offset + node[1] - 1] = FILLED_BLOCK;
			queue.enqueue(node[0], node[1] - 1);
		}
		if (testFillNode(node[0] + 1, node[1], offset + lineWidth + node[1])) {
			matrix[offset + lineWidth + node[1]] = FILLED_BLOCK;
			queue.enqueue(node[0] + 1, node[1]);
		}
		if (testFillNode(node[0] - 1, node[1], offset - lineWidth + node[1])) {
			matrix[offset - lineWidth + node[1]] = FILLED_BLOCK;
			queue.enqueue(node[0] - 1, node[1]);
		}
	}
}

/**
 * @param {number[]} start
 * @param {number[]} end
 * @param {number} playerId
 * @param {number[][]} arenaTiles
 * @param {Set<number>} trailPath
 */
function boundaryWalk(start, end, playerId, arenaTiles, trailPath) {
	/** @param {import("../../util/util.js").Rect} bounds */
	const pathBounds = {
		min: new Vec2(Infinity, Infinity),
		max: new Vec2(-Infinity, -Infinity),
	};

	/** @type {Array<[number[], number]>} */
	const queue = [[start, 0]];

	/** @type {Object<string, string | null>} */
	const parentMap = {};

	/** @type {Set<string>} */
	const visitedSet = new Set();

	const shortestPath = new Set();

	parentMap[`${start[0]},${start[1]}`] = null;

	while (queue.length > 0) {
		const element = queue.shift();
		if (!element) {
			continue;
		}
		const [node, distance] = element;
		const [i, j] = node;

		if (visitedSet.has(`${i},${j}`)) {
			continue;
		}

		visitedSet.add(`${i},${j}`);

		if (i === end[0] && j === end[1]) {
			/** @type {number[][]} */
			let path = [];

			let currentKey = `${node[0]},${node[1]}`;
			while (currentKey) {
				let [ci, cj] = currentKey.split(",").map(Number);
				path.push([ci, cj]);
				currentKey = parentMap[currentKey] || "";
			}
			for (let [i, j] of path) {
				pathBounds.min.x = Math.min(pathBounds.min.x, i);
				pathBounds.min.y = Math.min(pathBounds.min.y, j);
				pathBounds.max.x = Math.max(pathBounds.max.x, i + 1);
				pathBounds.max.y = Math.max(pathBounds.max.y, j + 1);
				shortestPath.add(i * lineWidth + j);
			}
			break;
		}

		const edges = getSignalEdge([i, j], playerId, arenaTiles, trailPath);
		for (let edge of edges) {
			let edgeKey = `${edge[0]},${edge[1]}`;
			if (!visitedSet.has(edgeKey)) {
				if (!parentMap[edgeKey]) {
					queue.push([edge, distance + 1]);
					parentMap[edgeKey] = `${node[0]},${node[1]}`;
				}
			}
		}
	}

	return {shortestPath, pathBounds};
}

/**
 * @param {number[][]} vertices
 */
function getTrailPoints(vertices) {
	/** @param {import("../../util/util.js").Rect} bounds */
	let trailBounds = {
		min: new Vec2(Infinity, Infinity),
		max: new Vec2(-Infinity, -Infinity),
	};

	const trailPath = new Set();

	if (vertices.length === 1) {
		const vertex = vertices[0];
		trailPath.add(vertex[0] * lineWidth + vertex[1]);

		trailBounds.min.x = Math.min(trailBounds.min.x, vertex[0]);
		trailBounds.min.y = Math.min(trailBounds.min.y, vertex[1]);
		trailBounds.max.x = Math.max(trailBounds.max.x, vertex[0] + 1);
		trailBounds.max.y = Math.max(trailBounds.max.y, vertex[1] + 1);
	}

	for (let i = 0; i < vertices.length - 1; i++) {
		const vertexA = vertices[i];
		const vertexB = vertices[i + 1];
		if (vertexA[0] != vertexB[0] && vertexA[1] != vertexB[1]) {
			throw new Error("Assertion failed, tried to fill a player trail with a diagonal edge.");
		}

		// Sort the two corners so that `min` is always in the top left.
		const minX = Math.min(vertexA[0], vertexB[0]);
		const minY = Math.min(vertexA[1], vertexB[1]);
		const maxX = Math.max(vertexA[0], vertexB[0]) + 1;
		const maxY = Math.max(vertexA[1], vertexB[1]) + 1;

		trailBounds.min.x = Math.min(trailBounds.min.x, minX);
		trailBounds.min.y = Math.min(trailBounds.min.y, minY);
		trailBounds.max.x = Math.max(trailBounds.max.x, maxX);
		trailBounds.max.y = Math.max(trailBounds.max.y, maxY);

		for (let x = minX; x < maxX; x++) {
			for (let y = minY; y < maxY; y++) {
				trailPath.add(x * lineWidth + y);
			}
		}
	}
	return {trailPath, trailBounds};
}

/**
 * @param {number[]} center
 * @param {number} playerId
 * @param {number[][]} arenaTiles
 * @param {Set<number>} trailPath
 */
function getSignalEdge(center, playerId, arenaTiles, trailPath) {
	const directions = [
		[0, 1], // right
		[-1, 1], // up-right
		[-1, 0], // up
		[-1, -1], // up-left
		[0, -1], // left
		[1, -1], // down-left
		[1, 0], // down
		[1, 1], // down-right
	];

	const [i, j] = center;

	const ring = [];
	for (let dir of directions) {
		let ni = i + dir[0];
		let nj = j + dir[1];
		let status = false;
		if (isInsideArena(ni, nj)) {
			status = arenaTiles[ni][nj] === playerId && !trailPath.has(ni * lineWidth + nj);
		}
		ring.push({ status: status, coord: [ni, nj] });
	}

	const edges = [];
	for (let i = 0; i < ring.length; i++) {
		if (!ring[i].status && ring[(i + 1) % ring.length].status) {
			edges.push(ring[(i + 1) % ring.length].coord);
		} else if (ring[i].status && !ring[(i + 1) % ring.length].status) {
			edges.push(ring[i].coord);
		}
	}
	return edges;
}

/**
 * @param {number} i
 * @param {number} j
 * @returns {boolean}
 */
function isInsideArena(i, j) {
	return i >= 0 && i < arenaWidth && j >= 0 && j < arenaHeight;
}

/**
 * @param {number[][]} arenaTiles
 * @param {number} playerId
 * @param {Set<number>} trailPath
 * @param {number[]} start
 * @param {number[]} end
 */
function findTouchingPoints(arenaTiles, playerId, trailPath, start, end) {
	let startNeighbors = [];
	let endNeighbors = [];

	const directions = [
		[0, 1], // right
		[-1, 0], // up
		[0, -1], // left
		[1, 0], // down
	];

	for (const dir of directions) {
		let si = start[0] + dir[0];
		let sj = start[1] + dir[1];
		let ei = end[0] + dir[0];
		let ej = end[1] + dir[1];

		if (
			isInsideArena(si,sj) &&
			arenaTiles[si][sj] === playerId &&
			!trailPath.has(si * lineWidth + sj)
		) {
			startNeighbors.push([si, sj]);
		}
		if (
			isInsideArena(ei,ej) &&
			arenaTiles[ei][ej] === playerId &&
			!trailPath.has(ei * lineWidth + ej)
		) {
			endNeighbors.push([ei, ej]);
		}
	}

	startNeighbors.push(start);

	for (const startPoint of startNeighbors) {
		for (const endPoint of endNeighbors) {
			if (startPoint[0] !== endPoint[0] || startPoint[1] !== endPoint[1]) {
				return [startPoint, endPoint];
			}
		}
	}

	return [start, end];
}

/**
 * @param {import("../../util/util.js").Rect} bounds
 */
function printer(bounds) {
	for (let j = bounds.min.y; j < bounds.max.y; j++) {
		let line = "";
		for (let i = bounds.min.x; i < bounds.max.x; i++) {
			if ($matrix(i, j) == EMPTY_BLOCK) {
				line += "\x1b[37m  "; // White
			} else if ($matrix(i, j) == PLAYER_BLOCK) {
				line += "\x1b[31m██"; // Red
			} else if ($matrix(i, j) == PLAYER_TRAIL) {
				line += "\x1b[33m░░"; // Yellow
			} else if ($matrix(i, j) == BOUNDARY_VISITED) {
				line += "\x1b[34m▒▒"; // Blue
			} else if ($matrix(i, j) == BOUNDARY_SELECTED_PATH) {
				line += "\x1b[32m▓▓"; // Green
			} else {
				line += "\x1b[37m██"; // White
			}
		}
		console.log(line + "\x1b[0m");
	}
}

/**
 * @param {number} i
 * @param {number} j
 * @param {number | undefined} val
 * @returns
 */
function $matrix(i, j, val = undefined) {
	if (i < $bounds.min.x || i >= $bounds.max.x || j < $bounds.min.y || j >= $bounds.max.y) {
		return -1;
	}
	if (val !== undefined) {
		matrix[i * lineWidth + j] = val;
	}
	return matrix[i * lineWidth + j];
}

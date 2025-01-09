import { Vec2 } from "renda";

let maskWidth = 0;
let maskHeight = 0;
let lineWidth = 0;

/** @type {Uint8Array} */
let matrix;

/** @type {import("../../util/util.js").Rect} */
let $bounds;

/**
 * @param {number} width
 * @param {number} height
 */
export function dinoInitializeMask(width, height) {
	maskWidth = width;
	maskHeight = height;
	lineWidth = maskHeight;
	matrix = new Uint8Array(maskWidth * maskHeight);
}

const EMPTY_BLOCK = 0;
const PLAYER_BLOCK = 1;
const PLAYER_TRAIL = 9;
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
	$bounds = bounds;

	// dilate bounds
	bounds.min.subScalar(1);
	bounds.max.addScalar(1);

	// generate mask
	for (let i = bounds.min.x; i < bounds.max.x; i++) {
		const offset = i * lineWidth;
		for (let j = bounds.min.y; j < bounds.max.y; j++) {
			if (arenaTiles[i][j] == playerId) {
				matrix[offset + j] = PLAYER_BLOCK;
			} else {
				matrix[offset + j] = EMPTY_BLOCK;
			}
		}
	}

	// fill the trail vertices on the mask
	const trailBounds = fillPlayerTrail(vertices, PLAYER_TRAIL);

	// walk the boundary and find a path
	const start = vertices[0];
	const end = vertices[vertices.length - 1];
	$matrix(start[0], start[1], PLAYER_BLOCK);
	$matrix(end[0], end[1], PLAYER_BLOCK);
	const pathBounds = boundaryWalk(start, end);
	$matrix(start[0], start[1], PLAYER_TRAIL);
	$matrix(end[0], end[1], PLAYER_TRAIL);

	// merge bounds
	const closedBounds = {
		min: new Vec2(Math.min(trailBounds.min.x, pathBounds.min.x), Math.min(trailBounds.min.y, pathBounds.min.y)),
		max: new Vec2(Math.max(trailBounds.max.x, pathBounds.max.x), Math.max(trailBounds.max.y, pathBounds.max.y)),
	};
	
	// dilate bounds
	closedBounds.max.addScalar(1);
	closedBounds.min.subScalar(1);

	$matrix(closedBounds.min.x, closedBounds.min.y, 7);
	$matrix(closedBounds.max.x - 1, closedBounds.max.y - 1, 7);

	// print mask
	printer();
}


/**
 * @param {number[]} start
 * @param {number[]} end
 */
function boundaryWalk(start, end) {

	/** @param {import("../../util/util.js").Rect} bounds */
	const pathBounds = {
		min: new Vec2(Infinity, Infinity),
		max: new Vec2(-Infinity, -Infinity),
	};

	/** @type {Array<[number[], number]>} */
	const queue = [[start, 0]];

	/** @type {Object<string, string | null>} */
	const parentMap = {};

	parentMap[`${start[0]},${start[1]}`] = null;

	while (queue.length > 0) {
		const element = queue.shift(); 
		if (!element) {
			continue;
		}
		const [node, distance] = element;
		const [i, j] = node;

		if ($matrix(i, j) === BOUNDARY_VISITED) {
			continue;
		}

		$matrix(i, j, BOUNDARY_VISITED);

		if (i === end[0] && j === end[1]) {
			/** @type {number[][]} */
			let path = [];

			let currentKey = `${node[0]},${node[1]}`;
			while (currentKey) {
				let [ci, cj] = currentKey.split(',').map(Number);
				path.push([ci, cj]);
				currentKey = parentMap[currentKey] || '';
			}
			for(let [i, j] of path){
				pathBounds.min.x = Math.min(pathBounds.min.x, i);
				pathBounds.min.y = Math.min(pathBounds.min.y, j);
				pathBounds.max.x = Math.max(pathBounds.max.x, i + 1);
				pathBounds.max.y = Math.max(pathBounds.max.y, j + 1);
				$matrix(i, j, BOUNDARY_SELECTED_PATH);
			}
			break;
		}

		const edges = getSignalEdge([i, j]);
		for (let edge of edges) {
			let edgeKey = `${edge[0]},${edge[1]}`;
			if ($matrix(edge[0], edge[1]) !== BOUNDARY_VISITED) {
				if (!parentMap[edgeKey]) {
					queue.push([edge, distance + 1]);
					parentMap[edgeKey] = `${node[0]},${node[1]}`;
				}
			}
		}
	}

	return pathBounds;
}


/** 
 * @param {number[][]} vertices
 * @param {number} value
 */
function fillPlayerTrail(vertices, value) {
		/** @param {import("../../util/util.js").Rect} bounds */
		let trailBounds = {
			min: new Vec2(Infinity, Infinity),
			max: new Vec2(-Infinity, -Infinity),
		};
		
		if (vertices.length === 1) {
			const vertex = vertices[0];
			$matrix(vertex[0] ,vertex[1],value);

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

			for(let x = minX; x < maxX; x++){
				for(let y = minY; y < maxY; y++){
					$matrix(x,y,value);
				}
			}
		}
		return trailBounds;
}

/**
 * @param {number[]} center
 */
function getSignalEdge(center) {
    const directions = [
        [0, 1],   // right
        [-1, 1],  // up-right
        [-1, 0],  // up
        [-1, -1], // up-left
        [0, -1],  // left
        [1, -1],  // down-left
        [1, 0],   // down
        [1, 1]    // down-right
    ];

    const [i, j] = center;

    const ring = [];
    for (let dir of directions) {
        let ni = i + dir[0];
        let nj = j + dir[1];
        ring.push({ val: $matrix(ni, nj), coord: [ni, nj] });
    }

    const edges = [];
    for (let i = 0; i < ring.length; i++) {
        if (ring[i].val === EMPTY_BLOCK && ring[(i + 1) % ring.length].val === PLAYER_BLOCK) {
            edges.push(ring[(i + 1) % ring.length].coord);
        } else if (ring[i].val === PLAYER_BLOCK && ring[(i + 1) % ring.length].val === EMPTY_BLOCK) {
            edges.push(ring[i].coord);
        }
    }
    return edges;
}

function printer() {
    for (let j = $bounds.min.y; j < $bounds.max.y; j++) {
        let line = "";
        for (let i = $bounds.min.x; i < $bounds.max.x; i++) {
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
		matrix[i * maskWidth + j] = val;
	}
	return matrix[i * maskWidth + j];
}

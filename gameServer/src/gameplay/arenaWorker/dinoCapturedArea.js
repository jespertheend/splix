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

/**
 * @param {number[][]} arenaTiles
 * @param {number} playerId
 * @param {import("../../util/util.js").Rect} bounds
 * @param {[x: number, y: number][]} vertices
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
	fillPlayerTrail(vertices, PLAYER_TRAIL);

	// print mask
	printer();
}


/** 
 * @param {[x: number, y: number][]} vertices
 * @param {number} value
 */
function fillPlayerTrail(vertices, value) {
		if (vertices.length === 1) {
			const vertex = vertices[0];
			$matrix(vertex[0] ,vertex[1],value);
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

			for(let x = minX; x < maxX; x++){
				for(let y = minY; y < maxY; y++){
					$matrix(x,y,value);
				}
			}
		}
}



function printer() {
	for (let j = $bounds.min.y; j < $bounds.max.y; j++) {
		let line = "";
		for (let i = $bounds.min.x; i < $bounds.max.x; i++) {
			if ($matrix(i, j) == EMPTY_BLOCK) {
				line += "  ";
			} else if ($matrix(i, j) == PLAYER_BLOCK) {
				line += "██";
			} else if ($matrix(i,j) == PLAYER_TRAIL) {
				line += "▒▒"
			}
		}
		console.log(line);
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

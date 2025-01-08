let maskWidth = 0;
let maskHeight = 0;
let lineWidth = 0;

/** @type {Uint8Array} */
let matrix;

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

/**
 * @param {number[][]} arenaTiles
 * @param {number} playerId
 * @param {import("../../util/util.js").Rect} bounds
 * @param {[x: number, y: number][]} unfillableLocations
 */
export function dinoCapturedArea(arenaTiles, playerId, bounds, unfillableLocations) {
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

	// print mask
	printer(bounds);
}

/**
 * @param {import("../../util/util.js").Rect} bounds
 */
function printer(bounds) {
	for (let j = bounds.min.y; j < bounds.max.y; j++) {
		let line = "";
		for (let i = bounds.min.x; i < bounds.max.x; i++) {
			if (matrix[i * lineWidth + j] == EMPTY_BLOCK) {
				line += "  ";
			} else if (matrix[i * lineWidth + j] == PLAYER_BLOCK) {
				line += "██";
			}
		}
		console.log(line);
	}
}

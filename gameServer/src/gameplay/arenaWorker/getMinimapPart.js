import { mapValue, Vec2 } from "renda";

/**
 * @param {number} part
 * @param {number} arenaWidth
 * @param {number} arenaHeight
 * @param {number[][]} arenaTiles
 */
export function getMinimapPart(part, arenaWidth, arenaHeight, arenaTiles) {
	const minimapChunkWidth = 20;
	const minimapChunkHeight = 80;
	const minmapXOffset = part * minimapChunkWidth;
	const mapChunkWidth = arenaWidth / 4;
	const mapXOffset = part * mapChunkWidth;

	/** @type {import("../../util/util.js").Rect} */
	const minimapRect = {
		min: new Vec2(minmapXOffset, 0),
		max: new Vec2(minmapXOffset + minimapChunkWidth, minimapChunkHeight),
	};

	/** @type {import("../../util/util.js").Rect} */
	const mapRect = {
		min: new Vec2(mapXOffset, 0),
		max: new Vec2(mapXOffset + mapChunkWidth, arenaHeight),
	};

	const buffer = new ArrayBuffer(Math.ceil(minimapChunkWidth * minimapChunkHeight / 8));
	const view = new Uint8Array(buffer);

	for (let i = 0; i < buffer.byteLength; i++) {
		let byte = 0;
		for (let j = 0; j < 8; j++) {
			const coordIndex = i * 8 + j;
			const minimapCoord = indexToRectCoord(coordIndex, minimapRect);
			let x = mapValue(minimapCoord.x, minimapRect.min.x, minimapRect.max.x, mapRect.min.x, mapRect.max.x);
			let y = mapValue(minimapCoord.y, minimapRect.min.y, minimapRect.max.y, mapRect.min.y, mapRect.max.y);
			x = Math.floor(x);
			y = Math.floor(y);
			const isFilled = arenaTiles[x][y] > 0;
			byte = byte | ((isFilled ? 1 : 0) << j);
		}
		view[i] = byte;
	}

	return buffer;
}

/**
 * Maps an index to a coordinate inside a rectangle.
 * The coords start in the top left corner and then moves down.
 * I.e. 0 maps to x0 y0, 1 maps to x0 y1 and so on until the next column is reached.
 * @param {number} index
 * @param {import("../../util/util.js").Rect} rect
 */
function indexToRectCoord(index, rect) {
	const height = rect.max.y - rect.min.y;
	const x = Math.floor(index / height);
	const y = index % height;
	return new Vec2(x + rect.min.x, y + rect.min.y);
}

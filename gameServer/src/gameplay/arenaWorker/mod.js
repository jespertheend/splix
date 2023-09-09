import { TypedMessenger, Vec2 } from "renda";
import { compressTiles, createArenaTiles, serializeRect } from "../../util/util.js";
import { PLAYER_SPAWN_RADIUS } from "../../config.js";
import { fillRect } from "../../util/util.js";
import { initializeMask, updateCapturedArea } from "./updateCapturedArea.js";
import { PlayerBoundsTracker } from "./PlayerBoundsTracker.js";
import { getMinimapPart } from "./getMinimapPart.js";

/**
 * Stores which tiles have been filled and by which player.
 * -1 = border
 *  0 = empty
 * 1+ = player id
 * @type {number[][]}
 */
let arenaTiles = [];
let arenaWidth = 0;
let arenaHeight = 0;

const boundsTracker = new PlayerBoundsTracker();

const arenaWorkerHandlers = {
	/**
	 * @param {number} width
	 * @param {number} height
	 */
	init(width, height) {
		arenaWidth = width;
		arenaHeight = height;
		arenaTiles = createArenaTiles(width, height);
		initializeMask(width, height);
	},
	/**
	 * Fills the spawn area tiles around a player.
	 * @param {number} x
	 * @param {number} y
	 * @param {number} playerId
	 */
	fillPlayerSpawn(x, y, playerId) {
		const center = new Vec2(x, y);
		const rect = {
			min: center.clone().subScalar(PLAYER_SPAWN_RADIUS),
			max: center.clone().addScalar(PLAYER_SPAWN_RADIUS + 1),
		};
		fillTilesRect(rect, playerId);
		boundsTracker.initializePlayer(playerId, rect);
	},
	/**
	 * Fills the tiles that are covered with a player trail.
	 * @param {[x: number, y: number][]} vertices
	 * @param {number} playerId
	 */
	fillPlayerTrail(vertices, playerId) {
		const verticesVec2 = vertices.map((v) => new Vec2(v[0], v[1]));
		for (let i = 0; i < verticesVec2.length - 1; i++) {
			const vertexA = verticesVec2[i];
			const vertexB = verticesVec2[i + 1];
			if (vertexA.x != vertexB.x && vertexA.y != vertexB.y) {
				throw new Error("Assertion failed, tried to fill a player trail with a diagonal edge.");
			}

			// Sort the two corners so that `min` is always in the top left.
			const minX = Math.min(vertexA.x, vertexB.x);
			const minY = Math.min(vertexA.y, vertexB.y);
			const maxX = Math.max(vertexA.x, vertexB.x) + 1;
			const maxY = Math.max(vertexA.y, vertexB.y) + 1;

			fillTilesRect({
				min: new Vec2(minX, minY),
				max: new Vec2(maxX, maxY),
			}, playerId);
		}
		for (const vertex of verticesVec2) {
			boundsTracker.expandBoundsWithPoint(playerId, vertex);
		}
	},
	/**
	 * Finds unfilled areas of the player and fills them.
	 * @param {number} playerId
	 * @param {[x: number, y: number][]} otherPlayerLocations
	 */
	updateCapturedArea(playerId, otherPlayerLocations) {
		const bounds = boundsTracker.getBounds(playerId);
		const { fillRects, totalFilledTileCount } = updateCapturedArea(
			arenaTiles,
			playerId,
			bounds,
			otherPlayerLocations,
		);
		for (const { rect } of fillRects) {
			fillTilesRect(rect, playerId);
		}
		return totalFilledTileCount;
	},
	/**
	 * @param {number} playerId
	 */
	clearAllPlayerTiles(playerId) {
		const bounds = boundsTracker.getBounds(playerId);

		const rects = compressTiles(bounds, (x, y) => {
			return arenaTiles[x][y] == playerId;
		});

		for (const { rect } of rects) {
			fillTilesRect(rect, 0);
		}

		boundsTracker.deletePlayer(playerId);
	},
	/**
	 * @param {number} part Which part of the client canvas to fill, value of 0, 1, 2, or 3
	 */
	getMinimapPart(part) {
		return getMinimapPart(part, arenaWidth, arenaHeight, arenaTiles);
	},
};

/** @type {TypedMessenger<ArenaWorkerHandlers, import("../Arena.js").WorkerArenaHandlers>} */
const messenger = new TypedMessenger();
messenger.initialize(globalThis, arenaWorkerHandlers);

/** @typedef {typeof arenaWorkerHandlers} ArenaWorkerHandlers */

/**
 * Fills a portion of the arena and notifies the main process about the change.
 * @param {import("../../util/util.js").Rect} rect
 * @param {number} playerId
 */
function fillTilesRect(rect, playerId) {
	fillRect(arenaTiles, arenaWidth, arenaHeight, rect, playerId);
	messenger.send.notifyAreasFilled([{
		rect: {
			minX: rect.min.x,
			minY: rect.min.y,
			maxX: rect.max.x,
			maxY: rect.max.y,
		},
		tileValue: playerId,
	}]);
}

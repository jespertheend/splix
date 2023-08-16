import { TypedMessenger, Vec2 } from "renda";
import { createArenaTiles } from "./util.js";
import { PLAYER_SPAWN_RADIUS } from "../../config.js";
import { fillRect } from "./util.js";

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

const arenaWorkerHandlers = {
	/**
	 * @param {number} width
	 * @param {number} height
	 */
	init(width, height) {
		arenaWidth = width;
		arenaHeight = height;
		arenaTiles = createArenaTiles(width, height);
	},
	/**
	 * Fills the spawn area tiles around a player.
	 * @param {number} x
	 * @param {number} y
	 * @param {number} playerId
	 */
	fillPlayerSpawn(x, y, playerId) {
		const center = new Vec2(x, y);
		fillTilesRect({
			min: center.clone().subScalar(PLAYER_SPAWN_RADIUS),
			max: center.clone().addScalar(PLAYER_SPAWN_RADIUS + 1),
		}, playerId);
	},
	/**
	 * Fills the tiles that are covered with a player trail.
	 * @param {[x: number, y: number][]} vertices
	 * @param {number} playerId
	 */
	fillPlayerTrail(vertices, playerId) {
		for (let i = 0; i < vertices.length - 1; i++) {
			const vertexA = vertices[i];
			const vertexB = vertices[i + 1];
			const [ax, ay] = vertexA;
			const [bx, by] = vertexB;
			if (ax != bx && ay != by) {
				throw new Error("Assertion failed, tried to fill a player trail with a diagonal edge.");
			}

			// Sort the two corners so that `min` is always in the top left.
			const minX = Math.min(ax, bx);
			const minY = Math.min(ay, by);
			const maxX = Math.max(ax, bx) + 1;
			const maxY = Math.max(ay, by) + 1;

			fillTilesRect({
				min: new Vec2(minX, minY),
				max: new Vec2(maxX, maxY),
			}, playerId);
		}
	},
};

/** @type {TypedMessenger<ArenaWorkerHandlers, import("../Arena.js").WorkerArenaHandlers>} */
const messenger = new TypedMessenger();
messenger.initialize(globalThis, arenaWorkerHandlers);

/** @typedef {typeof arenaWorkerHandlers} ArenaWorkerHandlers */

/**
 * Fills a portion of the arena and notifies the main process about the change.
 * @param {import("../Arena.js").Rect} rect
 * @param {number} playerId
 */
function fillTilesRect(rect, playerId) {
	fillRect(arenaTiles, arenaWidth, arenaHeight, rect, playerId);
	messenger.send.notifyAreasFilled([{
		minX: rect.min.x,
		minY: rect.min.y,
		maxX: rect.max.x,
		maxY: rect.max.y,
		tileValue: playerId,
	}]);
}

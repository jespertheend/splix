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
		const rect = {
			min: center.clone().subScalar(PLAYER_SPAWN_RADIUS),
			max: center.clone().addScalar(PLAYER_SPAWN_RADIUS + 1),
		};
		fillRect(arenaTiles, arenaWidth, arenaHeight, rect, playerId);
		messenger.send.notifyAreasFilled([{
			minX: rect.min.x,
			minY: rect.min.y,
			maxX: rect.max.x,
			maxY: rect.max.y,
			playerId: playerId,
		}]);
	},
};

/** @type {TypedMessenger<import("../Arena.js").WorkerArenaHandlers, ArenaWorkerHandlers>} */
const messenger = new TypedMessenger();
messenger.initialize(globalThis, arenaWorkerHandlers);

/** @typedef {typeof arenaWorkerHandlers} ArenaWorkerHandlers */

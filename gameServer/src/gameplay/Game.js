/** @typedef {"default" | "teams"} GameModes */

import { lerp, SingleInstancePromise, Vec2 } from "renda";
import { Arena } from "./Arena.js";
import { Player } from "./Player.js";
import { WebSocketConnection } from "../WebSocketConnection.js";
import {
	LEADERBOARD_UPDATE_FREQUENCY,
	MINIMAP_PART_UPDATE_FREQUENCY,
	PLAYER_SPAWN_RADIUS,
	REQUIRED_PLAYER_COUNT_FOR_GLOBAL_LEADERBOARD,
} from "../config.js";
import { ApplicationLoop } from "../ApplicationLoop.js";

/**
 * @typedef TileTypeForMessage
 * @property {number} colorId
 * @property {number} patternId
 */

export class Game {
	#arena;

	get arena() {
		return this.#arena;
	}

	/** @type {ArrayBuffer[]} */
	#minimapMessages = [];
	#updateNextMinimapPartInstance;
	#lastMinimapUpdateTime = 0;
	#lastMinimapPart = 0;
	#lastLeaderboardSendTime = 0;
	/** @type {ArrayBuffer?} */
	#lastLeaderboardMessage = null;

	get lastLeaderboardMessage() {
		return this.#lastLeaderboardMessage;
	}

	/**
	 * @param {ApplicationLoop} applicationLoop
	 * @param {Object} options
	 * @param {number} [options.arenaWidth]
	 * @param {number} [options.arenaHeight]
	 * @param {GameModes} [options.gameMode]
	 */
	constructor(applicationLoop, {
		arenaWidth = 600,
		arenaHeight = 600,
	} = {}) {
		this.#arena = new Arena(arenaWidth, arenaHeight);
		this.#arena.onRectFilled((rect, tileValue) => {
			for (const player of this.getOverlappingViewportPlayersForRect(rect)) {
				const { colorId, patternId } = this.getTileTypeForMessage(player, tileValue);
				player.connection.sendFillRect(rect, colorId, patternId);
			}
		});

		this.#updateNextMinimapPartInstance = new SingleInstancePromise(() => this.#updateNextMinimapPart());

		applicationLoop.onSlowTickEnded(() => {
			for (const player of this.#players.values()) {
				this.broadcastPlayerTrail(player);
				this.broadcastPlayerState(player);
				player.sendPlayerStateToPlayer(player);
			}
		});
	}

	/**
	 * @param {number} now
	 * @param {number} dt
	 */
	loop(now, dt) {
		for (const player of this.#players.values()) {
			player.loop(now, dt);
		}

		if (now - this.#lastMinimapUpdateTime > MINIMAP_PART_UPDATE_FREQUENCY) {
			this.#lastMinimapUpdateTime = now;
			this.#updateNextMinimapPartInstance.run();
		}

		if (now - this.#lastLeaderboardSendTime > LEADERBOARD_UPDATE_FREQUENCY) {
			this.#lastLeaderboardSendTime = now;
			this.#sendLeaderboard();
		}
	}

	#lastPlayerId = 0;
	#getNewPlayerId() {
		while (true) {
			this.#lastPlayerId++;
			if (this.#lastPlayerId >= Math.pow(2, 16) - 1) {
				this.#lastPlayerId = 0;
			}
			let exists = false;
			for (const existingId of this.#players.keys()) {
				if (this.#lastPlayerId == existingId) {
					exists = true;
					break;
				}
			}
			if (!exists && this.#lastPlayerId != 0) {
				return this.#lastPlayerId;
			}
		}
	}

	/** @type {Map<number, Player>} */
	#players = new Map();

	/**
	 * @param {WebSocketConnection} connection
	 * @param {import("./Player.js").CreatePlayerOptions} playerOptions
	 */
	createPlayer(connection, playerOptions) {
		const id = this.#getNewPlayerId();
		const player = new Player(id, this, connection, playerOptions);
		this.#players.set(id, player);
		this.#fireOnPlayerCountChange();
		return player;
	}

	/**
	 * @returns {{position: Vec2, direction: import("./Player.js").UnpausedDirection}}
	 */
	getNewSpawnPosition() {
		const position = new Vec2(
			Math.floor(lerp(PLAYER_SPAWN_RADIUS + 1, this.arena.width - PLAYER_SPAWN_RADIUS - 1, Math.random())),
			Math.floor(lerp(PLAYER_SPAWN_RADIUS + 1, this.arena.height - PLAYER_SPAWN_RADIUS - 1, Math.random())),
		);
		/** @type {{direction: import("./Player.js").UnpausedDirection, distance: number}[]} */
		const wallDistances = [
			{
				direction: "up",
				distance: this.arena.height - position.y,
			},
			{
				direction: "down",
				distance: position.y,
			},
			{
				direction: "right",
				distance: position.x,
			},
			{
				direction: "left",
				distance: this.arena.width - position.x,
			},
		];
		let closestWall = null;
		for (const wall of wallDistances) {
			if (!closestWall || wall.distance < closestWall.distance) {
				closestWall = wall;
			}
		}
		return {
			position,
			direction: closestWall?.direction || "up",
		};
	}

	/**
	 * @param {Player} player
	 */
	removePlayer(player) {
		if (this.#players.size == REQUIRED_PLAYER_COUNT_FOR_GLOBAL_LEADERBOARD) {
			// If the current player count is REQUIRED_PLAYER_COUNT_FOR_GLOBAL_LEADERBOARD,
			// then once this player is removed scores will no longer be counted.
			// We want to at least report the current player scores, that way their progress wasn't all for nothing.
			// Global scores are deduplicated based on the player name,
			// so the fact that we might report a score for these players a second time shouldn't be an issue.
			for (const player of this.#players.values()) {
				this.#reportPlayerScore(player.getGlobalLeaderboardScore());
			}
		} else {
			this.#reportPlayerScore(player.getGlobalLeaderboardScore());
		}
		player.removedFromGame();
		this.#players.delete(player.id);
		this.#fireOnPlayerCountChange();
	}

	/** @typedef {(count: number) => void} OnPlayerCountChangeCallback */

	/** @type {Set<OnPlayerCountChangeCallback>} */
	#onPlayerCountChangeCbs = new Set();

	/**
	 * @param {OnPlayerCountChangeCallback} cb
	 */
	onPlayerCountChange(cb) {
		this.#onPlayerCountChangeCbs.add(cb);
	}

	#fireOnPlayerCountChange() {
		this.#onPlayerCountChangeCbs.forEach((cb) => cb(this.#players.size));
	}

	/** @typedef {(score: import("../../../serverManager/src/LeaderboardManager.js").PlayerScoreData) => void} OnPlayerScoreReportedCallback */

	/** @type {Set<OnPlayerScoreReportedCallback>} */
	#onPlayerScoreReportedCbs = new Set();

	/**
	 * @param {OnPlayerScoreReportedCallback} cb
	 */
	onPlayerScoreReported(cb) {
		this.#onPlayerScoreReportedCbs.add(cb);
	}

	/**
	 * @param {import("../../../serverManager/src/LeaderboardManager.js").PlayerScoreData} score
	 */
	#reportPlayerScore(score) {
		if (this.#players.size < REQUIRED_PLAYER_COUNT_FOR_GLOBAL_LEADERBOARD) return;
		this.#onPlayerScoreReportedCbs.forEach((cb) => cb(score));
	}

	/**
	 * Gets a chunk of the arena and compresses it into rectangles,
	 * ready to be sent to clients.
	 * @param {import("../util/util.js").Rect} rect
	 * @param {Player} receivingPlayer
	 */
	getArenaChunkForMessage(rect, receivingPlayer) {
		return this.#arena.getChunk(rect, (tileValue) => {
			return this.getTileTypeForMessage(receivingPlayer, tileValue);
		});
	}

	/**
	 * Gets the type of a tile that can be used for sending to clients.
	 * The returns a number that the client understands and uses to render the correct tile color.
	 * The player argument is used to make sure no tiles from other players appear with
	 * the same color as the tiles owned by the player itself.
	 *
	 * @param {import("./Player.js").Player} player The player that the message will be sent to.
	 * @param {number} tileValue
	 * @returns {TileTypeForMessage}
	 */
	getTileTypeForMessage(player, tileValue) {
		if (tileValue == -1) {
			return {
				colorId: 0, // edge of the world
				patternId: 0,
			};
		}
		if (tileValue == 0) {
			return {
				colorId: 1, // unfilled/grey
				patternId: 0,
			};
		}

		const tilePlayer = this.#players.get(tileValue);
		if (!tilePlayer) {
			return {
				colorId: 1, // unfilled/grey
				patternId: 0,
			};
		}

		const colorId = tilePlayer.skinColorIdForPlayer(player) + 1;
		return {
			colorId,
			patternId: tilePlayer.skinPatternId,
		};
	}

	async #updateNextMinimapPart() {
		this.#lastMinimapPart = (this.#lastMinimapPart + 1) % 4;
		const lastMinimapPart = this.#lastMinimapPart;
		const part = await this.#arena.getMinimapPart(lastMinimapPart);
		const message = WebSocketConnection.createMinimapMessage(lastMinimapPart, part);
		this.#minimapMessages[lastMinimapPart] = message;
		for (const player of this.#players.values()) {
			player.connection.send(message);
		}
	}

	*getMinimapMessages() {
		yield* this.#minimapMessages;
	}

	#sendLeaderboard() {
		/** @type {[player: Player, score: number][]} */
		const playerScores = [];
		for (const player of this.#players.values()) {
			playerScores.push([player, player.getTotalScore()]);
		}

		playerScores.sort((a, b) => b[1] - a[1]);

		let i = 1;
		for (const [player] of playerScores) {
			player.setRank(i);
			i++;
		}

		/** @type {[name: string, score: number][]} */
		const scores = playerScores.slice(0, 10).map((scoreData) => {
			const [player, score] = scoreData;
			return [player.name, score];
		});

		const message = WebSocketConnection.createLeaderboardMessage(scores, this.#players.size);
		this.#lastLeaderboardMessage = message;

		for (const player of this.#players.values()) {
			player.connection.send(message);
		}
	}

	getPlayerCount() {
		return this.#players.size;
	}

	/**
	 * Yields a list of players whose viewport contain (part of) the provided rect.
	 * @param {import("../util/util.js").Rect} rect
	 */
	*getOverlappingViewportPlayersForRect(rect) {
		for (const player of this.#players.values()) {
			const viewport = player.getUpdatesViewport();
			if (
				rect.max.x < viewport.min.x || viewport.max.x < rect.min.x || rect.max.y < viewport.min.y ||
				viewport.max.y < rect.min.y
			) {
				continue;
			}

			yield player;
		}
	}

	/**
	 * Yields a list of players whose viewport contain the provided point.
	 * @param {Vec2} pos
	 */
	*getOverlappingViewportPlayersForPos(pos) {
		yield* this.getOverlappingViewportPlayersForRect({
			min: pos.clone(),
			max: pos.clone(),
		});
	}

	/**
	 * Yields a list of players that are either inside the provided rect,
	 * or have a part of their trail inside the rect.
	 * @param {import("../util/util.js").Rect} rect
	 */
	*getOverlappingTrailBoundsPlayersForRect(rect) {
		for (const player of this.#players.values()) {
			const trailBounds = player.getTrailBounds();
			if (
				rect.max.x < trailBounds.min.x || trailBounds.max.x < rect.min.x ||
				rect.max.y < trailBounds.min.y || trailBounds.max.y < rect.min.y
			) {
				continue;
			}

			yield player;
		}
	}

	/**
	 * Yields a list of players that are either at the provided position,
	 * or have might have a part of their trail at the provided position.
	 * @param {Vec2} pos
	 */
	*getOverlappingTrailBoundsPlayersForPos(pos) {
		yield* this.getOverlappingTrailBoundsPlayersForRect({
			min: pos.clone(),
			max: pos.clone(),
		});
	}

	/**
	 * Yields a list of player positions,
	 * and the start of their trail if they have one.
	 * Used to prevent filling locations with other players inside.
	 * @param {import("./Player.js").Player} excludePlayer
	 */
	*getUnfillableLocations(excludePlayer) {
		for (const player of this.#players.values()) {
			if (player == excludePlayer || player.permanentlyDead) {
				continue;
			}

			yield player.getPosition();
			if (player.isGeneratingTrail) {
				yield Array.from(player.getTrailVertices())[0];
			}
		}
	}

	/**
	 * Sends the position and direction of a player to all nearby players.
	 * @param {import("./Player.js").Player} player
	 */
	broadcastPlayerState(player) {
		for (const nearbyPlayer of player.inOtherPlayerViewports()) {
			player.sendPlayerStateToPlayer(nearbyPlayer);
		}
	}

	/**
	 * Sends the current trail of a player to all nearby players.
	 * @param {import("./Player.js").Player} player
	 */
	broadcastPlayerTrail(player) {
		const message = WebSocketConnection.createTrailMessage(player.id, Array.from(player.getTrailVertices()));
		for (const nearbyPlayer of player.inOtherPlayerViewports()) {
			if (nearbyPlayer == player) {
				// The client that owns the player should receive 0 as player id
				const samePlayerMessage = WebSocketConnection.createTrailMessage(
					0,
					Array.from(player.getTrailVertices()),
				);
				nearbyPlayer.connection.send(samePlayerMessage);
			} else {
				nearbyPlayer.connection.send(message);
			}
		}
	}

	/**
	 * Notifies nearby players that the trail this player is currently creating has ended.
	 * @param {import("./Player.js").Player} player
	 */
	broadcastPlayerEmptyTrail(player) {
		const lastVertex = Array.from(player.getTrailVertices()).at(-1);
		if (!lastVertex) throw new Error("Assertion failed, trailVertices is empty");

		const message = WebSocketConnection.createEmptyTrailMessage(player.id, lastVertex);
		for (const nearbyPlayer of player.inOtherPlayerViewports()) {
			if (nearbyPlayer == player) {
				// The client that owns the player should receive 0 as player id
				const samePlayerMessage = WebSocketConnection.createEmptyTrailMessage(0, lastVertex);
				nearbyPlayer.connection.send(samePlayerMessage);
			} else {
				nearbyPlayer.connection.send(message);
			}
		}
	}

	/**
	 * Notifies nearby players that this player died.
	 * @param {import("./Player.js").Player} player
	 */
	broadcastPlayerDeath(player) {
		const position = player.getPosition();
		const message = WebSocketConnection.createPlayerDieMessage(player.id, position);
		for (const nearbyPlayer of player.inOtherPlayerViewports()) {
			if (nearbyPlayer == player) {
				// The client that owns the player should receive 0 as player id
				// We don't want to send the current position of the player either, the client already
				// keeps track of the location where the player died, and if we do send the position,
				// it might cause issues later when the death is undone.
				const samePlayerMessage = WebSocketConnection.createPlayerDieMessage(0, null);
				nearbyPlayer.connection.send(samePlayerMessage);
			} else {
				nearbyPlayer.connection.send(message);
			}
		}
	}

	/**
	 * Notifies nearby players that a player didn't die after all.
	 * @param {import("./Player.js").Player} player
	 */
	broadcastUndoPlayerDeath(player) {
		const message = WebSocketConnection.createPlayerUndoDieMessage(player.id);
		for (const nearbyPlayer of player.inOtherPlayerViewports()) {
			if (nearbyPlayer == player) {
				const samePlayerMessage = WebSocketConnection.createPlayerUndoDieMessage(0);
				nearbyPlayer.connection.send(samePlayerMessage);
			} else {
				nearbyPlayer.connection.send(message);
			}
		}
	}

	/**
	 * @param {number} playerId
	 */
	undoPlayerDeath(playerId) {
		const player = this.#players.get(playerId);
		if (player) {
			player.undoDie();
		}
	}

	/**
	 * Notifies nearby players to render a hit line animation at a specific point.
	 * @param {import("./Player.js").Player} player The player that was hit.
	 * @param {import("./Player.js").Player} hitByPlayer The player that caused the hit.
	 */
	broadcastHitLineAnimation(player, hitByPlayer) {
		const position = hitByPlayer.getPosition();
		const didHitSelf = player == hitByPlayer;
		for (const nearbyPlayer of player.inOtherPlayerViewports()) {
			const pointsColorId = player.skinColorIdForPlayer(nearbyPlayer);
			const hitByPlayerId = nearbyPlayer == hitByPlayer ? 0 : hitByPlayer.id;
			const message = WebSocketConnection.createHitLineMessage(
				hitByPlayerId,
				pointsColorId,
				position,
				didHitSelf,
			);
			nearbyPlayer.connection.send(message);
		}
	}

	/**
	 * @param {import("./Player.js").Player} player
	 * @param {number} honkDuration
	 */
	broadcastHonk(player, honkDuration) {
		const message = WebSocketConnection.createHonkMessage(player.id, honkDuration);
		for (const nearbyPlayer of player.inOtherPlayerViewports()) {
			if (nearbyPlayer == player) continue;
			nearbyPlayer.connection.send(message);
		}
	}
}

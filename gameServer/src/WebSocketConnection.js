import { clamp, Vec2 } from "renda";
import { UPDATES_VIEWPORT_RECT_SIZE, VALID_SKIN_COLOR_RANGE, VALID_SKIN_PATTERN_RANGE } from "./config.js";
import { Player } from "./gameplay/Player.js";
import { ControlSocketConnection } from "./ControlSocketConnection.js";

/**
 * - `"add-segment"` - adds a new polygon to the current trail.
 * - `"reset"` - clear the current trail
 * - `null` leave the trail unchanged
 * @typedef {"add-segment" | "reset" | null} ChangeTrailBehaviour
 */

/**
 * The color ids that clients send to servers include 0,
 * which assigns a random color on the server's end.
 * But there is no need to ever send 0 to the client, so it expects the first color
 * to start at 0 instead.
 * Ideally we should have kept the color ids for both server and client mapped to the same colors.
 * But mistakes have been made, and we need to subtract 1 from the id now.
 * @param {number} colorId
 */
function serverToClientColorId(colorId) {
	return colorId - 1;
}

export const initializeControlSocketMessage = "initializeControlSocket";

/**
 * Handles the messaging between server and client.
 * Received messages are converted to a format that is easier to work with.
 * For instance, ArrayBuffers with coordinates are converted to Vec2 and then
 * passed on to a class such as its `#player` or `#game`.
 *
 * Similarly, this contains a few `send` methods which converts stuff like Vec2
 * back into ArrayBuffers before sending the data.
 */
export class WebSocketConnection {
	#socket;
	#game;
	/** @type {Player?} */
	#player = null;
	/** @type {ControlSocketConnection?} */
	#controlSocket = null;

	get controlSocket() {
		return this.#controlSocket;
	}

	/**
	 * @param {WebSocket} socket
	 * @param {string} ip
	 * @param {import("./gameplay/Game.js").Game} game
	 */
	constructor(socket, ip, game) {
		this.#socket = socket;
		this.#game = game;
	}

	static get SendAction() {
		return {
			/**
			 * Legacy, unused.
			 */
			UPDATE_BLOCKS: 1,
			/**
			 * Updates player state such as position, direction, and trail.
			 */
			PLAYER_STATE: 2,
			/**
			 * Informs the client to replace all tiles in a rectangle with a specified color.
			 */
			FILL_RECT: 3,
			/**
			 * Updates the trail of a specific player.
			 */
			SET_PLAYER_TRAIL: 4,
			/**
			 * Lets all nearby clients know that they should play the death animation for a specific player.
			 */
			PLAYER_DIE: 5,
			/**
			 * Sends an area of the map to a player.
			 * Each tile is sent individually with no form of compression, so the message could be quite big.
			 */
			CHUNK_OF_BLOCKS: 6,
			/**
			 * Notifies the client that they can stop rendering and remove all data from a player.
			 * This is sent when a player moves out of another player's viewport.
			 * When they enter each other's viewport again, data such as skin id and player name needs to be sent again.
			 */
			REMOVE_PLAYER: 7,
			/**
			 * Notifies the client about the name of a specific player.
			 */
			PLAYER_NAME: 8,
			/**
			 * Sends the captured tile count and kill count of the current player.
			 */
			MY_SCORE: 9,
			MY_RANK: 10,
			/**
			 * Sends the player names and scores of the top 10 players, and the total amount of players in the game.
			 */
			LEADERBOARD: 11,
			/**
			 * Lets the client know about the size of the map.
			 * This is used for correctly rendering the position on the minimap, among other things.
			 */
			MAP_SIZE: 12,
			/**
			 * Tells the client to show the game over screen.
			 */
			GAME_OVER: 13,
			/**
			 * Sends a part of the minimap to the client.
			 */
			MINIMAP: 14,
			/**
			 * Tells the client which skin a specific player has.
			 */
			PLAYER_SKIN: 15,
			/**
			 * Notifies the client that whatever trail it is currently creating for a player,
			 * should be ended at a specific position.
			 */
			EMPTY_TRAIL_WITH_LAST_POS: 16,
			/**
			 * Lets the client know that all required data has been sent to start the game.
			 * This will will hide the loading transition on the client.
			 */
			READY: 17,
			/**
			 * Notifies clients to render a 'hit line' circle at a location.
			 */
			PLAYER_HIT_LINE: 18,
			REFRESH_AFTER_DIE: 19,
			/**
			 * A player honked.
			 */
			PLAYER_HONK: 20,
			PONG: 21,
			/**
			 * Lets the client know that a player didn't die after all, and it should
			 * start rendering and moving it again.
			 */
			UNDO_PLAYER_DIE: 22,
			TEAM_LIFE_COUNT: 23,
		};
	}

	static get ReceiveAction() {
		return {
			/**
			 * The client changed their position and direction.
			 */
			UPDATE_MY_POS: 1,
			/**
			 * Sets the name of the player that will be created.
			 * If this is sent after the player has been created, the message is ignored.
			 */
			SET_USERNAME: 2,
			/**
			 * Sets the skin of the connected client.
			 * This message is ignored when it is sent after the `READY` message.
			 */
			SKIN: 3,
			/**
			 * Lets the server know that the player is ready to join the game.
			 */
			READY: 4,
			REQUEST_CLOSE: 5,
			/**
			 * The player honked.
			 */
			HONK: 6,
			PING: 7,
			/**
			 * The client wants to know about the state of the trail as it currently exists according to the server.
			 */
			REQUEST_MY_TRAIL: 8,
			MY_TEAM_URL: 9,
			SET_TEAM_USERNAME: 10,
			/**
			 * Sends the version of the client to the server.
			 */
			VERSION: 11,
			PATREON_CODE: 12,
		};
	}

	#lastPingTime = performance.now();

	/** @type {import("./gameplay/Player.js").SkinData?} */
	#receivedSkinData = null;
	#receivedName = "";

	/**
	 * @param {string} data
	 */
	async onStringMessage(data) {
		if (this.#player) return;

		const parsed = JSON.parse(data);

		if (this.#controlSocket) {
			this.#controlSocket.onMessage(parsed);
		} else if (parsed == initializeControlSocketMessage) {
			this.#controlSocket = new ControlSocketConnection(this);
		}
	}

	/**
	 * @param {ArrayBuffer} data
	 */
	async onMessage(data) {
		if (this.#controlSocket) return;

		const view = new DataView(data);
		const messageType = view.getUint8(0);

		if (messageType == WebSocketConnection.ReceiveAction.READY) {
			if (this.#player) return;
			this.#player = this.#game.createPlayer(this, {
				skin: this.#receivedSkinData,
				name: this.#receivedName,
			});
			const pos = this.#player.getPosition();
			this.#player.sendChunk({
				min: pos.clone().subScalar(UPDATES_VIEWPORT_RECT_SIZE),
				max: pos.clone().addScalar(UPDATES_VIEWPORT_RECT_SIZE),
			});
			// Clients only really expect a single number, so we'll just take the maximum size of the map.
			const mapSize = Math.max(this.#game.arena.width, this.#game.arena.height);
			this.#sendMapSize(mapSize);
			for (const message of this.#game.getMinimapMessages()) {
				this.send(message);
			}
			const leaderboard = this.#game.lastLeaderboardMessage;
			if (leaderboard) {
				this.send(leaderboard);
			}
			this.#sendReady();
			this.#sendLegacyReady();
		} else if (messageType == WebSocketConnection.ReceiveAction.PING) {
			this.#lastPingTime = performance.now();
			this.#sendPong();
		} else if (messageType == WebSocketConnection.ReceiveAction.UPDATE_MY_POS) {
			if (view.byteLength < 6) return;
			if (!this.#player) return;
			let cursor = 1;
			const newDir = view.getInt8(cursor);
			cursor++;
			const x = view.getUint16(cursor, false);
			cursor += 2;
			const y = view.getUint16(cursor, false);
			cursor += 2;
			/** @type {import("./gameplay/Player.js").Direction} */
			let direction;
			if (newDir == 0) {
				direction = "right";
			} else if (newDir == 1) {
				direction = "down";
			} else if (newDir == 2) {
				direction = "left";
			} else if (newDir == 3) {
				direction = "up";
			} else if (newDir == 4) {
				direction = "paused";
			} else {
				return;
			}
			this.#player.clientPosUpdateRequested(direction, new Vec2(x, y));
		} else if (messageType == WebSocketConnection.ReceiveAction.REQUEST_MY_TRAIL) {
			if (!this.#player) return;
			const message = WebSocketConnection.createTrailMessage(0, Array.from(this.#player.getTrailVertices()));
			this.send(message);
		} else if (messageType == WebSocketConnection.ReceiveAction.SKIN) {
			if (this.#player) return;
			if (view.byteLength != 3) return;
			let cursor = 1;
			let colorId = view.getUint8(cursor);
			cursor++;
			let patternId = view.getUint8(cursor);
			cursor++;
			colorId = clamp(colorId, 0, VALID_SKIN_COLOR_RANGE);
			patternId = clamp(patternId, 0, VALID_SKIN_PATTERN_RANGE);
			this.#receivedSkinData = {
				colorId,
				patternId,
			};
		} else if (messageType == WebSocketConnection.ReceiveAction.SET_USERNAME) {
			if (this.#player) return;
			const decoder = new TextDecoder();
			const bytes = new Uint8Array(data, 1);
			this.#receivedName = decoder.decode(bytes);
		} else if (messageType == WebSocketConnection.ReceiveAction.HONK) {
			if (!this.#player) return;
			if (view.byteLength != 2) return;
			let honkDuration = view.getUint8(1);
			honkDuration = Math.max(honkDuration, 70);
			this.#player.honk(honkDuration);
		}
	}

	/**
	 * @param {string | ArrayBufferLike | Blob | ArrayBufferView} data
	 */
	send(data) {
		try {
			this.#socket.send(data);
		} catch (e) {
			if (e instanceof DOMException && e.name == "InvalidStateError") {
				return;
			}
			console.error("An error occurred while trying to send a message", data, e);
			if (e instanceof Error) {
				console.error(e.stack);
			}
		}
	}

	#sendReady() {
		this.send(new Uint8Array([WebSocketConnection.SendAction.READY]));
	}

	/**
	 * The mobile client expects at least one `CHUNK_OF_BLOCKS` message before it starts
	 * rendering player movement.
	 * This sends an empty chunk of width = 0 and height = 0, causing no blocks to be added
	 * to the client while still enabling player movement.
	 */
	#sendLegacyReady() {
		const buffer = new ArrayBuffer(10);
		const view = new DataView(buffer);
		let cursor = 0;

		view.setUint8(cursor, WebSocketConnection.SendAction.CHUNK_OF_BLOCKS);
		cursor++;

		// x
		view.setUint16(cursor, 0, false);
		cursor += 2;

		// y
		view.setUint16(cursor, 0, false);
		cursor += 2;

		// w
		view.setUint16(cursor, 0, false);
		cursor += 2;

		// h
		view.setUint16(cursor, 0, false);
		cursor += 2;

		this.send(buffer);
	}

	#sendPong() {
		this.send(new Uint8Array([WebSocketConnection.SendAction.PONG]));
	}

	/**
	 * @param {number} mapSize
	 */
	#sendMapSize(mapSize) {
		const buffer = new ArrayBuffer(3);
		const view = new DataView(buffer);
		let cursor = 0;

		view.setUint8(cursor, WebSocketConnection.SendAction.MAP_SIZE);
		cursor++;

		view.setUint16(cursor, mapSize, false);
		cursor += 2;

		this.send(buffer);
	}

	/**
	 * Sends the position and direction of a player, optionally modifying the trail of the player.
	 *
	 * @param {number} x
	 * @param {number} y
	 * @param {number} playerId
	 * @param {import("./gameplay/Player.js").Direction} dir
	 */
	sendPlayerState(x, y, playerId, dir) {
		const buffer = new ArrayBuffer(9);
		const view = new DataView(buffer);
		let cursor = 0;
		view.setUint8(cursor, WebSocketConnection.SendAction.PLAYER_STATE);
		cursor++;
		view.setUint16(cursor, Math.round(x), false);
		cursor += 2;
		view.setUint16(cursor, Math.round(y), false);
		cursor += 2;
		view.setUint16(cursor, playerId, false);
		cursor += 2;
		let dirNumber = 0;
		if (dir == "right") {
			dirNumber = 0;
		} else if (dir == "down") {
			dirNumber = 1;
		} else if (dir == "left") {
			dirNumber = 2;
		} else if (dir == "up") {
			dirNumber = 3;
		} else if (dir == "paused") {
			dirNumber = 4;
		}
		view.setUint8(cursor, dirNumber);
		cursor++;

		// This is legacy behaviour. The client already seems to ignore this flag when the player doesn't
		// currently have a trail. So we'll just always set this flag.
		view.setUint8(cursor, 1);
		cursor++;

		this.send(buffer);
	}

	/**
	 * @param {number} playerId
	 * @param {number} colorId
	 */
	sendPlayerSkin(playerId, colorId) {
		const buffer = new ArrayBuffer(4);
		const view = new DataView(buffer);
		let cursor = 0;
		view.setUint8(cursor, WebSocketConnection.SendAction.PLAYER_SKIN);
		cursor++;
		view.setUint16(cursor, playerId, false);
		cursor += 2;
		view.setUint8(cursor, serverToClientColorId(colorId));
		cursor++;
		this.send(buffer);
	}

	/**
	 * @param {number} playerId
	 * @param {string} playerName
	 */
	sendPlayerName(playerId, playerName) {
		const encoder = new TextEncoder();
		const nameBytes = encoder.encode(playerName);
		const buffer = new ArrayBuffer(3 + nameBytes.byteLength);
		const view = new DataView(buffer);
		let cursor = 0;

		view.setUint8(cursor, WebSocketConnection.SendAction.PLAYER_NAME);
		cursor++;

		view.setUint16(cursor, playerId);
		cursor += 2;

		const intView = new Uint8Array(buffer);
		intView.set(nameBytes, cursor);

		this.send(buffer);
	}

	/**
	 * Notifies the client that they can stop rendering a player and remove it from their memory.
	 * @param {number} playerId
	 */
	sendRemovePlayer(playerId) {
		const buffer = new ArrayBuffer(3);
		const view = new DataView(buffer);
		let cursor = 0;
		view.setUint8(cursor, WebSocketConnection.SendAction.REMOVE_PLAYER);
		cursor++;
		view.setUint16(cursor, playerId, false);
		cursor += 2;
		this.send(buffer);
	}

	/**
	 * @param {import("./util/util.js").Rect} rect
	 * @param {number} tileType
	 * @param {number} patternId
	 * @param {boolean} isEdgeChunk
	 */
	sendFillRect(rect, tileType, patternId, isEdgeChunk = false) {
		const buffer = new ArrayBuffer(12);
		const view = new DataView(buffer);
		let cursor = 0;

		view.setUint8(cursor, WebSocketConnection.SendAction.FILL_RECT);
		cursor++;

		view.setUint16(cursor, rect.min.x, false);
		cursor += 2;

		view.setUint16(cursor, rect.min.y, false);
		cursor += 2;

		const width = rect.max.x - rect.min.x;
		view.setUint16(cursor, width, false);
		cursor += 2;

		const height = rect.max.y - rect.min.y;
		view.setUint16(cursor, height, false);
		cursor += 2;

		view.setUint8(cursor, tileType);
		cursor++;

		view.setUint8(cursor, patternId);
		cursor++;

		view.setUint8(cursor, isEdgeChunk ? 1 : 0);
		cursor++;

		this.send(buffer);
	}

	/**
	 * @param {number} playerId
	 * @param {Vec2[]} vertices
	 */
	static createTrailMessage(playerId, vertices) {
		const bufferLength = 3 + vertices.length * 4;
		const buffer = new ArrayBuffer(bufferLength);
		const view = new DataView(buffer);
		let cursor = 0;
		view.setUint8(cursor, WebSocketConnection.SendAction.SET_PLAYER_TRAIL);
		cursor++;
		view.setUint16(cursor, playerId, false);
		cursor += 2;
		for (const vertex of vertices) {
			view.setUint16(cursor, vertex.x, false);
			cursor += 2;
			view.setUint16(cursor, vertex.y, false);
			cursor += 2;
		}
		return buffer;
	}

	/**
	 * @param {number} playerId
	 * @param {Vec2} vertex The final vertex of the trail.
	 */
	static createEmptyTrailMessage(playerId, vertex) {
		const buffer = new ArrayBuffer(7);
		const view = new DataView(buffer);
		let cursor = 0;

		view.setUint8(cursor, WebSocketConnection.SendAction.EMPTY_TRAIL_WITH_LAST_POS);
		cursor++;

		view.setUint16(cursor, playerId, false);
		cursor += 2;

		view.setUint16(cursor, vertex.x, false);
		cursor += 2;
		view.setUint16(cursor, vertex.y, false);
		cursor += 2;

		return buffer;
	}

	/**
	 * @param {number} playerId
	 * @param {Vec2?} position The position where the player died. This is only useful when the player
	 * died while hitting a wall or their own trail. In that case we want to make it clearly visible that this is
	 * what caused the player to die. But when the player is killed by another player, the position
	 * doesn't really matter and we'd rather let the client determine where to render the player's death.
	 */
	static createPlayerDieMessage(playerId, position) {
		const bufferLength = position ? 7 : 3;
		const buffer = new ArrayBuffer(bufferLength);
		const view = new DataView(buffer);
		let cursor = 0;
		view.setUint8(cursor, WebSocketConnection.SendAction.PLAYER_DIE);
		cursor++;
		view.setUint16(cursor, playerId, false);
		cursor += 2;
		if (position) {
			view.setUint16(cursor, position.x, false);
			cursor += 2;
			view.setUint16(cursor, position.y, false);
			cursor += 2;
		}
		return buffer;
	}

	/**
	 * @param {number} playerId
	 */
	static createPlayerUndoDieMessage(playerId) {
		const buffer = new ArrayBuffer(3);
		const view = new DataView(buffer);
		let cursor = 0;

		view.setUint8(cursor, WebSocketConnection.SendAction.UNDO_PLAYER_DIE);
		cursor++;

		view.setUint16(cursor, playerId, false);
		cursor += 2;

		return buffer;
	}

	/**
	 * @param {number} hitByPlayerId
	 * @param {number} pointsColorId The color of the rendered '+500' text above the effect.
	 * @param {Vec2} position
	 * @param {boolean} didHitSelf
	 */
	static createHitLineMessage(hitByPlayerId, pointsColorId, position, didHitSelf) {
		const buffer = new ArrayBuffer(9);
		const view = new DataView(buffer);
		let cursor = 0;
		view.setUint8(cursor, WebSocketConnection.SendAction.PLAYER_HIT_LINE);
		cursor++;
		view.setUint16(cursor, hitByPlayerId, false);
		cursor += 2;
		view.setUint8(cursor, serverToClientColorId(pointsColorId));
		cursor++;
		view.setUint16(cursor, position.x, false);
		cursor += 2;
		view.setUint16(cursor, position.y, false);
		cursor += 2;
		view.setUint8(cursor, didHitSelf ? 1 : 0);
		cursor++;
		return buffer;
	}

	/**
	 * @param {number} playerId
	 * @param {number} honkDuration
	 */
	static createHonkMessage(playerId, honkDuration) {
		const buffer = new ArrayBuffer(4);
		const view = new DataView(buffer);
		let cursor = 0;

		view.setUint8(cursor, WebSocketConnection.SendAction.PLAYER_HONK);
		cursor++;

		view.setUint16(cursor, playerId, false);
		cursor += 2;

		view.setUint8(cursor, honkDuration);
		cursor++;

		return buffer;
	}

	/**
	 * @param {number} partId
	 * @param {ArrayBuffer} minimapData
	 */
	static createMinimapMessage(partId, minimapData) {
		const buffer = new ArrayBuffer(2 + minimapData.byteLength);
		const view = new Uint8Array(buffer);
		const minmapView = new Uint8Array(minimapData);

		view[0] = WebSocketConnection.SendAction.MINIMAP;
		view[1] = partId;

		view.set(minmapView, 2);
		return buffer;
	}

	/**
	 * @param {number} scoreTiles The amount of tiles the player had captured when they died.
	 * @param {number} scoreKills The amount of kills the player had, including possibly killing themselve.
	 * @param {number} highestRank The highest rank that was ever reached during this game.
	 * @param {number} timeAliveSeconds How many seconds the player was alive.
	 * @param {number} rankingFirstSeconds How many seconds the player was ranked as number one.
	 * @param {import("./gameplay/Player.js").DeathType} deathType
	 * @param {string} killedByName The other player that killed this player, or an empty string if death type is not "player".
	 */
	sendGameOver(scoreTiles, scoreKills, highestRank, timeAliveSeconds, rankingFirstSeconds, deathType, killedByName) {
		const encoder = new TextEncoder();
		const killedByNameBytes = encoder.encode(killedByName);

		const buffer = new ArrayBuffer(18 + killedByNameBytes.byteLength);
		const view = new DataView(buffer);
		const intView = new Uint8Array(buffer);

		let cursor = 0;

		view.setUint8(cursor, WebSocketConnection.SendAction.GAME_OVER);
		cursor++;

		view.setUint32(cursor, scoreTiles, false);
		cursor += 4;

		view.setUint16(cursor, scoreKills, false);
		cursor += 2;

		view.setUint16(cursor, highestRank, false);
		cursor += 2;

		view.setUint32(cursor, timeAliveSeconds, false);
		cursor += 4;

		view.setUint32(cursor, rankingFirstSeconds, false);
		cursor += 4;

		let deathTypeInt = 0;
		if (deathType == "player") {
			deathTypeInt = 1;
		} else if (deathType == "arena-bounds") {
			deathTypeInt = 2;
		} else if (deathType == "self") {
			deathTypeInt = 3;
		}
		view.setUint8(cursor, deathTypeInt);
		cursor++;

		intView.set(killedByNameBytes, cursor);
		cursor += killedByNameBytes.byteLength;

		this.send(buffer);
	}

	/**
	 * @param {number} capturedTiles
	 * @param {number} kills
	 */
	sendMyScore(capturedTiles, kills) {
		const buffer = new ArrayBuffer(7);
		const view = new DataView(buffer);
		let cursor = 0;

		view.setUint8(cursor, WebSocketConnection.SendAction.MY_SCORE);
		cursor++;

		view.setUint32(cursor, capturedTiles, false);
		cursor += 4;

		view.setUint16(cursor, kills, false);
		cursor += 2;

		this.send(buffer);
	}

	/**
	 * @param {number} rank
	 */
	sendMyRank(rank) {
		const buffer = new ArrayBuffer(3);
		const view = new DataView(buffer);
		let cursor = 0;

		view.setUint8(cursor, WebSocketConnection.SendAction.MY_RANK);
		cursor++;

		view.setUint16(cursor, rank, false);
		cursor += 2;

		this.send(buffer);
	}

	/**
	 * @param {[name: string, score: number][]} scores
	 * @param {number} totalPlayers
	 */
	static createLeaderboardMessage(scores, totalPlayers) {
		const encoder = new TextEncoder();
		const encodedScores = scores.map((scoreData) => {
			const [name, score] = scoreData;
			const nameBytes = encoder.encode(name);
			const scoreBytes = new Uint8Array(4);
			const view = new DataView(scoreBytes.buffer);
			view.setUint32(0, score);
			return [scoreBytes, new Uint8Array([nameBytes.byteLength]), nameBytes];
		});

		let scoreBoardLength = 0;
		for (const scoreData of encodedScores) {
			for (const byteArray of scoreData) {
				scoreBoardLength += byteArray.length;
			}
		}

		const buffer = new ArrayBuffer(3 + scoreBoardLength);
		const intView = new Uint8Array(buffer);
		const view = new DataView(buffer);
		let cursor = 0;

		view.setUint8(cursor, WebSocketConnection.SendAction.LEADERBOARD);
		cursor++;

		view.setUint16(cursor, totalPlayers, false);
		cursor += 2;

		for (const scoreData of encodedScores) {
			for (const byteArray of scoreData) {
				intView.set(byteArray, cursor);
				cursor += byteArray.byteLength;
			}
		}

		return buffer;
	}

	/**
	 * Forcefully closes the connection.
	 * This fires onClose as well.
	 */
	close() {
		this.#socket.close();
	}

	onClose() {
		if (this.#player) {
			this.#game.removePlayer(this.#player);
		}
	}

	/**
	 * @param {number} now
	 * @param {number} dt
	 */
	loop(now, dt) {
		if (now - this.#lastPingTime > 1000 * 60 * 5) {
			this.close();
		}
	}
}

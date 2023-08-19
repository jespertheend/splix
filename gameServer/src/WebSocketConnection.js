import { Vec2 } from "renda";

/**
 * - `"add-segment"` - adds a new polygon to the current trail.
 * - `"reset"` - clear the current trail
 * - `null` leave the trail unchanged
 * @typedef {"add-segment" | "reset" | null} ChangeTrailBehaviour
 */

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
	#player;

	/**
	 * @param {WebSocket} socket
	 * @param {string} ip
	 * @param {import("./gameplay/Game.js").Game} game
	 */
	constructor(socket, ip, game) {
		this.#socket = socket;
		this.#game = game;
		this.#player = game.createPlayer(this);
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
			PLAYER_POS: 2,
			/**
			 * Informs the client to replace all tiles in a rectangle with a specified color.
			 */
			FILL_RECT: 3,
			/**
			 * Updates the trail of a specific player.
			 */
			SET_PLAYER_TRAIL: 4,
			PLAYER_DIE: 5,
			/**
			 * Sends an area of the map to a player.
			 * Each tile is sent individually with no form of compression, so the message could be quite big.
			 */
			CHUNK_OF_BLOCKS: 6,
			REMOVE_PLAYER: 7,
			PLAYER_NAME: 8,
			MY_SCORE: 9,
			MY_RANK: 10,
			LEADERBOARD: 11,
			MAP_SIZE: 12,
			YOU_DED: 13,
			MINIMAP: 14,
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
			PLAYER_HIT_LINE: 18,
			REFRESH_AFTER_DIE: 19,
			PLAYER_HONK: 20,
			PONG: 21,
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
			SET_USERNAME: 2,
			SKIN: 3,
			/**
			 * Lets the server know that the player is ready to join the game.
			 */
			READY: 4,
			REQUEST_CLOSE: 5,
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

	/**
	 * @param {ArrayBuffer} data
	 */
	async onMessage(data) {
		const view = new DataView(data);
		const messageType = view.getUint8(0);

		if (messageType == WebSocketConnection.ReceiveAction.READY) {
			this.#sendChunk({
				min: new Vec2(),
				max: new Vec2(100, 100),
			});
			this.#sendReady();
		} else if (messageType == WebSocketConnection.ReceiveAction.PING) {
			this.#lastPingTime = performance.now();
			this.#sendPong();
		} else if (messageType == WebSocketConnection.ReceiveAction.UPDATE_MY_POS) {
			if (view.byteLength < 6) return;
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
			const message = WebSocketConnection.createTrailMessage(0, Array.from(this.#player.getTrailVertices()));
			this.send(message);
		}
	}

	/**
	 * @param {ArrayBufferLike | Blob | ArrayBufferView} data
	 */
	send(data) {
		this.#socket.send(data);
	}

	#sendReady() {
		this.send(new Uint8Array([WebSocketConnection.SendAction.READY]));
	}

	#sendPong() {
		this.send(new Uint8Array([WebSocketConnection.SendAction.PONG]));
	}

	/**
	 * Sends a chunk of tiles from an arena.
	 * @param {import("./gameplay/util.js").Rect} rect
	 */
	#sendChunk(rect) {
		rect = this.#player.game.arena.clampRect(rect);
		const width = rect.max.x - rect.min.x;
		const height = rect.max.y - rect.min.y;
		if (width <= 0 || height <= 0) return;

		const headerSize = 1 + 2 * 4; // sendaction + 4x 16bit int
		const bodySize = width * height;
		const buffer = new ArrayBuffer(headerSize + bodySize);
		const view = new DataView(buffer);

		let cursor = 0;
		view.setUint8(cursor, WebSocketConnection.SendAction.CHUNK_OF_BLOCKS);
		cursor++;
		view.setUint16(cursor, rect.min.x, false);
		cursor += 2;
		view.setUint16(cursor, rect.min.y, false);
		cursor += 2;
		view.setUint16(cursor, width, false);
		cursor += 2;
		view.setUint16(cursor, height, false);
		cursor += 2;

		for (let x = 0; x < width; x++) {
			for (let y = 0; y < height; y++) {
				const pos = rect.min.clone();
				pos.add(x, y);
				const tileValue = this.#player.game.arena.getTileValue(pos);
				const tileType = this.#player.game.getTileTypeForMessage(this.#player, tileValue);
				view.setUint8(cursor, tileType);
				cursor++;
			}
		}

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
		view.setUint8(cursor, WebSocketConnection.SendAction.PLAYER_POS);
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
	 * @param {import("./gameplay/util.js").Rect} rect
	 * @param {number} tileType
	 * @param {number} patternId
	 */
	sendFillRect(rect, tileType, patternId) {
		const buffer = new ArrayBuffer(11);
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
	 * Forcefully closes the connection.
	 * This fires onClose as well.
	 */
	close() {
		this.#socket.close();
	}

	onClose() {
		this.#game.removePlayer(this.#player);
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

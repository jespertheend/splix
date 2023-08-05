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
		this.#player = game.createPlayer();
	}

	static get SendAction() {
		return {
			UPDATE_BLOCKS: 1,
			PLAYER_POS: 2,
			FILL_AREA: 3,
			SET_TRAIL: 4,
			PLAYER_DIE: 5,
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
			UPDATE_DIR: 1,
			SET_USERNAME: 2,
			SKIN: 3,
			/**
			 * Lets the server know that the player is ready to join the game.
			 */
			READY: 4,
			REQUEST_CLOSE: 5,
			HONK: 6,
			PING: 7,
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
				x: 0,
				y: 0,
				w: 10,
				h: 10,
			});
			this.#sendReady();
		} else if (messageType == WebSocketConnection.ReceiveAction.PING) {
			this.#lastPingTime = performance.now();
			this.#sendPong();
		}
	}

	/**
	 * @param {ArrayBufferLike | Blob | ArrayBufferView} data
	 */
	#send(data) {
		this.#socket.send(data);
	}

	#sendReady() {
		this.#send(new Uint8Array([WebSocketConnection.SendAction.READY]));
	}

	#sendPong() {
		this.#send(new Uint8Array([WebSocketConnection.SendAction.PONG]));
	}

	/**
	 * Sends a chunk of tiles from an arena.
	 * @param {import("./gameplay/Arena.js").Rect} rect
	 */
	#sendChunk(rect) {
		this.#player.game.arena.clampRect(rect);
		if (rect.w <= 0 || rect.h <= 0) return;

		const headerSize = 1 + 2 * 4; // sendaction + 4x 16bit int
		const bodySize = rect.w * rect.h;
		const buffer = new ArrayBuffer(headerSize + bodySize);
		const view = new DataView(buffer);

		let cursor = 0;
		view.setUint8(cursor, WebSocketConnection.SendAction.CHUNK_OF_BLOCKS);
		cursor++;
		view.setUint16(cursor, rect.x, false);
		cursor += 2;
		view.setUint16(cursor, rect.y, false);
		cursor += 2;
		view.setUint16(cursor, rect.w, false);
		cursor += 2;
		view.setUint16(cursor, rect.h, false);
		cursor += 2;

		for (let x = 0; x < rect.w; x++) {
			for (let y = 0; y < rect.h; y++) {
				const blockType = this.#player.game.getTileTypeForMessage(this.#player, rect.x + x, rect.y + y);
				view.setUint8(cursor, blockType);
				cursor++;
			}
		}

		this.#send(buffer);
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

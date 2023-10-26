import { clamp, TypedMessenger } from "renda";
import { initializeControlSocketMessage } from "../../gameServer/src/WebSocketConnection.js";
import { PersistentWebSocket } from "../../shared/PersistentWebSocket.js";

/**
 * @typedef GameServerConfig
 * @property {boolean} public
 * @property {boolean} official
 * @property {boolean} recommended
 * @property {boolean} needsControlSocket When true, a connection will be made to the control socket of the gameserver.
 * This socket is used for things such as getting real time player count, and availability checking.
 * When the connection fails, the server will be removed from the /gameservers endpoint.
 * Disabling the control socket connection will disable this check and instead the server will always be included.
 * @property {string} displayName
 * @property {string} endpoint
 */

/**
 * @typedef GameServerJsonData
 * @property {string} displayName
 * @property {string} endpoint
 * @property {number} playerCount
 * @property {boolean} [official]
 * @property {boolean} [recommended]
 */

/**
 * @param {GameServer} gameServer
 */
function createResponseHandlers(gameServer) {
	return {
		/**
		 * @param {number} count
		 */
		reportPlayerCount(count) {
			if (typeof count != "number") {
				count = 0;
			}
			count = clamp(count, 0, 999);
			count = Math.round(count);
			gameServer.updatePlayerCount(count);
		},
	};
}

/** @typedef {ReturnType<typeof createResponseHandlers>} ServerManagerResponseHandlers */

export class GameServer {
	#id;
	#public = false;
	#official = false;
	#recommended = false;
	#needsControlSocket = true;
	#displayName = "";
	#endpoint = "";
	#validEndpoint = false;
	/** @type {PersistentWebSocket<import("renda").TypedMessengerMessageSendData<ServerManagerResponseHandlers, import("../../gameServer/src/ControlSocketConnection.js").ControlSocketResponseHandlers>>?} */
	#persistentWebSocket = null;
	/** @type {TypedMessenger<ServerManagerResponseHandlers, import("../../gameServer/src/ControlSocketConnection.js").ControlSocketResponseHandlers>} */
	#messenger = new TypedMessenger();

	#playerCount = 0;

	/**
	 * @param {number} id
	 */
	constructor(id) {
		this.#id = id;
		this.#messenger.setResponseHandlers(createResponseHandlers(this));
		this.#messenger.setSendHandler((data) => {
			if (!this.#persistentWebSocket || !this.#persistentWebSocket.connected) {
				throw new Error("Assertion failed, tried to send a control socket message without an open socket");
			}
			this.#persistentWebSocket.send(data.sendData);
		});
	}

	destructor() {
		this.#closeWebSocket();
	}

	get id() {
		return this.#id;
	}

	/**
	 * True when the server should be joinable by the public.
	 * False when either the public checkbox isn't set or the servermanager itself doesn't have a connection to this gameserver.
	 */
	get available() {
		if (!this.#public) return false;
		if (!this.#validEndpoint) return false;
		if (this.#needsControlSocket) {
			if (!this.#persistentWebSocket) return false;
			return this.#persistentWebSocket.connected;
		} else {
			return true;
		}
	}

	getJson() {
		if (!this.#public) {
			throw new Error("Servers that are not public should not be exposed to clients");
		}

		/** @type {GameServerJsonData} */
		const data = {
			displayName: this.#displayName,
			endpoint: this.#endpoint,
			playerCount: this.#playerCount,
		};
		if (this.#official) data.official = true;
		if (this.#recommended) data.recommended = true;
		return data;
	}

	/**
	 * @returns {GameServerConfig}
	 */
	getConfig() {
		return {
			public: this.#public,
			official: this.#official,
			recommended: this.#recommended,
			needsControlSocket: this.#needsControlSocket,
			displayName: this.#displayName,
			endpoint: this.#endpoint,
		};
	}

	/**
	 * @param {string} endpoint
	 */
	#isValidEndpoint(endpoint) {
		try {
			new URL(endpoint);
		} catch {
			return false;
		}
		return true;
	}

	/**
	 * @param {GameServerConfig} config
	 */
	setConfig(config) {
		this.#public = config.public;
		this.#official = config.official;
		this.#recommended = config.recommended;
		this.#needsControlSocket = config.needsControlSocket;
		this.#displayName = config.displayName;
		if (config.endpoint != this.#endpoint) {
			this.#endpoint = config.endpoint;
			this.#validEndpoint = this.#isValidEndpoint(config.endpoint);
			this.#updateWebSocket();
		}
	}

	/**
	 * @param {number} count
	 */
	updatePlayerCount(count) {
		this.#playerCount = count;
	}

	#closeWebSocket() {
		if (this.#persistentWebSocket) {
			this.#persistentWebSocket.close();
			this.#persistentWebSocket = null;
		}
	}

	#updateWebSocket() {
		this.#closeWebSocket();
		if (this.#validEndpoint && this.#needsControlSocket) {
			this.#persistentWebSocket = new PersistentWebSocket(this.#endpoint);
			const socket = this.#persistentWebSocket;
			socket.onOpen(() => {
				socket.send(initializeControlSocketMessage);
			});
			socket.onMessage((data) => {
				this.#messenger.handleReceivedMessage(data);
			});
		}
	}
}

import { TypedMessenger } from "renda";

/** @typedef {ReturnType<AdminWebSocketConnection["getResponseHandlers"]>} ServerManagerResponseHandlers */

export class AdminWebSocketConnection {
	/** @type {TypedMessenger<ServerManagerResponseHandlers, import("../../adminPanel/src/WebsocketManager.js").AdminPanelResponseHandlers>} */
	#messenger = new TypedMessenger();
	#ip;
	#mainInstance;
	#authenticated = false;
	#configuredAuthToken;

	/**
	 * @param {WebSocket} socket
	 * @param {string} ip
	 * @param {import("./Main.js").Main} mainInstance
	 * @param {string} configuredAuthToken
	 */
	constructor(socket, ip, mainInstance, configuredAuthToken) {
		this.#ip = ip;
		this.#mainInstance = mainInstance;
		this.#configuredAuthToken = configuredAuthToken;

		this.#messenger.setResponseHandlers(this.getResponseHandlers());
		this.#messenger.setSendHandler((data) => {
			if (socket.readyState == WebSocket.OPEN) {
				socket.send(JSON.stringify(data.sendData));
			}
		});
	}
	/**
	 * @param {string} data
	 */
	onMessage(data) {
		this.#messenger.handleReceivedMessage(JSON.parse(data));
	}

	get authenticated() {
		return this.#authenticated;
	}

	#assertAuthenticated() {
		if (!this.#authenticated) {
			throw new Error("Connection has not been authenticated.");
		}
	}

	getResponseHandlers() {
		const handlers = {
			/**
			 * @param {string} token
			 */
			authenticate: async (token) => {
				await this.#mainInstance.authRateLimitManager.waitForActionAllowed(this.#ip);
				if (!this.#configuredAuthToken) return false;
				if (token != this.#configuredAuthToken) {
					this.#mainInstance.authRateLimitManager.markIpAsRecentAttempt(this.#ip);
					return false;
				}
				this.#authenticated = true;
				this.sendAllServerConfigs();
				this.#messenger.send.updateLegacyServerData(this.#mainInstance.legacyServerManager.getServerData());
				return true;
			},
			createGameServer: () => {
				this.#mainInstance.servermanager.createGameServer();
			},
			/**
			 * @param {number} id
			 */
			requestDeleteGameServer: (id) => {
				this.#mainInstance.servermanager.deleteGameServer(id);
			},
			/**
			 * @param {number} id
			 * @param {import("./GameServer.js").GameServerConfig} config
			 */
			setGameServerConfig: (id, config) => {
				this.#mainInstance.servermanager.setGameServerConfig(id, config);
			},
			/**
			 * @param {import("./LegacyServerManager.js").LegacyServerData} serverData
			 */
			setLegacyServerData: (serverData) => {
				return this.#mainInstance.legacyServerManager.setServerData(serverData);
			},
		};

		// Add an assertion that the client is authenticated for all handlers except 'authenticate'.
		for (const name of Object.keys(handlers)) {
			const castName = /** @type {keyof handlers} */ (name);
			if (name == "authenticate") continue;

			const originalHandler = /** @type {(...args: any[]) => any} */ (handlers[castName]);
			const newHandler = /** @type {(...args: any[]) => any} */ ((...args) => {
				this.#assertAuthenticated();
				return originalHandler(...args);
			});
			handlers[castName] = newHandler;
		}

		return handlers;
	}

	sendAllServerConfigs() {
		this.#assertAuthenticated();
		const configs = this.#mainInstance.servermanager.getServerConfigs();
		this.#messenger.send.updateServerConfigs(configs);
	}

	/**
	 * @param {number} id
	 * @param {import("./GameServer.js").GameServerConfig} config
	 */
	sendServerConfig(id, config) {
		this.#assertAuthenticated();
		this.#messenger.send.udpateServerConfig(id, config);
	}

	/**
	 * @param {import("./LegacyServerManager.js").LegacyServerData} serverData
	 */
	sendLegacyServerData(serverData) {
		this.#assertAuthenticated();
		this.#messenger.send.updateLegacyServerData(serverData);
	}
}

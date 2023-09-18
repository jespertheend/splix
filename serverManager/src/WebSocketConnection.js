import { TypedMessenger } from "renda";
import { INSECURE_LOCALHOST_SERVERMANAGER_TOKEN } from "../../shared/config.js";

/** @typedef {ReturnType<WebSocketConnection["getResponseHandlers"]>} ServerManagerResponseHandlers */

export class WebSocketConnection {
	/** @type {TypedMessenger<ServerManagerResponseHandlers, import("../../adminPanel/src/WebsocketManager.js").AdminPanelResponseHandlers>} */
	#messenger = new TypedMessenger();
	#ip;
	#mainInstance;
	#authenticated = false;

	/**
	 * @param {WebSocket} socket
	 * @param {string} ip
	 * @param {import("./Main.js").Main} mainInstance
	 */
	constructor(socket, ip, mainInstance) {
		this.#ip = ip;
		this.#mainInstance = mainInstance;

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
		return {
			/**
			 * @param {string} token
			 */
			authenticate: async (token) => {
				await this.#mainInstance.authRateLimitManager.waitForAuthenticationAllowed(this.#ip);
				if (token != INSECURE_LOCALHOST_SERVERMANAGER_TOKEN) {
					this.#mainInstance.authRateLimitManager.markIpAsRecentAttempt(this.#ip);
					return false;
				}
				this.#authenticated = true;
				this.sendAllServerConfigs();
				return true;
			},
			createGameServer: () => {
				this.#assertAuthenticated();
				this.#mainInstance.servermanager.createGameServer();
			},
			/**
			 * @param {number} id
			 */
			requestDeleteGameServer: (id) => {
				this.#assertAuthenticated();
				this.#mainInstance.servermanager.deleteGameServer(id);
			},
			/**
			 * @param {number} id
			 * @param {import("./GameServer.js").GameServerConfig} config
			 */
			setGameServerConfig: (id, config) => {
				this.#mainInstance.servermanager.setGameServerConfig(id, config);
			},
		};
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
		this.#messenger.send.udpateServerConfig(id, config);
	}
}

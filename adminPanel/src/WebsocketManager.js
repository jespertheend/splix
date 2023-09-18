import { PersistentWebSocket } from "../../shared/PersistentWebSocket.js";
import { TypedMessenger } from "renda";
import { INSECURE_LOCALHOST_SERVERMANAGER_TOKEN } from "../../shared/config.js";

/** @typedef {ReturnType<WebSocketManager["getResponseHandlers"]>} AdminPanelResponseHandlers */

export class WebSocketManager {
	/** @type {TypedMessenger<AdminPanelResponseHandlers, import("../../serverManager/src/WebSocketConnection.js").ServerManagerResponseHandlers>} */
	#messenger;
	#mainInstance;

	/**
	 * @param {import("./main.js").Main} mainInstance
	 */
	constructor(mainInstance) {
		this.#mainInstance = mainInstance;

		const url = new URL(location.href);
		url.pathname = "/servermanager/";
		url.protocol = "ws:";
		/** @type {PersistentWebSocket<import("renda").TypedMessengerMessageSendData<AdminPanelResponseHandlers, import("../../serverManager/src/WebSocketConnection.js").ServerManagerResponseHandlers, false>>} */
		const socket = new PersistentWebSocket(url.href);

		this.#messenger = new TypedMessenger();
		this.#messenger.setSendHandler((data) => {
			socket.send(JSON.stringify(data.sendData));
		});
		this.#messenger.setResponseHandlers(this.getResponseHandlers());
		socket.onMessage((data) => {
			this.#messenger.handleReceivedMessage(data);
		});

		socket.onOpen(async () => {
			const success = await this.#messenger.send.authenticate(INSECURE_LOCALHOST_SERVERMANAGER_TOKEN);
			if (!success) {
				alert(
					"Failed to authenticate with server manager, the server manager token may not have been configured correctly.",
				);
			}
		});
	}

	requestCreateGameServer() {
		this.#messenger.send.createGameServer();
	}

	/**
	 * @param {number} id
	 */
	requestDeleteGameServer(id) {
		this.#messenger.send.requestDeleteGameServer(id);
	}

	/**
	 * @param {number} id
	 * @param {import("../../serverManager/src/GameServer.js").GameServerConfig} config
	 */
	setServerConfig(id, config) {
		this.#messenger.send.setGameServerConfig(id, config);
	}

	getResponseHandlers() {
		return {
			/**
			 * @param {import("../../serverManager/src/ServerManager.js").GameServerConfigs} configs
			 */
			updateServerConfigs: (configs) => {
				this.#mainInstance.serverManager.updateGameServerConfigs(configs);
			},
			/**
			 * @param {number} id
			 * @param {import("../../serverManager/src/GameServer.js").GameServerConfig} config
			 */
			udpateServerConfig: (id, config) => {
				this.#mainInstance.serverManager.updateGameServerConfig(id, config);
			},
		};
	}
}

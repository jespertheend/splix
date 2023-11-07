import { PersistentWebSocket } from "../../shared/PersistentWebSocket.js";
import { TypedMessenger } from "renda";

/** @typedef {ReturnType<WebSocketManager["getResponseHandlers"]>} AdminPanelResponseHandlers */

export class WebSocketManager {
	#mainInstance;
	/** @type {TypedMessenger<AdminPanelResponseHandlers, import("../../serverManager/src/WebSocketConnection.js").ServerManagerResponseHandlers>} */
	#messenger;
	get messenger() {
		return this.#messenger;
	}

	/**
	 * @param {import("./main.js").Main} mainInstance
	 */
	constructor(mainInstance) {
		this.#mainInstance = mainInstance;

		const endpoint = new URL(location.href);
		endpoint.pathname = "/servermanager";
		if (endpoint.protocol == "http:") {
			endpoint.protocol = "ws:";
		} else {
			endpoint.protocol = "wss:";
		}

		/** @type {PersistentWebSocket<import("renda").TypedMessengerMessageSendData<AdminPanelResponseHandlers, import("../../serverManager/src/WebSocketConnection.js").ServerManagerResponseHandlers>>} */
		const socket = new PersistentWebSocket(endpoint.href);

		this.#messenger = new TypedMessenger();
		this.#messenger.setSendHandler((data) => {
			socket.send(JSON.stringify(data.sendData));
		});
		this.#messenger.setResponseHandlers(this.getResponseHandlers());
		socket.onMessage((data) => {
			this.#messenger.handleReceivedMessage(data);
		});

		const serverManagerToken = (async () => {
			const response = await fetch("/servermanagerToken");
			if (!response.ok) {
				alert("Failed to fetch the servermanager token");
			}
			const token = await response.text();
			return token.trim();
		})();

		socket.onOpen(async () => {
			const success = await this.#messenger.send.authenticate(await serverManagerToken);
			if (!success) {
				alert(
					"Failed to authenticate with server manager, the server manager token may not have been configured correctly.",
				);
			}
		});
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
			/**
			 * @param {import("../../serverManager/src/LegacyServerManager.js").LegacyServerData} serverData
			 */
			updateLegacyServerData: (serverData) => {
				this.#mainInstance.legacyServersManager.setServerData(serverData);
			},
		};
	}
}

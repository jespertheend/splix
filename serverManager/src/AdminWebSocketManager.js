import { WebSocketHoster } from "../../gameServer/src/util/WebSocketHoster.js";
import { AdminWebSocketConnection } from "./AdminWebSocketConnection.js";

export class AdminWebSocketManager {
	#hoster;

	/** @type {Set<AdminWebSocketConnection>} */
	#activeConnections = new Set();

	/**
	 * @param {import("./Main.js").Main} mainInstance
	 * @param {string} websocketAuthToken
	 */
	constructor(mainInstance, websocketAuthToken) {
		this.#hoster = new WebSocketHoster((socket, ip) => {
			const connection = new AdminWebSocketConnection(socket, ip, mainInstance, websocketAuthToken);
			this.#activeConnections.add(connection);
			socket.addEventListener("message", async (message) => {
				try {
					if (typeof message.data == "string") {
						const parsed = JSON.parse(message.data);
						connection.onMessage(parsed);
					}
				} catch (e) {
					console.error("An error occurred while handling a websocket message", message.data, e);
				}
			});
			socket.addEventListener("close", () => {
				this.#activeConnections.delete(connection);
			});
		});
	}

	/**
	 * @param {number} port
	 * @param {string} hostname
	 */
	startServer(port, hostname) {
		this.#hoster.startServer(port, hostname);
	}

	/**
	 * @param  {Parameters<WebSocketHoster["handleRequest"]>} args
	 */
	handleRequest(...args) {
		return this.#hoster.handleRequest(...args);
	}

	sendAllServerConfigs() {
		for (const connection of this.#activeConnections) {
			if (!connection.authenticated) continue;
			connection.sendAllServerConfigs();
		}
	}

	/**
	 * @param {number} id
	 * @param {import("./GameServer.js").GameServerConfig} config
	 */
	sendAllServerConfig(id, config) {
		for (const connection of this.#activeConnections) {
			if (!connection.authenticated) continue;
			connection.sendServerConfig(id, config);
		}
	}

	/**
	 * @param {import("./LegacyServerManager.js").LegacyServerData} serverData
	 */
	sendAllLegacyServerData(serverData) {
		for (const connection of this.#activeConnections) {
			if (!connection.authenticated) continue;
			connection.sendLegacyServerData(serverData);
		}
	}
}

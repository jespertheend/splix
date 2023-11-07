import { WebSocketHoster } from "../../gameServer/src/util/WebSocketHoster.js";
import { WebSocketConnection } from "./WebSocketConnection.js";

export class WebSocketManager {
	#hoster;

	/** @type {Set<WebSocketConnection>} */
	#activeConnections = new Set();

	/**
	 * @param {import("./Main.js").Main} mainInstance
	 * @param {string} websocketAuthToken
	 */
	constructor(mainInstance, websocketAuthToken) {
		this.#hoster = new WebSocketHoster((socket, ip) => {
			const connection = new WebSocketConnection(socket, ip, mainInstance, websocketAuthToken);
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
		}, {
			async overrideRequestHandler(request) {
				const url = new URL(request.url);
				if (url.pathname == "/servermanager/gameservers" || url.pathname == "/gameservers") {
					const data = mainInstance.servermanager.getServersJson();
					const response = Response.json(data);
					response.headers.set("Access-Control-Allow-Origin", "*");
					return response;
				} else if (
					url.pathname == "/servermanager/legacygameservers" || url.pathname == "/json/servers.2.json"
				) {
					const data = mainInstance.legacyServerManager.getServersJson();
					const response = Response.json(data);
					response.headers.set("Access-Control-Allow-Origin", "*");
					return response;
				} else if (url.pathname == "/servermanager/leaderboards" || url.pathname == "/api/leaderboards") {
					const data = mainInstance.leaderboardManager.getApiJson();
					const response = Response.json(data);
					response.headers.set("Access-Control-Allow-Origin", "*");
					response.headers.set("Cache-Control", "max-age=300");
					return response;
				}
				return null;
			},
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
	 * @param {import("./LegacyServersManager.js").LegacyServerData} serverData
	 */
	sendAllLegacyServerData(serverData) {
		for (const connection of this.#activeConnections) {
			if (!connection.authenticated) continue;
			connection.sendLegacyServerData(serverData);
		}
	}
}

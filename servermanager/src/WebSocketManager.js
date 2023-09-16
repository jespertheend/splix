import { WebSocketHoster } from "../../gameServer/src/util/WebSocketHoster.js";
import { WebSocketConnection } from "./WebSocketConnection.js";

export class WebSocketManager {
	#hoster;

	/** @type {Set<WebSocketConnection>} */
	#activeConnections = new Set();

	constructor() {
		this.#hoster = new WebSocketHoster((socket, ip) => {
			const connection = new WebSocketConnection();
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
				if (url.pathname == "/servermanager/gameservers") {
					return new Response("TODO");
				}
				return null;
			},
		});
		this.#hoster.handleRequest;
	}

	/**
	 * @param {number} port
	 */
	startServer(port) {
		this.#hoster.startServer(port);
	}

	/**
	 * @param  {Parameters<WebSocketHoster["handleRequest"]>} args
	 */
	handleRequest(...args) {
		return this.#hoster.handleRequest(...args);
	}
}

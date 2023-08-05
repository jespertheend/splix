import { WebSocketConnection } from "./WebSocketConnection.js";
import { getMainInstance } from "./mainInstance.js";
import { WebSocketHoster } from "./util/WebSocketHoster.js";

export class WebSocketManager {
	#hoster;

	/** @type {Set<WebSocketConnection>} */
	#activeConnections = new Set();

	constructor() {
		this.#hoster = new WebSocketHoster((socket, ip) => {
			const connection = new WebSocketConnection(socket, ip, getMainInstance().game);
			this.#activeConnections.add(connection);
			socket.addEventListener("message", async (message) => {
				try {
					if (message.data instanceof ArrayBuffer) {
						await connection.onMessage(message.data);
					} else if (typeof message.data == "string") {
						// Text messages are ignored for now
					}
				} catch (e) {
					console.error("An error occurred while handling a websocket message", message.data, e);
				}
			});
			socket.addEventListener("close", () => {
				connection.onClose();
				this.#activeConnections.delete(connection);
			});
		});
	}

	init() {
		this.#hoster.startServer(8080);
	}

	/**
	 * @param {number} now
	 * @param {number} dt
	 */
	loop(now, dt) {
		for (const connection of this.#activeConnections) {
			connection.loop(now, dt);
		}
	}
}

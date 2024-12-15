import { RateLimitManager } from "../../shared/RateLimitManager.js";
import { WebSocketConnection } from "./WebSocketConnection.js";
import { getMainInstance } from "./mainInstance.js";
import { WebSocketHoster } from "./util/WebSocketHoster.js";
import { DinoRateLimiter } from "./util/SocketRateLimiter.js";

export class WebSocketManager {
	#hoster;

	/** @type {Set<WebSocketConnection>} */
	#activeConnections = new Set();

	/** @type {Map<string, number>} */
	#ipCounts = new Map();

	#rateLimitManager = new RateLimitManager();

	constructor() {
		this.#hoster = new WebSocketHoster((socket, ip) => {
			if (!this.#rateLimitManager.actionAllowed(ip)) {
				socket.close();
				return;
			}
			this.#offsetIpCount(ip, 1);
			const ipCount = this.#getIpCount(ip);
			this.#rateLimitManager.markIpAsRecentAttempt(ip, ipCount);

			const connection = new WebSocketConnection(socket, ip, getMainInstance().game);
			this.#activeConnections.add(connection);

			const socketRateLimiter = new DinoRateLimiter({
				maxMessages: 20,
				interval: 100,
				onRateLimitExceeded: () => {
					socket.close();
				}
			});

			socket.addEventListener("message", async (message) => {
				socketRateLimiter.tick();
				try {
					if (message.data instanceof ArrayBuffer) {
						await connection.onMessage(message.data);
					} else if (typeof message.data == "string") {
						await connection.onStringMessage(message.data);
					}
				} catch (e) {
					console.error("An error occurred while handling a websocket message", message.data, e);
				}
			});
			socket.addEventListener("close", () => {
				connection.onClose();
				this.#activeConnections.delete(connection);
				this.#offsetIpCount(ip, -1);
			});
		});
		this.#hoster.handleRequest;
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

	/**
	 * @param {number} now
	 * @param {number} dt
	 */
	loop(now, dt) {
		for (const connection of this.#activeConnections) {
			connection.loop(now, dt);
		}
	}

	*#controlSocketConnections() {
		for (const connection of this.#activeConnections) {
			if (connection.controlSocket) yield connection.controlSocket;
		}
	}

	/**
	 * @param {number} count
	 */
	notifyControlSocketsPlayerCount(count) {
		for (const connection of this.#controlSocketConnections()) {
			connection.messenger.send.reportPlayerCount(count);
		}
	}

	/**
	 * @param {import("../../serverManager/src/LeaderboardManager.js").PlayerScoreData} score
	 */
	notifyControlSocketsPlayerScore(score) {
		for (const connection of this.#controlSocketConnections()) {
			connection.messenger.send.reportPlayerScore(score);
		}
	}

	/**
	 * @param {string} ip
	 * @param {number} offset
	 */
	#offsetIpCount(ip, offset) {
		const count = this.#getIpCount(ip) + offset;
		if (count <= 0) {
			this.#ipCounts.delete(ip);
		} else {
			this.#ipCounts.set(ip, count);
		}
	}

	/**
	 * @param {string} ip
	 */
	#getIpCount(ip) {
		return this.#ipCounts.get(ip) || 0;
	}
}

import { GameServer } from "./GameServer.js";

/**
 * @typedef {{id: number, config: import("./GameServer.js").GameServerConfig}[]} GameServerConfigs
 */

export class ServerManager {
	/** @type {Map<number, GameServer>} */
	#servers = new Map();

	#mainInstance;

	/**
	 * @param {import("./Main.js").Main} mainInstance
	 */
	constructor(mainInstance) {
		this.#mainInstance = mainInstance;
	}

	createGameServer() {
		let id = 1;
		while (true) {
			let alreadyExists = false;
			for (const existingId of this.#servers.keys()) {
				if (id == existingId) {
					alreadyExists = true;
					break;
				}
			}

			if (!alreadyExists) {
				break;
			} else {
				id++;
			}
		}

		const server = new GameServer(id);
		this.#servers.set(id, server);
		this.#mainInstance.websocketManager.sendAllServerConfigs();
	}

	/**
	 * @param {number} id
	 */
	deleteGameServer(id) {
		this.#servers.delete(id);
		this.#mainInstance.websocketManager.sendAllServerConfigs();
	}

	/**
	 * Returns data that can be used by clients for listing available servers.
	 */
	getServersJson() {
		const servers = [];
		for (const server of this.#servers.values()) {
			if (!server.public) continue;
			servers.push(server.getJson());
		}
		return {
			servers,
		};
	}

	/**
	 * Returns data that can be used by the admin panel for displaying configured servers.
	 */
	getServerConfigs() {
		/** @type {GameServerConfigs} */
		const configs = [];
		for (const server of this.#servers.values()) {
			configs.push({
				id: server.id,
				config: server.getConfig(),
			});
		}
		return configs;
	}

	/**
	 * @param {number} id
	 * @param {import("./GameServer.js").GameServerConfig} config
	 */
	setGameServerConfig(id, config) {
		const server = this.#servers.get(id);
		if (!server) {
			throw new Error("Server does not exist");
		}
		server.setConfig(config);
		this.#mainInstance.websocketManager.sendAllServerConfig(id, config);
	}
}

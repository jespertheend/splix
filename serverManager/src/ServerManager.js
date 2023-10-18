import { GameServer } from "./GameServer.js";

/**
 * @typedef {{id: number, config: import("./GameServer.js").GameServerConfig}[]} GameServerConfigs
 */

/**
 * @typedef ServersJson
 * @property {ReturnType<GameServer["getJson"]>[]} servers
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

		this.#loadServersData();
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
		this.#saveServersData();
	}

	/**
	 * @param {number} id
	 */
	deleteGameServer(id) {
		const server = this.#servers.get(id);
		if (server) {
			server.destructor();
			this.#servers.delete(id);
			this.#mainInstance.websocketManager.sendAllServerConfigs();
			this.#saveServersData();
		}
	}

	/**
	 * Returns data that can be used by clients for listing available servers.
	 * @returns {ServersJson}
	 */
	getServersJson() {
		const servers = [];
		for (const server of this.#servers.values()) {
			if (!server.available) continue;
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
		this.#saveServersData();
	}

	#loadServersData() {
		const serversData =
			/** @type {GameServerConfigs | undefined} */ (this.#mainInstance.persistentStorage.get("servers"));
		if (serversData) {
			for (const serverData of serversData) {
				const server = new GameServer(serverData.id);
				this.#servers.set(serverData.id, server);
				server.setConfig(serverData.config);
			}
		}
	}

	#saveServersData() {
		/** @type {GameServerConfigs} */
		const serversData = this.getServerConfigs();
		this.#mainInstance.persistentStorage.set("servers", serversData);
	}
}

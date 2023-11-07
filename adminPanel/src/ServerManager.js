import { GameServer } from "./GameServer.js";

export class ServerManager {
	#mainInstance;

	/** @type {Map<number, GameServer>} */
	#gameServers = new Map();

	/**
	 * @param {import("./main.js").Main} mainInstance
	 */
	constructor(mainInstance) {
		this.#mainInstance = mainInstance;
		this.el = document.createElement("div");

		const createGameServerButton = document.createElement("button");
		createGameServerButton.textContent = "Create Game Server";
		this.el.appendChild(createGameServerButton);
		createGameServerButton.addEventListener("click", () => {
			main.webSocketManager.messenger.send.createGameServer();
		});
	}

	/**
	 * @param {import("../../serverManager/src/ServerManager.js").GameServerConfigs} configs
	 */
	updateGameServerConfigs(configs) {
		const removedGameServerIds = new Set(this.#gameServers.keys());

		for (const config of configs) {
			let gameServer = this.#gameServers.get(config.id);
			if (!gameServer) {
				gameServer = new GameServer(config.id, this.#mainInstance);
				this.#gameServers.set(config.id, gameServer);
				this.el.appendChild(gameServer.el);

				const createdGameServer = gameServer;
				gameServer.onConfigChange(() => {
					this.#mainInstance.webSocketManager.messenger.send.setGameServerConfig(
						config.id,
						createdGameServer.getConfig(),
					);
				});
			}

			gameServer.setConfig(config.config);
			removedGameServerIds.delete(config.id);
		}

		for (const id of removedGameServerIds) {
			const gameServer = this.#gameServers.get(id);
			if (!gameServer) continue;
			this.el.removeChild(gameServer.el);
			this.#gameServers.delete(id);
		}
	}

	/**
	 * @param {number} id
	 * @param {import("../../serverManager/src/GameServer.js").GameServerConfig} config
	 */
	updateGameServerConfig(id, config) {
		const server = this.#gameServers.get(id);
		server?.setConfig(config);
	}
}

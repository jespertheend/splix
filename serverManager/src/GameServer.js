/**
 * @typedef GameServerConfig
 * @property {boolean} public
 * @property {boolean} official
 * @property {boolean} recommended
 * @property {string} displayName
 * @property {string} endpoint
 */

import { PersistentWebSocket } from "../../shared/PersistentWebSocket.js";

export class GameServer {
	#id;
	#public = false;
	#official = false;
	#recommended = false;
	#displayName = "";
	#endpoint = "";
	#validEndpoint = false;
	/** @type {PersistentWebSocket<any>?} */
	#persistentWebSocket = null;

	/**
	 * @param {number} id
	 */
	constructor(id) {
		this.#id = id;
	}

	destructor() {
		this.#closeWebSocket();
	}

	get id() {
		return this.#id;
	}

	/**
	 * True when the server should be joinable by the public.
	 * False when either the public checkbox isn't set or the servermanager itself doesn't have a connection to this gameserver.
	 */
	get available() {
		if (!this.#public) return false;
		if (!this.#validEndpoint || !this.#persistentWebSocket) return false;
		return this.#persistentWebSocket.connected;
	}

	getJson() {
		if (!this.#public) {
			throw new Error("Servers that are not public should not be exposed to clients");
		}
		return {
			displayName: this.#displayName,
			endpoint: this.#endpoint,
			official: this.#official,
		};
	}

	/**
	 * @returns {GameServerConfig}
	 */
	getConfig() {
		return {
			public: this.#public,
			official: this.#official,
			recommended: this.#recommended,
			displayName: this.#displayName,
			endpoint: this.#endpoint,
		};
	}

	/**
	 * @param {string} endpoint
	 */
	#isValidEndpoint(endpoint) {
		try {
			new URL(endpoint);
		} catch {
			return false;
		}
		return true;
	}

	/**
	 * @param {GameServerConfig} config
	 */
	setConfig(config) {
		this.#public = config.public;
		this.#official = config.official;
		this.#recommended = config.recommended;
		this.#displayName = config.displayName;
		if (config.endpoint != this.#endpoint) {
			this.#endpoint = config.endpoint;
			this.#validEndpoint = this.#isValidEndpoint(config.endpoint);
			this.#updateWebSocket();
		}
	}

	#closeWebSocket() {
		if (this.#persistentWebSocket) {
			this.#persistentWebSocket.close();
			this.#persistentWebSocket = null;
		}
	}

	#updateWebSocket() {
		this.#closeWebSocket();
		if (this.#validEndpoint) {
			this.#persistentWebSocket = new PersistentWebSocket(this.#endpoint);
			this.#persistentWebSocket.onOpen(() => {
				console.log("open");
			});
		}
	}
}

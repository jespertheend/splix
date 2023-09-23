/**
 * @typedef GameServerConfig
 * @property {boolean} public
 * @property {boolean} official
 * @property {string} displayName
 * @property {string} endpoint
 */

export class GameServer {
	#id;
	#public = false;
	#official = false;
	#displayName = "";
	#endpoint = "";

	/**
	 * @param {number} id
	 */
	constructor(id) {
		this.#id = id;
	}

	get id() {
		return this.#id;
	}

	get public() {
		return this.#public;
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
			displayName: this.#displayName,
			endpoint: this.#endpoint,
		};
	}

	/**
	 * @param {GameServerConfig} config
	 */
	setConfig(config) {
		this.#public = config.public;
		this.#displayName = config.displayName;
		this.#endpoint = config.endpoint;
		this.#official = config.official;
	}
}

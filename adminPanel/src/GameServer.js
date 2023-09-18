export class GameServer {
	#publicCheckbox;
	#displayNameEl;
	#endpointEl;
	/** @type {Set<() => void>} */
	#onConfigChangeCbs = new Set();

	/**
	 * @param {number} id
	 * @param {import("./main.js").Main} mainInstance
	 */
	constructor(id, mainInstance) {
		this.el = document.createElement("div");
		this.el.classList.add("game-server");

		const publicLabel = document.createElement("label");
		publicLabel.textContent = "Public";
		this.el.appendChild(publicLabel);

		this.#publicCheckbox = document.createElement("input");
		this.#publicCheckbox.type = "checkbox";
		publicLabel.appendChild(this.#publicCheckbox);
		this.#publicCheckbox.addEventListener("change", () => {
			this.#fireConfigChange();
		});

		this.#displayNameEl = this.#createTextInput("Display name");
		this.#endpointEl = this.#createTextInput("Endpoint");

		const deleteButton = document.createElement("button");
		deleteButton.textContent = "Delete";
		this.el.appendChild(deleteButton);
		deleteButton.addEventListener("click", () => {
			mainInstance.webSocketManager.requestDeleteGameServer(id);
		});
	}

	/**
	 * @param {string} label
	 */
	#createTextInput(label) {
		const labelEl = document.createElement("label");
		labelEl.textContent = label + " ";
		this.el.appendChild(labelEl);

		const inputEl = document.createElement("input");
		labelEl.appendChild(inputEl);
		inputEl.addEventListener("change", () => {
			this.#fireConfigChange();
		});
		return inputEl;
	}

	/**
	 * @param {import("../../serverManager/src/GameServer.js").GameServerConfig} config
	 */
	setConfig(config) {
		this.#publicCheckbox.checked = config.public;
		this.#displayNameEl.value = config.displayName;
		this.#endpointEl.value = config.endpoint;
	}

	/**
	 * @returns {import("../../serverManager/src/GameServer.js").GameServerConfig}
	 */
	getConfig() {
		return {
			public: this.#publicCheckbox.checked,
			displayName: this.#displayNameEl.value,
			endpoint: this.#endpointEl.value,
		};
	}

	/**
	 * @param {() => void} cb
	 */
	onConfigChange(cb) {
		this.#onConfigChangeCbs.add(cb);
	}

	#fireConfigChange() {
		this.#onConfigChangeCbs.forEach((cb) => cb());
	}
}

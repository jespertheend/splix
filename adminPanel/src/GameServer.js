export class GameServer {
	#checkboxesContainer;
	#publicCheckbox;
	#officialCheckbox;
	#recommendedCheckbox;
	#needsControlSocketCheckbox;
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

		this.#checkboxesContainer = document.createElement("div");
		this.#checkboxesContainer.classList.add("checkboxes-container");
		this.el.appendChild(this.#checkboxesContainer);

		this.#publicCheckbox = this.#createCheckboxInput("Public");
		this.#officialCheckbox = this.#createCheckboxInput("Official");
		this.#recommendedCheckbox = this.#createCheckboxInput("Recommended");
		this.#needsControlSocketCheckbox = this.#createCheckboxInput("Control socket");

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
	#createCheckboxInput(label) {
		const labelEl = document.createElement("label");
		labelEl.textContent = label;
		this.#checkboxesContainer.appendChild(labelEl);

		const checkboxEl = document.createElement("input");
		checkboxEl.type = "checkbox";
		labelEl.appendChild(checkboxEl);
		checkboxEl.addEventListener("change", () => {
			this.#fireConfigChange();
		});
		return checkboxEl;
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
		this.#officialCheckbox.checked = config.official;
		this.#recommendedCheckbox.checked = config.recommended;
		this.#needsControlSocketCheckbox.checked = config.needsControlSocket;
		this.#displayNameEl.value = config.displayName;
		this.#endpointEl.value = config.endpoint;
	}

	/**
	 * @returns {import("../../serverManager/src/GameServer.js").GameServerConfig}
	 */
	getConfig() {
		return {
			public: this.#publicCheckbox.checked,
			official: this.#officialCheckbox.checked,
			recommended: this.#recommendedCheckbox.checked,
			needsControlSocket: this.#needsControlSocketCheckbox.checked,
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

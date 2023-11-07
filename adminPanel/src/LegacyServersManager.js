import { Main } from "./main.js";

export class LegacyServersManager {
	#mainInstance;
	#ip4El;
	#ip6El;

	/**
	 * @param {Main} mainInstance
	 */
	constructor(mainInstance) {
		this.#mainInstance = mainInstance;

		this.el = document.createElement("div");

		this.#ip4El = this.#createIpInput("Legacy ip4");
		this.#ip6El = this.#createIpInput("Legacy ip6");
	}

	/**
	 * @param {string} placeholder
	 */
	#createIpInput(placeholder) {
		const inputEl = document.createElement("input");
		inputEl.placeholder = placeholder;
		this.el.append(inputEl);
		inputEl.addEventListener("change", () => {
			this.#mainInstance.webSocketManager.messenger.send.setLegacyServerData({
				ipv4: this.#ip4El.value,
				ipv6: this.#ip6El.value,
			});
		});
		return inputEl;
	}

	/**
	 * @param {import("../../serverManager/src/LegacyServersManager.js").LegacyServerData} serverData
	 */
	setServerData(serverData) {
		this.#ip4El.value = serverData.ipv4;
		this.#ip6El.value = serverData.ipv6;
	}
}

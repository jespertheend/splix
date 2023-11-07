import { Main } from "./main.js";

export class LegacyServerManager {
	#mainInstance;
	#ip4El;
	#ip6El;

	/**
	 * @param {Main} mainInstance
	 */
	constructor(mainInstance) {
		this.#mainInstance = mainInstance;

		this.el = document.createElement("div");
		this.el.classList.add("legay-server-manager");

		this.#ip4El = this.#createIpInput("Legacy IPv4: ");
		this.#ip6El = this.#createIpInput("Legacy IPv6: ");
	}

	/**
	 * @param {string} labelText
	 */
	#createIpInput(labelText) {
		const labelEl = document.createElement("label");
		this.el.append(labelEl);
		const inputEl = document.createElement("input");
		inputEl.addEventListener("change", () => {
			this.#mainInstance.webSocketManager.messenger.send.setLegacyServerData({
				ipv4: this.#ip4El.value,
				ipv6: this.#ip6El.value,
			});
		});
		labelEl.append(labelText, inputEl);
		return inputEl;
	}

	/**
	 * @param {import("../../serverManager/src/LegacyServerManager.js").LegacyServerData} serverData
	 */
	setServerData(serverData) {
		this.#ip4El.value = serverData.ipv4;
		this.#ip6El.value = serverData.ipv6;
	}
}

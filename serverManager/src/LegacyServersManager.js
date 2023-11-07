import { Main } from "./Main.js";

/**
 * @typedef LegacyServerData
 * @property {string} ipv6
 * @property {string} ipv4
 */

const PERSISTENT_STORAGE_KEY = "legacyServersManagerData";

export class LegacyServersManager {
	#mainInstance;

	/** @type {LegacyServerData} */
	#serverData = {
		ipv4: "",
		ipv6: "",
	};

	/**
	 * @param {Main} mainInstance
	 */
	constructor(mainInstance) {
		this.#mainInstance = mainInstance;

		const loadedData = this.#mainInstance.persistentStorage.get(PERSISTENT_STORAGE_KEY);
		if (loadedData && typeof loadedData == "object") {
			if ("ipv4" in loadedData && typeof loadedData.ipv4 == "string") {
				this.#serverData.ipv4 = loadedData.ipv4;
			}
			if ("ipv6" in loadedData && typeof loadedData.ipv6 == "string") {
				this.#serverData.ipv6 = loadedData.ipv6;
			}
		}
	}

	/**
	 * @param {LegacyServerData} data
	 */
	setServerData(data) {
		this.#serverData = data;
		this.#mainInstance.websocketManager.sendAllLegacyServerData(data);
		this.#mainInstance.persistentStorage.set(PERSISTENT_STORAGE_KEY, data);
	}

	getServerData() {
		return {
			...this.#serverData,
		};
	}

	getServersJson() {
		return {
			retentionSamples: [],
			teamServers: [],
			mobileAdData: {
				videoInterstitialRate: -1,
				limitFrequencySeconds: 300,
				disabledNetworks: "",
				promoBannerUrls: [
					"ducklings",
				],
				doBanner: true,
				promoBannerUrl: "https://splix.io/banners/ducklings/index.html",
				showPromoForPatreonUsers: true,
			},
			locations: [
				{
					pingIpv4: "splix.io",
					loc: "nyc",
					gamemodes: [
						{
							gm: "default",
							versions: [
								{
									lobbies: [
										{
											securePort: 443,
											ipv6: this.#serverData.ipv6,
											port: 80,
											hash: "fish",
											ipv4: this.#serverData.ipv4,
										},
									],
									ver: 1,
								},
							],
						},
					],
					locId: 3,
					pingIpv6: "splix.io",
				},
			],
			"requiredMobileVersion": 11,
		};
	}
}

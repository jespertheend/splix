import { AdLad } from "../../deps/adlad/0.14.0/dist/AdLad.js";
import { dummyPlugin } from "../../deps/adlad-plugin-dummy/0.3.0/dist/adlad-plugin-dummy.js";
import { adinPlayPlugin } from "../../deps/adlad-plugin-adinplay/0.0.3/dist/adlad-plugin-adinplay.js";
import { lsSet } from "./util.js";

/** @type {ReturnType<typeof loadAdLad>?} */
let adLad = null;

export function initAdLad() {
	// TODO: wait for peligames entitlements to be ready
	updateAdlad();
}

function getAdCounter() {
	var adCounter = localStorage.adCounter;
	if (adCounter === undefined) {
		adCounter = 0;
	}
	adCounter = parseInt(adCounter);
	if (isNaN(adCounter)) {
		adCounter = 0;
	}
	return adCounter;
}

function shouldShowAd() {
	const adCounter = getAdCounter();
	if (adCounter == 0) return true;

	const lastAdTime = localStorage.lastAdTime;
	if (lastAdTime) {
		const timeNumber = parseInt(lastAdTime);
		if (Number.isFinite(timeNumber)) {
			const dt = Date.now() - timeNumber;
			if (dt < 300_000) return false;
		}
	}
	return true;
}

export async function showFullScreenAd() {
	if (!adLad) return;

	if (!shouldShowAd()) {
		let adCounter = getAdCounter();
		adCounter++;
		if (adCounter >= 5) {
			adCounter = 0;
		}
		lsSet("adCounter", adCounter);
	} else {
		const start = performance.now();
		await adLad.showFullScreenAd();
		const duration = performance.now() - start;
		if (duration > 3_000) {
			lsSet("lastAdTime", Date.now());
			lsSet("adCounter", 1);
		}
	}
}

function updateAdlad() {
	let needsAdLad = true;
	// TODO:
	// if (peligames && peligames.entitlements.has("removeAds")) {
	// 	needsAdLad = false;
	// }
	if (Boolean(adLad) != needsAdLad) {
		if (needsAdLad) {
			adLad = loadAdLad();
		} else {
			adLad.dispose();
			adLad = null;
		}
		if (IS_DEV_BUILD) {
			globalThis.adLad = adLad;
		}
	}
}

function loadAdLad() {
	/** @type {import("../../deps/adlad/0.14.0/mod.js").AdLadPlugin[]} */
	const plugins = [
		adinPlayPlugin({
			publisher: "JTE",
			site: "splix.io",
		}),
	];

	if (IS_DEV_BUILD) {
		plugins.push(dummyPlugin());
	}

	/** @type {ConstructorParameters<typeof AdLad>[0]} */
	const adLadOpts = {
		pluginSelectQueryStringKey: "ads",
		plugins,
		useTestAds: IS_DEV_BUILD,
		invalidQueryStringPluginBehaviour: "none",
	};
	if (IS_DEV_BUILD) {
		adLadOpts.plugin = "dummy";
	}

	/** @type {AdLad<ReturnType<typeof adinPlayPlugin | typeof dummyPlugin>>} */
	const adLad = new AdLad(adLadOpts);
	adLad.onCanShowBannerAdChange(() => {
		updateBannerVisibilities();
	});

	return adLad;
}

function updateBannerVisibilities() {
	// JTE_splix-io_300x250
	// JTE_splix-io_300x250
}

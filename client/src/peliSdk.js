/** @type {import("./peliSdkTypes.ts").PeliSdk?} */
let peliSdk = null;

/** @param {import("./peliSdkTypes.ts").PeliSdk?} sdk */
let resolvePeliSdkPromise = (sdk) => {};
/** @type {Promise<import("./peliSdkTypes.ts").PeliSdk?>} */
const peliSdkPromise = new Promise((resolve) => {
	resolvePeliSdkPromise = resolve;
});

async function initPeliSdkInternal() {
	let sdk;
	try {
		/** @type {import("./peliSdkTypes.ts")} */
		const mod = await import("https://js.pelicanparty.games/v1.js");
		const { init } = mod;
		sdk = await init({
			clientId: "clnt_JTYjZeBQ7TbWKpmBzUVw",
			initialSessionScope: {
				clientScope: ["entitlements"],
				serverScope: ["concurrencyGuard", "entitlements"],
			},
		});
		if (IS_DEV_BUILD) {
			globalThis.peliSdk = sdk;
		}
	} catch (e) {
		console.warn("Failed to load Pelican Party sdk, the user may be offline");
		console.error(e);
		return null;
	}
	peliSdk = sdk;
	return sdk;
}

export async function initPeliSdk() {
	const sdk = await initPeliSdkInternal();
	resolvePeliSdkPromise(sdk);
	return sdk;
}

export function hasPlusRewards() {
	if (!peliSdk) return false;
	return peliSdk.entitlements.has("plusRewards");
}

export async function getPeliAuthCode() {
	const sdk = await peliSdkPromise;
	if (!sdk) return null;
	return await sdk.session.getAuthCode({
		scope: ["entitlements", "concurrencyGuard"],
	});
}

export function getPeliSdkAsync() {
	return peliSdkPromise;
}

export function getAssertedPeliSdk() {
	if (!peliSdk) {
		throw new Error("Peli sdk not loaded");
	}
	return peliSdk;
}

/** @type {import("./peliSdkTypes.ts").PeliSdk?} */
let peliSdk = null;

export async function initPeliSdk() {
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

export function hasPlusRewards() {
	if (!peliSdk) return false;
	return peliSdk.entitlements.has("plusRewards");
}

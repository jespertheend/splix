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
	return sdk;
}

import { init } from "./src/mainInstance.js";

const persistentStoragePath = Deno.env.get("PERSISTENT_STORAGE_PATH") || null;
if (!persistentStoragePath) {
	console.warn("No PERSISTENT_STORAGE_PATH environment variable has been set, configurations will not be saved.");
}

const port = parseInt(Deno.env.get("PORT") || "8080");

const websocketAuthToken = Deno.env.get("WEBSOCKET_AUTH_TOKEN");
if (!websocketAuthToken) {
	throw new Error("No WEBSOCKET_AUTH_TOKEN environment variable has been provided");
}

const mainInstance = init({
	persistentStoragePath,
	websocketAuthToken,
});
mainInstance.websocketManager.startServer(port);

import { RateLimitManager } from "../../shared/RateLimitManager.js";
import { LeaderboardManager } from "./LeaderboardManager.js";
import { LegacyServerManager } from "./LegacyServerManager.js";
import { PersistentStorage } from "./PersistentStorage.js";
import { ServerManager } from "./ServerManager.js";
import { AdminWebSocketManager } from "./AdminWebSocketManager.js";

export class Main {
	/**
	 * @param {Object} options
	 * @param {string?} options.persistentStoragePath The location where the json file with persistent storage is located.
	 * @param {string} options.websocketAuthToken
	 */
	constructor({ persistentStoragePath, websocketAuthToken }) {
		this.persistentStorage = new PersistentStorage(persistentStoragePath);
		this.leaderboardManager = new LeaderboardManager(this.persistentStorage);
		this.servermanager = new ServerManager(this);
		this.legacyServerManager = new LegacyServerManager(this);
		this.adminWebsocketManager = new AdminWebSocketManager(this, websocketAuthToken);
		this.authRateLimitManager = new RateLimitManager({ alwaysUseMultiConnectionLimit: true });
	}

	/**
	 * @param {Request} request
	 * @param {Deno.ServeHandlerInfo<Deno.NetAddr>} info
	 */
	handleRequest(request, info) {
		const url = new URL(request.url);
		if (url.pathname == "/servermanager/gameservers" || url.pathname == "/gameservers") {
			const data = this.servermanager.getServersJson();
			const response = Response.json(data);
			response.headers.set("Access-Control-Allow-Origin", "*");
			return response;
		} else if (url.pathname == "/servermanager/legacygameservers" || url.pathname == "/json/servers.2.json") {
			const data = this.legacyServerManager.getServersJson();
			const response = Response.json(data);
			response.headers.set("Access-Control-Allow-Origin", "*");
			return response;
		} else if (url.pathname == "/servermanager/leaderboards" || url.pathname == "/api/leaderboards") {
			const data = this.leaderboardManager.getApiJson();
			const response = Response.json(data);
			response.headers.set("Access-Control-Allow-Origin", "*");
			response.headers.set("Cache-Control", "max-age=300");
			return response;
		} else if (url.pathname == "/servermanager") {
			return this.adminWebsocketManager.handleRequest(request, info);
		} else {
			return new Response("not found", { status: 404 });
		}
	}
}

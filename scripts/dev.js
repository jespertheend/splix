import { generateTypes } from "https://deno.land/x/deno_tsc_helper@v0.1.2/mod.js";
import { dev } from "https://deno.land/x/dev@v0.3.0/mod.js";
import { serveDir } from "$std/http/file_server.ts";
import { setCwd } from "chdir-anywhere";
import { init as initGameServer } from "../gameServer/src/mainInstance.js";
import { init as initServerManager } from "../serverManager/src/mainInstance.js";
import "$std/dotenv/load.ts";
setCwd();

Deno.chdir("..");

// TODO: vendor renda files
await dev({
	actions: [],
});

generateTypes({
	include: [
		"scripts/",
		"gameServer/",
	],
	importMap: "importmap.json",
	excludeUrls: [
		"https://raw.githubusercontent.com/rendajs/Renda/78bf39b6095a75b182fc2afe76c747e93989d7a6/studio/src/styles/projectSelectorStyles.js",
		"https://raw.githubusercontent.com/rendajs/Renda/78bf39b6095a75b182fc2afe76c747e93989d7a6/studio/src/styles/studioStyles.js",
		"https://raw.githubusercontent.com/rendajs/Renda/78bf39b6095a75b182fc2afe76c747e93989d7a6/studio/src/styles/shadowStyles.js",
		"https://raw.githubusercontent.com/rendajs/Renda/78bf39b6095a75b182fc2afe76c747e93989d7a6/studio/deps/rollup-plugin-resolve-url-objects.js",
		"https://raw.githubusercontent.com/rendajs/Renda/78bf39b6095a75b182fc2afe76c747e93989d7a6/studio/deps/rollup.browser.js",
		"rollup",
	],
	logLevel: "WARNING",
});

if (!Deno.args.includes("--no-init")) {
	const gameServer = initGameServer({
		arenaWidth: 40,
		arenaHeight: 40,
	});

	const serverManager = initServerManager();

	/** Directories that should be served using serveDir() */
	const serveRootDirs = [
		"adminpanel",
		"shared",
	];

	Deno.serve({
		port: 8080,
	}, async (request, remoteAddr) => {
		const url = new URL(request.url);
		if (url.pathname == "/") {
			return new Response(
				`
				<!DOCTYPE html>
				<html>
					<head>
						<style>
							* {
								font-family: Arial, Helvetica, sans-serif;
							}
						</style>
					</head>
					<body>
						<h1>Local Splix server</h1>
						<p>Available endpoints:
							<ul>
								<li>/gameserver - The gameserver, <a href="https://splix.io/#ip=ws://localhost:8080/gameserver">click here to connect to it using a client</a></li>
								<li><a href="/adminpanel/">/adminpanel/</a> - Admin panel for server management.</li>
								<li>/servermanager/ - Hosts several endpoints for servermanagement.</li>
								<li><a href="/servermanager/gameservers">/servermanager/gameservers</a> - Endpoint which can be used by clients to list available servers.</li>
							</ul>
						</p>
					</body>
				</html>
			`,
				{
					headers: {
						"Content-Type": "text/html",
					},
				},
			);
		} else if (url.pathname == "/gameserver") {
			return gameServer.websocketManager.handleRequest(request, remoteAddr.remoteAddr);
		} else if (url.pathname.startsWith("/servermanager/")) {
			return serverManager.websocketManager.handleRequest(request, remoteAddr.remoteAddr);
		}

		for (const dir of serveRootDirs) {
			if (url.pathname.startsWith(`/${dir}/`)) {
				return await serveDir(request, {
					quiet: true,
					showDirListing: true,
				});
			}
		}
		return new Response("not found", { status: 404 });
	});
}

import { generateTypes } from "https://deno.land/x/deno_tsc_helper@v0.1.2/mod.js";
import { vendor } from "https://raw.githubusercontent.com/jespertheend/dev/9ae4c87bc54156c47d4f097a61615eaa2c716904/mod.js";
import { serveDir } from "$std/http/file_server.ts";
import { resolve } from "$std/path/mod.ts";
import { setCwd } from "chdir-anywhere";
import { init as initGameServer } from "../gameServer/src/mainInstance.js";
import { init as initServerManager } from "../serverManager/src/mainInstance.js";
import "$std/dotenv/load.ts";
import { INSECURE_LOCALHOST_SERVERMANAGER_TOKEN } from "../shared/config.js";
setCwd();

Deno.chdir("..");

vendor({
	entryPoints: [
		"https://raw.githubusercontent.com/rendajs/Renda/705c5a01bc4d3ca4a282fff1a7a8567d1be7ce04/mod.js",
	],
	outDir: "./deps",
});

generateTypes({
	include: [
		"scripts/",
		"gameServer/",
		"shared/",
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
	exactTypeModules: {
		"$rollup": "https://unpkg.com/rollup@3.5.0/dist/rollup.d.ts",
		"$rollup-plugin-alias": "https://unpkg.com/@rollup/plugin-alias@4.0.2/types/index.d.ts",
		"$terser": "https://unpkg.com/terser@5.16.0/tools/terser.d.ts",
	},
	logLevel: "WARNING",
});

if (!Deno.args.includes("--no-init")) {
	const gameServer = initGameServer({
		arenaWidth: 40,
		arenaHeight: 40,
	});

	const persistentStoragePath = resolve("serverManager/persistentStorage.json");
	const serverManager = initServerManager({
		persistentStoragePath,
		websocketAuthToken: INSECURE_LOCALHOST_SERVERMANAGER_TOKEN,
	});

	/** Directories that should be served using serveDir() */
	const serveRootDirs = [
		"adminpanel",
		"shared",
		"deps",
		"client",
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
								<li><a href="/client/">/client/</a> - The splix client.</li>
								<li><a href="/client/flags.html">/client/flags.html</a> - Client flags for debugging etc.</li>
								<li>/gameserver - The gameserver, <a href="/client/#ip=ws://localhost:8080/gameserver">click here to connect to it using a client</a></li>
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
		} else if (url.pathname.startsWith("/servermanagerToken")) {
			return new Response(INSECURE_LOCALHOST_SERVERMANAGER_TOKEN);
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

import { generateTypes } from "https://deno.land/x/deno_tsc_helper@v0.1.2/mod.js";
import { setCwd } from "chdir-anywhere";
import { init } from "../src/mainInstance.js";
setCwd();

Deno.chdir("..");

generateTypes({
	include: [
		"scripts/",
		"src/",
	],
	importMap: "importmap.json",
	excludeUrls: [
		"https://raw.githubusercontent.com/rendajs/Renda/c5fdd016b20f8fdcab4c30728672f26f1e8a4884/studio/src/styles/projectSelectorStyles.js",
		"https://raw.githubusercontent.com/rendajs/Renda/c5fdd016b20f8fdcab4c30728672f26f1e8a4884/studio/src/styles/studioStyles.js",
		"https://raw.githubusercontent.com/rendajs/Renda/c5fdd016b20f8fdcab4c30728672f26f1e8a4884/studio/src/styles/shadowStyles.js",
		"https://raw.githubusercontent.com/rendajs/Renda/c5fdd016b20f8fdcab4c30728672f26f1e8a4884/studio/deps/rollup-plugin-resolve-url-objects.js",
		"https://raw.githubusercontent.com/rendajs/Renda/c5fdd016b20f8fdcab4c30728672f26f1e8a4884/studio/deps/rollup.browser.js",
		"rollup",
	],
	logLevel: "WARNING",
});

init();

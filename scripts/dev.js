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
		"https://deno.land/x/renda@v0.1.0/studio/src/styles/projectSelectorStyles.js",
		"https://deno.land/x/renda@v0.1.0/studio/src/styles/studioStyles.js",
		"https://deno.land/x/renda@v0.1.0/studio/src/styles/shadowStyles.js",
		"https://deno.land/x/renda@v0.1.0/studio/deps/rollup-plugin-resolve-url-objects.js",
		"https://deno.land/x/renda@v0.1.0/studio/deps/rollup.browser.js",
		"rollup",
	],
	logLevel: "WARNING",
});

init();

import { generateTypes } from "https://deno.land/x/deno_tsc_helper@v0.1.2/mod.js";
import { setCwd } from "chdir-anywhere";
import { init } from "../gameServer/src/mainInstance.js";
setCwd();

Deno.chdir("..");

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
	init();
}

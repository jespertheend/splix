import { generateTypes } from "https://deno.land/x/deno_tsc_helper@v0.1.2/mod.js";
import { setCwd } from "https://deno.land/x/chdir_anywhere@v0.0.3/mod.js";
import { init } from "../src/mainInstance.js";
setCwd();

Deno.chdir("..");

generateTypes({
	include: [
		"scripts/",
		"src/",
	],
	excludeUrls: [
		"https://deno.land/x/deno_tsc_helper@v0.1.2/mod.js",
	],
	logLevel: "WARNING",
});

init();

import { rollup } from "$rollup";
import replace from "$rollup-plugin-replace";
import { terser } from "../shared/rollup-terser-plugin.js";
import { resolve } from "$std/path/mod.ts";
import { copy, ensureDir } from "$std/fs/mod.ts";
import * as streams from "$std/streams/mod.ts";
import * as path from "$std/path/mod.ts";
import * as fs from "$std/fs/mod.ts";
import { Tar } from "$std/archive/tar.ts";
import { setCwd } from "chdir-anywhere";
setCwd();

Deno.chdir("../client");

const versionArg = Deno.args[0] || "0.0.0";

const outDir = resolve("./out");
const distDir = resolve(outDir, "./dist");

try {
	await Deno.remove(outDir, { recursive: true });
} catch {
	// Already removed
}
await ensureDir(distDir);

const bundle = await rollup({
	input: [
		"src/main.js",
		"src/leaderboards.js",
	],
	onwarn: (message) => {
		if (message.code == "CIRCULAR_DEPENDENCY") return;
		console.error(message.message);
	},
	plugins: [
		replace({
			values: {
				IS_DEV_BUILD: JSON.stringify(false),
				CLIENT_VERSION: JSON.stringify(versionArg),
			},
			preventAssignment: true,
		}),
	],
});
const { output } = await bundle.write({
	dir: resolve(distDir, "bundle"),
	format: "esm",
	entryFileNames: "[name]-[hash].js",
	plugins: [
		terser({
			module: true,
		}),
	],
});

const originalBundleEntryPoint = path.resolve("src/main.js");
const leaderboardsBundleEntryPoint = path.resolve("src/leaderboards.js");

let mainEntryPoint = null;
let leaderboardsEntryPoint = null;
for (const chunk of output) {
	if (chunk.type == "chunk") {
		if (chunk.facadeModuleId == originalBundleEntryPoint) {
			mainEntryPoint = chunk.fileName;
		} else if (chunk.facadeModuleId == leaderboardsBundleEntryPoint) {
			leaderboardsEntryPoint = chunk.fileName;
		}
	}
}
if (!mainEntryPoint) {
	throw new Error("Assertion failed, unable to find main entry point in generated bundle.");
}
if (!leaderboardsEntryPoint) {
	throw new Error("Assertion failed, unable to find leaderboards entry point in generated bundle.");
}

let indexContent = await Deno.readTextFile("index.html");
indexContent = indexContent.replace("./src/main.js", "./bundle/" + mainEntryPoint);
indexContent = indexContent.replace("./static/style.css", "./static/style.css?" + Date.now());
await Deno.writeTextFile(resolve(distDir, "index.html"), indexContent);

let leaderboardsContent = await Deno.readTextFile("leaderboards.html");
leaderboardsContent = leaderboardsContent.replace("./src/leaderboards.js", "./bundle/" + leaderboardsEntryPoint);
leaderboardsContent = leaderboardsContent.replace(
	"./static/leaderboards.css",
	"./static/leaderboards.css?" + Date.now(),
);
await Deno.writeTextFile(resolve(distDir, "leaderboards.html"), leaderboardsContent);

await copy("about.html", resolve(distDir, "about.html"));
await copy("flags.html", resolve(distDir, "flags.html"));
await copy("privacy.html", resolve(distDir, "privacy.html"));
await copy("static", resolve(distDir, "static"));
await copy("json", resolve(distDir, "json")); // Legacy

// Archive all files
const tar = new Tar();
for await (const entry of fs.walk(distDir)) {
	if (entry.isFile) {
		const filenameInArchive = path.relative(distDir, entry.path);
		await tar.append(filenameInArchive, {
			filePath: resolve(distDir, entry.path),
		});
	}
}

const tarDestination = resolve("./out/client.tar");
const writer = await Deno.open(tarDestination, { write: true, create: true });
await streams.copy(tar.getReader(), writer);
writer.close();

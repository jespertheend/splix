import { rollup } from "$rollup";
import { terser } from "../shared/rollup-terser-plugin.js";
import alias from "$rollup-plugin-alias";
import * as path from "$std/path/mod.ts";
import * as fs from "$std/fs/mod.ts";
import { copy, ensureDir } from "$std/fs/mod.ts";
import * as streams from "$std/streams/mod.ts";
import { Tar } from "$std/archive/tar.ts";
import { setCwd } from "chdir-anywhere";
setCwd();

Deno.chdir("../adminPanel");

const outDir = path.resolve("./out");
const distDir = path.resolve(outDir, "./dist");

try {
	await Deno.remove(outDir, { recursive: true });
} catch {
	// Already removed
}
await ensureDir(distDir);

const bundle = await rollup({
	input: "src/main.js",
	onwarn: (message) => {
		if (message.code == "CIRCULAR_DEPENDENCY") return;
		console.error(message.message);
	},
	plugins: [
		alias({
			entries: [
				{
					find: "renda",
					replacement:
						"../deps/raw.githubusercontent.com/rendajs/Renda/705c5a01bc4d3ca4a282fff1a7a8567d1be7ce04/mod.js",
				},
			],
		}),
	],
});
const { output } = await bundle.write({
	dir: path.resolve(distDir, "bundle"),
	format: "esm",
	entryFileNames: "[name]-[hash].js",
	plugins: [
		terser(),
	],
});

const originalBundleEntryPoint = path.resolve("src/main.js");

let bundleEntryPoint = null;
for (const chunk of output) {
	if (chunk.type == "chunk") {
		if (chunk.facadeModuleId == originalBundleEntryPoint) {
			bundleEntryPoint = chunk.fileName;
		}
	}
}
if (!bundleEntryPoint) {
	throw new Error("Assertion failed, unable to find main entry point in generated bundle.");
}

let indexContent = await Deno.readTextFile("index.html");
indexContent = indexContent.replace("./src/main.js", "./bundle/" + bundleEntryPoint);
await Deno.writeTextFile(path.resolve(distDir, "index.html"), indexContent);
await copy("style.css", path.resolve(distDir, "style.css"));

// Archive all files
const tar = new Tar();
for await (const entry of fs.walk(distDir)) {
	if (entry.isFile) {
		const filenameInArchive = path.relative(distDir, entry.path);
		await tar.append(filenameInArchive, {
			filePath: path.resolve(distDir, entry.path),
		});
	}
}

const tarDestination = path.resolve("./out/adminPanel.tar");
const writer = await Deno.open(tarDestination, { write: true, create: true });
await streams.copy(tar.getReader(), writer);
writer.close();

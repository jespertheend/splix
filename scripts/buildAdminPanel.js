import { rollup } from "$rollup";
import { terser } from "../shared/rollup-terser-plugin.js";
import alias from "$rollup-plugin-alias";
import { resolve } from "$std/path/mod.ts";
import { copy, ensureDir } from "$std/fs/mod.ts";
import * as streams from "$std/streams/mod.ts";
import { Tar } from "$std/archive/tar.ts";
import { setCwd } from "chdir-anywhere";
setCwd();

Deno.chdir("../adminPanel");

const outDir = resolve("./out");
const distDir = resolve(outDir, "./dist");

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
await bundle.write({
	file: resolve(distDir, "main.js"),
	format: "esm",
	plugins: [
		terser(),
	],
});

let indexContent = await Deno.readTextFile("index.html");
indexContent = indexContent.replace("src/main.js", "main.js");
await Deno.writeTextFile(resolve(distDir, "index.html"), indexContent);
await copy("style.css", resolve(distDir, "style.css"));

// Archive all files

const tar = new Tar();
for await (const entry of Deno.readDir(distDir)) {
	if (entry.isFile) {
		await tar.append(entry.name, {
			filePath: resolve(distDir, entry.name),
		});
	}
}

const tarDestination = resolve("./out/adminPanel.tar");
const writer = await Deno.open(tarDestination, { write: true, create: true });
await streams.copy(tar.getReader(), writer);
writer.close();

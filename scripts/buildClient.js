import { rollup } from "$rollup";
import { terser } from "../shared/rollup-terser-plugin.js";
import { resolve } from "$std/path/mod.ts";
import { copy, ensureDir } from "$std/fs/mod.ts";
import * as streams from "$std/streams/mod.ts";
import { Tar } from "$std/archive/tar.ts";
import { setCwd } from "chdir-anywhere";
setCwd();

Deno.chdir("../client");

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
await copy("about.html", resolve(distDir, "about.html"));
await copy("flags.html", resolve(distDir, "flags.html"));
await copy("privacy.html", resolve(distDir, "privacy.html"));
await copy("static", resolve(distDir, "static"));
await copy("json", resolve(distDir, "json")); // Legacy

// Archive all files

const tar = new Tar();
for await (const entry of Deno.readDir(distDir)) {
	if (entry.isFile) {
		await tar.append(entry.name, {
			filePath: resolve(distDir, entry.name),
		});
	}
}

const tarDestination = resolve("./out/client.tar");
const writer = await Deno.open(tarDestination, { write: true, create: true });
await streams.copy(tar.getReader(), writer);
writer.close();

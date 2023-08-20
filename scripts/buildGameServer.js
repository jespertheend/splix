import { parse as parseArgs } from "$std/flags/mod.ts";
import { Tar } from "$std/archive/tar.ts";
import * as path from "$std/path/mod.ts";
import * as streams from "$std/streams/mod.ts";
import { setCwd } from "chdir-anywhere";
setCwd();
Deno.chdir("..");

const args = parseArgs(Deno.args);

const outDir = path.resolve("gameServer/out");

/** @type {Object.<string, string>} */
const targetsMap = {
	"linux": "x86_64-unknown-linux-gnu",
	"windows": "x86_64-pc-windows-msvc",
	"macos-intel": "x86_64-apple-darwin",
	"macos": "aarch64-apple-darwin",
};

const validTargets = Object.keys(targetsMap);
let targets = [...validTargets];
const targetArg = args.target;
if (targetArg) {
	const target = targetsMap[targetArg];
	if (!target) {
		console.error(`'${targetArg}' is not a valid target, valid targets are ${validTargets.join(", ")}`);
		Deno.exit(1);
	}
	targets = [targetArg];
}

for (const target of targets) {
	console.log(`Building ${target}...`);
	const denoTarget = targetsMap[target];
	const command = new Deno.Command("deno", {
		args: [
			"compile",
			"--allow-net",
			"--allow-read",
			"-o",
			path.resolve(outDir, target, "splixGameServer"),
			"--target",
			denoTarget,
			"--include",
			"gameServer/src/gameplay/arenaWorker/mod.js",
			"gameServer/src/mainInstance.js",
		],
	});
	const child = command.spawn();
	const status = await child.status;
	if (!status.success) {
		throw new Error("deno compile exited with a non zero status code");
	}
}

if (args.compress) {
	const collectedTars = [];
	for (const target of targets) {
		console.log("Compressing " + target);
		const tar = new Tar();
		const dir = path.resolve(outDir, target);
		for await (const entry of Deno.readDir(dir)) {
			if (entry.isFile) {
				await tar.append(entry.name, {
					filePath: path.resolve(dir, entry.name),
				});
			}
		}
		collectedTars.push({ target, tar });
	}

	for (const { target, tar } of collectedTars) {
		const tarDestination = path.resolve(outDir, "splix_gameserver_" + target + ".tar");
		const writer = await Deno.open(tarDestination, { write: true, create: true });
		await streams.copy(tar.getReader(), writer);
		writer.close();
		await Deno.remove(path.resolve(outDir, target), { recursive: true });
	}
}

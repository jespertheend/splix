import { parse as parseArgs } from "$std/flags/mod.ts";
import { Tar } from "$std/archive/tar.ts";
import * as path from "$std/path/mod.ts";
import * as streams from "$std/streams/mod.ts";

/**
 * Builds a binary executable using the arguments provided via the command line.
 * @param {Object} options
 * @param {string} options.outputDir The directory where the files will be placed.
 * @param {string} options.outputFileName The name of the created executable.
 * Each file will be placed in a directory with the name of its target platform.
 * Archives will be named ${outputFileName}_${target}.tar
 * @param {string} options.entryPoint Path to the main entry point of the application.
 * @param {string[]} [options.permissionFlags] Extra arguments to the `deno compile` command.
 * @param {string[]} [options.include] Paths to files to include in the executable such as workers or dynamic imports.
 */
export async function buildExecutable({
	outputDir,
	outputFileName,
	entryPoint,
	permissionFlags,
	include,
}) {
	const args = parseArgs(Deno.args);

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

	const includeArgs = [];
	if (include) {
		for (const includePath of include) {
			includeArgs.push("--include");
			includeArgs.push(includePath);
		}
	}

	permissionFlags = permissionFlags || [];

	for (const target of targets) {
		console.log(`Building ${target}...`);
		const denoTarget = targetsMap[target];
		const command = new Deno.Command("deno", {
			args: [
				"compile",
				...permissionFlags,
				"-o",
				path.resolve(outputDir, target, outputFileName),
				"--target",
				denoTarget,
				...includeArgs,
				entryPoint,
			],
		});
		const child = command.spawn();
		const status = await child.status;
		if (!status.success) {
			throw new Error("deno compile exited with a non zero status code");
		}
	}

	if (args.archive) {
		const collectedTars = [];
		for (const target of targets) {
			console.log("Compressing " + target);
			const tar = new Tar();
			const dir = path.resolve(outputDir, target);
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
			const tarDestination = path.resolve(outputDir, outputFileName + "_" + target + ".tar");
			const writer = await Deno.open(tarDestination, { write: true, create: true });
			await streams.copy(tar.getReader(), writer);
			writer.close();
			await Deno.remove(path.resolve(outputDir, target), { recursive: true });
		}
	}
}

#!/usr/bin/env -S deno run --allow-read --allow-write --allow-net

/**
 * @fileoverview This script downloads a release asset from the GitHub repository
 * and unarchives the tar file.
 */

import { Untar } from "https://deno.land/std@0.204.0/archive/mod.ts";
import * as fs from "https://deno.land/std@0.204.0/fs/mod.ts";
import * as path from "https://deno.land/std@0.204.0/path/mod.ts";
import * as streams from "https://deno.land/std@0.204.0/streams/mod.ts";
import * as flags from "https://deno.land/std@0.204.0/flags/mod.ts";
import { readerFromStreamReader } from "https://deno.land/std@0.204.0/streams/mod.ts";

const parsedFlags = flags.parse(Deno.args, {
	boolean: ["s", "single"],
	string: ["a", "asset", "o", "out"],
});
const assetName = parsedFlags.asset || parsedFlags.a;
if (!assetName) throw new Error("No asset name was provided");
const outPath = parsedFlags.out || parsedFlags.o;
if (!outPath) throw new Error("No out dir/file was provided");
const singleFile = parsedFlags.single || parsedFlags.s;

console.log("Getting latest release data from GitHub.");
const releaseResponse = await fetch("https://api.github.com/repos/jespertheend/splix/releases/latest");
const release = await releaseResponse.json();

/**
 * @param {string} assetName
 */
function findAsset(assetName) {
	for (const asset of release.assets) {
		if (asset.name == assetName) {
			return asset;
		}
	}
	throw new Error(`No asset with name "${assetName}" was found in the latest release.`);
}

const asset = findAsset(assetName);

console.log("Downloading asset...");
const assetResponse = await fetch(asset.url, {
	headers: {
		Accept: "application/octet-stream",
	},
});
if (!assetResponse.body) {
	throw new Error("Asset response doesn't have a body");
}
const reader = assetResponse.body.getReader();

const untar = new Untar(readerFromStreamReader(reader));

/**
 * @param {string} dir
 */
async function tryRemoveRecursive(dir) {
	try {
		await Deno.remove(dir, { recursive: true });
	} catch (e) {
		if (!(e instanceof Deno.errors.NotFound)) {
			throw e;
		}
	}
}

const tempDir = await Deno.makeTempDir({ prefix: "splixrelease" });
console.log("Writing to temp dir: " + tempDir);
try {
	let entryCount = 0;
	for await (const entry of untar) {
		if (entry.type != "file") continue;

		entryCount++;
		if (singleFile && entryCount >= 2) {
			throw new Error("Only a single file was expected but the archive contained multiple");
		}
		const outFile = path.resolve(tempDir, singleFile ? "file" : entry.fileName);
		await fs.ensureFile(outFile);
		const file = await Deno.open(outFile, { write: true });
		await streams.copy(entry, file);
	}

	console.log("Removing old version");
	await tryRemoveRecursive(outPath);
	console.log("Moving downloaded asset to " + outPath);
	if (singleFile) {
		await Deno.rename(path.resolve(tempDir, "file"), outPath);
	} else {
		await Deno.rename(tempDir, outPath);
	}
} finally {
	console.log("Removing temp dir");
	await tryRemoveRecursive(tempDir);
}

export {};

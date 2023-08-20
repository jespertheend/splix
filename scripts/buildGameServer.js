import { setCwd } from "chdir-anywhere";
setCwd();
Deno.chdir("..");

/** @type {Object.<string, string>} */
const targets = {
	"linux": "x86_64-unknown-linux-gnu",
	"windows": "x86_64-pc-windows-msvc",
	"macos-intel": "x86_64-apple-darwin",
	"macos": "aarch64-apple-darwin",
};

const validTargets = Object.keys(targets);
const targetArg = Deno.args[0];
if (!targetArg) {
	console.error(`No valid target provided, valid targets are ${validTargets.join(", ")}`);
	Deno.exit(1);
}
const target = targets[targetArg];
if (!target) {
	console.error(`'${targetArg}' is not a valid target, valid targets are ${validTargets.join(", ")}`);
	Deno.exit(1);
}

const command = new Deno.Command("deno", {
	args: [
		"compile",
		"--allow-net",
		"--allow-read",
		"-o",
		`gameServer/out/gameserver-${targetArg}/splixGameServer`,
		"--target",
		target,
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

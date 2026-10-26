#!/usr/bin/env -S deno run -A --no-lock

import { buildClient } from "./buildClient.js";
import { setCwd } from "chdir-anywhere";
import { uploadPelicanPartyGame } from "https://js.pelicanparty.games/upload/v4.js";

const version = Deno.args[0] || "0.0.0";

await buildClient({
	version,
});

setCwd();
Deno.chdir("../");
await uploadPelicanPartyGame({
	buildPath: "./client/out/dist/",
	versionName: version,
});

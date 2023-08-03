/**
 * @typedef AddrWithProtocol
 * @property {string | undefined} [protocol]
 * @property {Deno.Addr} addr
 */

/**
 * @typedef AnnounceOptions
 * @property {string} [titleText]
 */

/**
 * Logs a list of addresses to the console.
 * Useful when calling `new Server` (from std/http) or `Deno.listen()`
 * @param {AddrWithProtocol[]} addrs
 */
export function announceAddrs(addrs, {
	titleText = "Listening on:",
} = {}) {
	const listenUrls = [];
	for (const { protocol, addr } of addrs) {
		if ("hostname" in addr) {
			let hostname = addr.hostname;
			if (hostname == "0.0.0.0") hostname = "localhost";
			listenUrls.push(`- ${protocol}://${hostname}:${addr.port}`);
		}
	}
	console.log(titleText + "\n" + listenUrls.join("\n"));
}

export class AddrAnnouncer {
	/**
	 * @param {AnnounceOptions} announceOptions
	 */
	constructor(announceOptions = {}) {
		this.announceOptions = announceOptions;
		/** @type {AddrWithProtocol[]} */
		this.addrs = [];
	}

	/**
	 * @param {Deno.Addr[]} addrs
	 * @param {string} [protocol]
	 */
	addAddrs(addrs, protocol) {
		for (const addr of addrs) {
			this.addrs.push({
				addr,
				protocol,
			});
		}
	}

	announce() {
		announceAddrs(this.addrs, this.announceOptions);
	}
}

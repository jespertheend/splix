/**
 * Basic wrapper around the Deno apis used for hosting a websocket.
 * This takes care of all of the error handling in case of network errors.
 */
export class WebSocketHoster {
	#onConnectionCb;
	#overrideRequestHandler;

	/**
	 * @param {(socket: WebSocket, ip: string) => void} onConnection A callback that fires when a new connection
	 * is opened. The websocket passed as argument is guaranteed to be open.
	 * @param {Object} options
	 * @param {(req: Request) => Promise<Response?>} [options.overrideRequestHandler] A callback that allows you to override requests. When the callback
	 * returns a value it will be used as response instead of creating a new connection to the websocket.
	 * For more complex situations you should probably use "std/http/mod.ts" instead of this.
	 */
	constructor(onConnection, { overrideRequestHandler } = {}) {
		this.#onConnectionCb = onConnection;
		this.#overrideRequestHandler = overrideRequestHandler;
	}

	/**
	 * @param {number} port
	 * @param {string} hostname
	 */
	async startServer(port, hostname) {
		Deno.serve({
			port,
			hostname,
		}, (request, info) => {
			return this.handleRequest(request, info);
		});
	}

	/**
	 * @param {Request} request
	 * @param {Deno.ServeHandlerInfo<Deno.NetAddr>} info
	 */
	async handleRequest(request, { remoteAddr }) {
		if (this.#overrideRequestHandler) {
			const response = await this.#overrideRequestHandler(request);
			if (response) return response;
		}
		if (request.method != "GET") {
			return new Response("Endpoint is a websocket", {
				status: 405,
			});
		}
		if (request.headers.get("upgrade") != "websocket") {
			return new Response("Endpoint is a websocket", {
				status: 426,
				headers: {
					upgrade: "websocket",
				},
			});
		}
		let ip = "";
		const realIp = request.headers.get("X-Real-IP");
		if (realIp) {
			ip = realIp;
		} else if (remoteAddr.transport == "tcp") {
			ip = remoteAddr.hostname;
		}
		const { socket, response } = Deno.upgradeWebSocket(request);
		socket.addEventListener("open", (e) => {
			this.#onConnectionCb(socket, ip);
		});
		return response;
	}
}

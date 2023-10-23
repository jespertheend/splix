import { Timeout } from "../../../shared/Timeout.js";
import { announceAddrs } from "./announceAddrs.js";

const INITIAL_ACCEPT_BACKOFF_DELAY = 5;
const MAX_ACCEPT_BACKOFF_DELAY = 1000;

let didRegisterUnhandledRejection = false;
/**
 * Registers an event listener for the "unhandledrejection" event.
 * If an unhandled rejection appears that is known to be commonly triggered
 * by websocket connections, the event is `preventDefault`ed in order to not
 * shut the server down.
 */
export function registerUnhandledRejection() {
	if (didRegisterUnhandledRejection) return;
	globalThis.addEventListener("unhandledrejection", (e) => {
		let suppressError = false;
		if (e.reason instanceof Error) {
			if (e.reason.message.includes("Broken pipe")) {
				suppressError = true;
			}
			if (e.reason.message.includes("Connection reset by peer")) {
				suppressError = true;
			}
		}

		if (!suppressError) {
			console.error("catched in unhandledrejection", e.reason);
			if (e.reason instanceof Error) {
				console.error(e.reason.stack);
			}
		}
		e.preventDefault();
	});
	didRegisterUnhandledRejection = true;
}

/**
 * Basic wrapper around the Deno apis used for hosting a websocket.
 * This takes care of all of the error handling in case of network errors.
 */
export class WebSocketHoster {
	#onConnectionCb;
	#overrideRequestHandler;
	#acceptBackoffDelay = INITIAL_ACCEPT_BACKOFF_DELAY;

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
		const listener = Deno.listen({ port, hostname });
		announceAddrs([{ protocol: "ws", addr: listener.addr }]);
		registerUnhandledRejection();
		while (true) {
			let conn;
			try {
				conn = await listener.accept();
			} catch (e) {
				if (
					// listener closed
					e instanceof Deno.errors.BadResource ||
					// TLS handshake errors
					e instanceof Deno.errors.InvalidData ||
					e instanceof Deno.errors.UnexpectedEof ||
					e instanceof Deno.errors.ConnectionReset ||
					e instanceof Deno.errors.NotConnected
				) {
					console.log("catched in startServer:", e);
					this.#acceptBackoffDelay *= 2;
					this.#acceptBackoffDelay = Math.min(
						this.#acceptBackoffDelay,
						MAX_ACCEPT_BACKOFF_DELAY,
					);
					await Timeout.promise(this.#acceptBackoffDelay);
					continue;
				}

				throw e;
			}

			this.#acceptBackoffDelay = INITIAL_ACCEPT_BACKOFF_DELAY;

			let httpConn;
			try {
				httpConn = Deno.serveHttp(conn);
			} catch {
				// Connection has been closed
				continue;
			}
			this.#handleHttp(httpConn, conn.remoteAddr);
		}
	}

	/**
	 * @param {Deno.HttpConn} httpConn
	 * @param {Deno.Addr} remoteAddr
	 */
	async #handleHttp(httpConn, remoteAddr) {
		while (true) {
			let requestEvent;
			try {
				requestEvent = await httpConn.nextRequest();
			} catch (e) {
				let suppressError = false;
				if (
					e instanceof Deno.errors.Http &&
					e.message == "invalid HTTP method parsed"
				) {
					suppressError = true;
				}
				// For now we will only show a message rather than throwing the error
				// We can remove this once we are a little more certain that all possible
				// errors are handled.
				if (!suppressError) {
					console.error("catched in handleHttp():", e);
				}
				break;
			}

			if (requestEvent == null) {
				// connection has been closed
				break;
			}

			let response;
			try {
				response = await this.handleRequest(requestEvent.request, remoteAddr);
			} catch (e) {
				console.error("catched in handleRequest():", e);
			}
			if (!response) {
				response = new Response("Internal server error", {
					status: 500,
				});
			}
			try {
				await requestEvent.respondWith(response);
			} catch (e) {
				console.error("catched in respondWith:", e);
				break;
			}
		}
		try {
			httpConn.close();
		} catch {
			// Already closed
		}
	}

	/**
	 * @param {Request} request
	 * @param {Deno.Addr} remoteAddr
	 */
	async handleRequest(request, remoteAddr) {
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

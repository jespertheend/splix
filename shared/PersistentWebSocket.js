/**
 * If this returns false, the connection will not be attempted, but rather it
 * will retry using the same retry system that is used when the connection fails.
 * @typedef {() => boolean} PersistentWebsocketAllowConnectHook
 */

import { Timeout } from "./Timeout.js";

/**
 * A websocket that automatically keeps reconnecting when the connection drops.
 * @template TReceiveMessage
 */
export class PersistentWebSocket {
	/**
	 * @param {string} url
	 * @param {Object} options
	 * @param {number} [options.retryInterval]
	 * @param {number} [options.noMessageTimeout] How long it will take in ms before a new connection is attempted when no
	 * messages have been received for this long.
	 * @param {number} [options.pingInterval] How long after not having received a message a ping message should be sent.
	 * Set this to a value lower than `noMessageTimeout` to ensure the connection stays open.
	 * @param {any} [options.pingMessageData] The message to send when pinging.
	 * @param {PersistentWebsocketAllowConnectHook | PersistentWebsocketAllowConnectHook[]} [options.allowConnectHook]
	 * @param {number} [options.verifyConnectionInterval] Interval at which a new websocket connection is opened just
	 * to check if connecting still works. Once this connection is made, a single ping is sent, and once the pong
	 * is received the connection is closed immediately. If a connection can't be established, or no pong is received.
	 * The original connection will be closed as well. Set to 0 to disable this check.
	 */
	constructor(url, {
		retryInterval = 3000,
		noMessageTimeout = 0,
		pingInterval = 0,
		pingMessageData = { type: "ping" },
		allowConnectHook = [],
		verifyConnectionInterval = 0,
	} = {}) {
		this.url = url;
		this.retryInterval = retryInterval;

		this.ws = null;
		/** @type {Set<(data: TReceiveMessage) => void>} */
		this.onMessageCbs = new Set();
		/** @type {Set<() => void>} */
		this.onOpenCbs = new Set();
		/** @type {Set<() => void>} */
		this.onCloseCbs = new Set();
		/** @type {Set<(attempts: number) => void>} */
		this.onAttemptFailCbs = new Set();
		/** @type {Set<PersistentWebsocketAllowConnectHook>} */
		this.allowConnectHooks = new Set();
		this.permanentlyClosed = false;
		/** Used to ensure onClose and onOpen are only fired once */
		this._cbsConnectedState = false;
		this._attempts = 0;

		this.noMessageTimeout = noMessageTimeout;
		this.noMessageTimeoutInstance = null;
		if (noMessageTimeout > 0) {
			this.noMessageTimeoutInstance = new Timeout(() => {
				if (this.ws && this.connected) this.ws.close();
			}, noMessageTimeout);
		}
		this.pingTimeout = null;
		this.pingMessageData = pingMessageData;
		if (pingInterval > 0) {
			this.pingTimeout = new Timeout(() => {
				if (this.connected) {
					this.send(pingMessageData);
				}
			}, pingInterval);
		}

		this.verifyConnectionIntervalId = -1;
		if (verifyConnectionInterval > 0) {
			this.verifyConnectionIntervalId = setInterval(() => {
				this._verifyConnection();
			}, verifyConnectionInterval);
		}

		if (Array.isArray(allowConnectHook)) {
			allowConnectHook.forEach((hook) => this.addAllowConnectHook(hook));
		} else {
			this.addAllowConnectHook(allowConnectHook);
		}

		this.connectMultipleAttempts();
	}

	get connected() {
		return !!this.ws && this.ws.readyState == WebSocket.OPEN;
	}

	get attempts() {
		return this._attempts;
	}

	async connectMultipleAttempts() {
		if (this.connected || this.permanentlyClosed) return;

		this._attempts = 0;
		while (true) {
			if (this._attempts > 0) {
				await Timeout.promise(this.retryInterval);
			}
			this._attempts++;
			const success = await this.connectSingleAttempt();
			if (success) break;

			if (this.permanentlyClosed) return;
		}
	}

	/**
	 * Runs all allow connect hooks and checks if a connection is currently allowed.
	 */
	getAllowConnect() {
		for (const hook of this.allowConnectHooks) {
			const result = hook();
			if (result == false) return false;
		}
		return true;
	}

	/**
	 * @returns {Promise<boolean>} True if the connection was successful.
	 */
	async connectSingleAttempt() {
		if (this.permanentlyClosed) return false;
		if (!this.getAllowConnect()) {
			return false;
		}

		const ws = new WebSocket(this.url);
		this.ws = ws;
		ws.onerror = (e) => {
			if (e instanceof ErrorEvent) {
				console.error(`PersistentWebSocketError for "${this.url}":`, e.message);
			} else {
				console.error(e);
			}
		};
		ws.onmessage = (e) => {
			if (ws != this.ws) return;
			/** @type {TReceiveMessage} */
			const data = JSON.parse(e.data);
			this.onMessageCbs.forEach((cb) => cb(data));
			if (this.noMessageTimeoutInstance) this.noMessageTimeoutInstance.start();
			if (this.pingTimeout) this.pingTimeout.start();
		};
		return await new Promise((r) => {
			let hasConnectedOnce = false;
			ws.onopen = () => {
				if (this.ws != ws) return;
				if (!this._cbsConnectedState) {
					this._cbsConnectedState = true;
					this.onOpenCbs.forEach((cb) => cb());
				}
				if (this.noMessageTimeoutInstance) this.noMessageTimeoutInstance.start();
				if (this.pingTimeout) this.pingTimeout.start();
				hasConnectedOnce = true;
				r(true);
			};
			ws.onclose = (e) => {
				if (this.ws != ws) return;
				if (this._cbsConnectedState) {
					this._cbsConnectedState = false;
					this.onCloseCbs.forEach((cb) => cb());
				}
				this.onAttemptFailCbs.forEach((cb) => cb(this.attempts));
				if (this.noMessageTimeoutInstance) this.noMessageTimeoutInstance.stop();
				if (this.pingTimeout) this.pingTimeout.stop();
				r(false);
				if (hasConnectedOnce) {
					this.connectMultipleAttempts();
				}
			};
		});
	}

	async _verifyConnection() {
		if (this.permanentlyClosed) return false;
		if (!this.getAllowConnect()) {
			return false;
		}

		const ws = new WebSocket(this.url);
		const success = await new Promise((/** @type {(result: boolean) => void} */ resolve, reject) => {
			ws.onopen = () => {
				ws.send(JSON.stringify(this.pingMessageData));
			};
			ws.onmessage = () => {
				resolve(true);
			};
			if (this.noMessageTimeout == 0) {
				throw new Error("noMessageTimeout needs to be specified when verifyConnectionInterval is set");
			}
			setTimeout(() => {
				resolve(false);
			}, this.noMessageTimeout);
		});
		ws.close();
		if (!success) {
			if (this.ws) this.ws.close();
		}
	}

	/**
	 * @param {(data: TReceiveMessage) => void} cb
	 */
	onMessage(cb) {
		this.onMessageCbs.add(cb);
	}

	/**
	 * @param {() => void} cb
	 */
	onOpen(cb) {
		this.onOpenCbs.add(cb);
	}

	/**
	 * @param {() => void} cb
	 */
	onClose(cb) {
		this.onCloseCbs.add(cb);
	}

	/**
	 * @param {(attempts: number) => void} cb
	 */
	onAttemptFail(cb) {
		this.onAttemptFailCbs.add(cb);
	}

	/**
	 * Permanently closes the websocket if it's not already closed.
	 */
	close() {
		this.permanentlyClosed = true;
		if (this.verifyConnectionIntervalId) {
			clearInterval(this.verifyConnectionIntervalId);
		}
		if (this.connected && this.ws) {
			this.ws.close();
		}
		this.onMessageCbs.clear();
		this.onOpenCbs.clear();
		this.onCloseCbs.clear();
		this.allowConnectHooks.clear();
	}

	/**
	 * @param {PersistentWebsocketAllowConnectHook} cb
	 */
	addAllowConnectHook(cb) {
		this.allowConnectHooks.add(cb);
	}

	/**
	 * @param {any} data
	 */
	send(data) {
		if (!this.connected || !this.ws) {
			throw new Error("Couldn't send message, WebSocket not connected");
		}
		this.ws.send(JSON.stringify(data));
	}
}

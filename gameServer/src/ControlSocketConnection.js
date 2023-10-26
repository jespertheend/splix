import { TypedMessenger } from "renda";
import { WebSocketConnection } from "./WebSocketConnection.js";

function createResponseHandlers() {
	return {};
}

/** @typedef {ReturnType<typeof createResponseHandlers>} ControlSocketResponseHandlers */

export class ControlSocketConnection {
	/** @type {TypedMessenger<ControlSocketResponseHandlers, import("../../serverManager/src/GameServer.js").ServerManagerResponseHandlers>} */
	#messenger = new TypedMessenger();

	get messenger() {
		return this.#messenger;
	}

	/**
	 * @param {WebSocketConnection} connection
	 */
	constructor(connection) {
		this.#messenger.setSendHandler((data) => {
			connection.send(JSON.stringify(data.sendData));
		});
		this.#messenger.setResponseHandlers(createResponseHandlers());
	}

	/**
	 * @param {import("renda").TypedMessengerMessageSendData<ControlSocketResponseHandlers, import("../../serverManager/src/GameServer.js").ServerManagerResponseHandlers>} data
	 */
	onMessage(data) {
		this.#messenger.handleReceivedMessage(data);
	}
}

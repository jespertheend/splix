export class PersistentStorage {
	#filePath;
	/** @type {Object.<string, unknown>} */
	#storageData = {};

	/**
	 * @param {string?} filePath
	 */
	constructor(filePath) {
		this.#filePath = filePath;

		this.#load();
	}

	#load() {
		if (!this.#filePath) return;

		let contents;
		try {
			contents = Deno.readTextFileSync(this.#filePath);
		} catch {
			console.warn(`Failed to read persistent storage at ${this.#filePath}, a new file will be created.`);
			this.#save();
			return;
		}

		this.#storageData = JSON.parse(contents) || {};
	}

	async #save() {
		if (!this.#filePath) return;

		const contents = JSON.stringify(this.#storageData);
		try {
			await Deno.writeTextFile(this.#filePath, contents);
		} catch {
			console.warn(`Failed to write persistent storage to ${this.#filePath}`);
		}
	}

	/**
	 * @param {string} key
	 */
	get(key) {
		return this.#storageData[key];
	}

	/**
	 * @param {string} key
	 * @param {unknown} value
	 */
	set(key, value) {
		this.#storageData[key] = value;
		this.#save();
	}
}
